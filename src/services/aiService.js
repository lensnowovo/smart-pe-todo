import { getActiveProvider } from './configStore'

const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1'

const SYSTEM_PROMPT = `你是专注于私募股权基金运营（PE Ops）的助理。请从用户输入中提取结构化任务信息，并只输出 JSON。\n\n如果输入包含多个批次/清单/多段任务，请返回 tasks 数组：\n{ "tasks": [ { ...任务字段... } ] }\n否则返回单个任务对象。\n\n任务字段要求：\n- title: 简洁的动作+对象\n- funds: 关联基金名称数组，如 ["Fund II"]，无法确定则 []\n- lp: 关联 LP 名称数组，如 ["Alpha LP"]，没有则 []\n- portfolio: 关联项目名称数组，如 ["Project A"]，没有则 []\n- deadline: 严格返回 YYYY-MM-DD 格式，若无法确定则返回 null\n- priority: High / Medium / Low\n- subtasks: 3-5 个具体子任务数组，若无则返回 []\n- status: active / blocked（无法判断则返回 active）\n- waitingOn: 等待对象，例如 "Custodian" / "LP"，没有则 ""\n- followUpDate: 跟进日期，YYYY-MM-DD 或 null\n- ambiguity: 当 LP/项目对应多个基金时，返回候选基金列表\n  例如 { "fundCandidates": ["Fund I", "Fund III"] }\n\n注意：\n- 需要理解自然语言日期（如“下周三”、“本周五”、“明天”），并换算成具体日期。\n- 只输出 JSON，不要额外解释。\n\n示例输入：提醒我下周三要把 Fund II 的季报发给投资人。\n期望输出：{\n  "title": "发送 Fund II 季报",\n  "funds": ["Fund II"],\n  "lp": ["投资人"],\n  "portfolio": [],\n  "deadline": "2026-02-12",\n  "priority": "High",\n  "subtasks": ["核对财务数据", "更新 LPA 模版", "生成 PDF", "发送邮件"],\n  "ambiguity": {"fundCandidates": []}\n}`

const buildContextSummary = (context) => {
  if (!context?.funds?.length) return ''
  const summary = context.funds.map((fund) => ({
    fullName: fund.fullName,
    shortName: fund.shortName,
    aliases: fund.aliases || [],
    portfolio: fund.portfolio || [],
    lps: fund.lps || [],
  }))
  return JSON.stringify(summary)
}

const requestChatCompletion = async ({ model, messages, provider }) => {
  const activeProvider = provider || (await getActiveProvider())
  const apiKey = activeProvider?.apiKey
  if (!apiKey) {
    throw new Error('Missing API Key')
  }

  const baseUrl = activeProvider?.baseUrl || DEFAULT_BASE_URL
  const resolvedModel = model || activeProvider?.model || 'deepseek-chat'

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: resolvedModel,
      temperature: 0.2,
      messages,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`AI request failed: ${response.status} ${text}`)
  }

  return response.json()
}

const extractJson = (text) => {
  if (!text) return null
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  const slice = text.slice(start, end + 1)
  return JSON.parse(slice)
}

export const analyzeTaskInput = async (userInput, context) => {
  const contextSummary = buildContextSummary(context)
  const systemContent = contextSummary
    ? `${SYSTEM_PROMPT}\n\n背景信息(JSON)：${contextSummary}`
    : SYSTEM_PROMPT

  const data = await requestChatCompletion({
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userInput },
    ],
  })
  const content = data?.choices?.[0]?.message?.content
  const parsed = typeof content === 'string' ? extractJson(content) : content

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response parsing failed')
  }

  return parsed
}

export const generateReportSummary = async ({ prompt, systemPrompt, model, provider }) => {
  const data = await requestChatCompletion({
    model,
    provider,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
  })
  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('AI report generation failed')
  }
  return String(content).trim()
}
