import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Layers, FileText } from 'lucide-react'
import TaskTemplateBuilder from './TaskTemplateBuilder'

const normalizeList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

function ContextManager({ contextData, onUpdateContext, templates, onTemplatesChange }) {
  const funds = contextData?.funds || []
  const [selectedFundId, setSelectedFundId] = useState(funds[0]?.id || null)
  const [portfolioInput, setPortfolioInput] = useState('')
  const [lpInput, setLpInput] = useState('')
  const [activeTab, setActiveTab] = useState('funds') // 'funds' | 'templates'

  useEffect(() => {
    if (!selectedFundId && funds.length > 0) {
      setSelectedFundId(funds[0].id)
    }
  }, [funds, selectedFundId])

  const selectedFund = useMemo(
    () => funds.find((fund) => fund.id === selectedFundId) || null,
    [funds, selectedFundId]
  )

  const updateContext = (nextFunds) => {
    onUpdateContext({ ...contextData, funds: nextFunds })
  }

  const updateFund = (patch) => {
    if (!selectedFund) return
    const nextFunds = funds.map((fund) =>
      fund.id === selectedFund.id ? { ...fund, ...patch } : fund
    )
    updateContext(nextFunds)
  }

  const handleAddFund = () => {
    const id = `fund-${Date.now()}`
    const newFund = {
      id,
      fullName: 'Fund X',
      shortName: '',
      aliases: [],
      portfolio: [],
      lps: [],
    }
    updateContext([newFund, ...funds])
    setSelectedFundId(id)
  }

  const handleDeleteFund = (fundId) => {
    const ok = window.confirm('确定要删除该基金配置吗？')
    if (!ok) return
    const nextFunds = funds.filter((fund) => fund.id !== fundId)
    updateContext(nextFunds)
    if (selectedFundId === fundId) {
      setSelectedFundId(nextFunds[0]?.id || null)
    }
  }

  const handleAddPortfolio = () => {
    if (!portfolioInput.trim()) return
    const next = Array.from(new Set([...(selectedFund?.portfolio || []), portfolioInput.trim()]))
    updateFund({ portfolio: next })
    setPortfolioInput('')
  }

  const handleAddLp = () => {
    if (!lpInput.trim()) return
    const next = Array.from(new Set([...(selectedFund?.lps || []), lpInput.trim()]))
    updateFund({ lps: next })
    setLpInput('')
  }

  const handleRemoveListItem = (field, item) => {
    if (!selectedFund) return
    const next = (selectedFund[field] || []).filter((value) => value !== item)
    updateFund({ [field]: next })
  }

  const handleAddTemplate = (template) => {
    onTemplatesChange([...templates, template])
  }

  const handleUpdateTemplate = (patch) => {
    const next = templates.map((template) =>
      template.id === patch.id ? { ...template, ...patch } : template
    )
    onTemplatesChange(next)
  }

  const handleDeleteTemplate = (templateId) => {
    onTemplatesChange(templates.filter((t) => t.id !== templateId))
  }

  const handleGenerateFromTemplate = (template) => {
    // This will be handled by the parent component (App.jsx)
    // Trigger a callback to generate tasks from template
    if (window.handleGenerateFromTemplate) {
      window.handleGenerateFromTemplate(template)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Tab Sidebar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('funds')}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
              activeTab === 'funds'
                ? 'bg-[var(--surface-2)] text-[var(--text-900)]'
                : 'text-[var(--text-700)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <Layers className="h-4 w-4" />
            基金配置
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
              activeTab === 'templates'
                ? 'bg-[var(--surface-2)] text-[var(--text-900)]'
                : 'text-[var(--text-700)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <FileText className="h-4 w-4" />
            任务模板
            {templates.length > 0 && (
              <span className="ml-auto rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-xs font-medium text-white">
                {templates.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6">
        {activeTab === 'funds' ? (
          <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
            {/* Fund List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[var(--text-900)]">基金列表</p>
                <button
                  onClick={handleAddFund}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs font-semibold text-[var(--text-700)]"
                >
                  <Plus className="h-3 w-3" />
                  新增
                </button>
              </div>
              <div className="space-y-2 text-sm">
                {funds.length === 0 && (
                  <div className="text-xs text-[var(--text-500)]">暂无基金配置</div>
                )}
                {funds.map((fund) => (
                  <button
                    key={fund.id}
                    onClick={() => setSelectedFundId(fund.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left transition ${
                      fund.id === selectedFundId
                        ? 'bg-[var(--surface-2)] text-[var(--text-900)]'
                        : 'text-[var(--text-700)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{fund.shortName || fund.fullName}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Fund Editor */}
            <div>
              {!selectedFund ? (
                <div className="text-sm text-[var(--text-500)]">请选择左侧基金进行编辑。</div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-900)]">基金信息</p>
                      <p className="text-xs text-[var(--text-500)]">用于 AI 解析简称与归属</p>
                    </div>
                    <button
                      onClick={() => handleDeleteFund(selectedFund.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      删除基金
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm text-[var(--text-700)]">
                      基金全称
                      <input
                        value={selectedFund.fullName}
                        onChange={(event) => updateFund({ fullName: event.target.value })}
                        className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm text-[var(--text-700)]">
                      简称
                      <input
                        value={selectedFund.shortName}
                        onChange={(event) => updateFund({ shortName: event.target.value })}
                        className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm text-[var(--text-700)] md:col-span-2">
                      别名（逗号分隔）
                      <input
                        value={(selectedFund.aliases || []).join(', ')}
                        onChange={(event) => updateFund({ aliases: normalizeList(event.target.value) })}
                        className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                        placeholder="如 F3, FundIII"
                      />
                    </label>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[var(--text-900)]">项目 (Portfolio)</p>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <input
                          value={portfolioInput}
                          onChange={(event) => setPortfolioInput(event.target.value)}
                          className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                          placeholder="新增项目名称"
                        />
                        <button
                          onClick={handleAddPortfolio}
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                        >
                          添加
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(selectedFund.portfolio || []).map((item) => (
                          <button
                            key={item}
                            onClick={() => handleRemoveListItem('portfolio', item)}
                            className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--text-700)] hover:text-rose-600"
                          >
                            {item} ×
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[var(--text-900)]">LP 列表</p>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <input
                          value={lpInput}
                          onChange={(event) => setLpInput(event.target.value)}
                          className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                          placeholder="新增 LP 名称"
                        />
                        <button
                          onClick={handleAddLp}
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                        >
                          添加
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(selectedFund.lps || []).map((item) => (
                          <button
                            key={item}
                            onClick={() => handleRemoveListItem('lps', item)}
                            className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--text-700)] hover:text-rose-600"
                          >
                            {item} ×
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <TaskTemplateBuilder
            contextData={contextData}
            templates={templates}
            onAddTemplate={handleAddTemplate}
            onUpdateTemplate={handleUpdateTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onGenerateFromTemplate={handleGenerateFromTemplate}
          />
        )}
      </div>
    </div>
  )
}

export default ContextManager
