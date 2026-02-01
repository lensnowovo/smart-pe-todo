const STORAGE_KEY = 'pe-fund-ops.config'

const getDefaultProviders = () => {
  const deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY || ''
  const deepseekModel = import.meta.env.VITE_DEEPSEEK_MODEL || 'deepseek-chat'
  const deepseekBase = import.meta.env.VITE_DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
  return [
    {
      id: 'deepseek',
      name: 'DeepSeek',
      baseUrl: deepseekBase,
      apiKey: deepseekKey,
      model: deepseekModel,
    },
    {
      id: 'openai',
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
    },
    {
      id: 'glm',
      name: 'GLM',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      apiKey: '',
      model: 'glm-4',
    },
    {
      id: 'kimi',
      name: 'Kimi',
      baseUrl: 'https://api.moonshot.cn/v1',
      apiKey: '',
      model: 'moonshot-v1-8k',
    },
  ]
}

const mergeConfig = (stored) => {
  const defaults = getDefaultProviders()
  const providers = stored?.providers?.length
    ? stored.providers.map((item) => ({
        ...defaults.find((provider) => provider.id === item.id),
        ...item,
      }))
    : defaults
  return {
    activeProviderId: stored?.activeProviderId || providers[0]?.id || 'deepseek',
    providers,
  }
}

export const loadConfig = async () => {
  if (typeof window !== 'undefined' && window.electronAPI?.getConfig) {
    const stored = await window.electronAPI.getConfig()
    return mergeConfig(stored)
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const stored = raw ? JSON.parse(raw) : null
    return mergeConfig(stored)
  } catch {
    return mergeConfig(null)
  }
}

export const saveConfig = async (config) => {
  if (typeof window !== 'undefined' && window.electronAPI?.setConfig) {
    await window.electronAPI.setConfig(config)
    window.dispatchEvent(new CustomEvent('config:updated', { detail: config }))
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('config:updated', { detail: config }))
  }
}

export const getActiveProvider = async () => {
  const config = await loadConfig()
  const active = config.providers.find((provider) => provider.id === config.activeProviderId)
  return active || config.providers[0]
}

export const defaultProviders = getDefaultProviders
