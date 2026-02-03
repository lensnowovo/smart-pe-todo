import { useEffect, useState } from 'react'
import { ArrowDownToLine, Eye, EyeOff, Plug, Plus, Save, Trash2 } from 'lucide-react'
import { defaultProviders, loadConfig, saveConfig } from '../services/configStore'

function SettingsView() {
  const [status, setStatus] = useState('')
  const [config, setConfig] = useState({ activeProviderId: 'deepseek', providers: defaultProviders() })
  const [showKeys, setShowKeys] = useState({})
  const [testStatus, setTestStatus] = useState('')
  const [appVersion, setAppVersion] = useState('')
  const [updateStatus, setUpdateStatus] = useState({ state: 'idle' })

  useEffect(() => {
    const load = async () => {
      const stored = await loadConfig()
      setConfig(stored)
      if (window.electronAPI?.getAppVersion) {
        const version = await window.electronAPI.getAppVersion()
        setAppVersion(version)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return undefined
    const handler = (_event, payload) => {
      setUpdateStatus(payload || { state: 'idle' })
    }
    window.electronAPI.onUpdateStatus(handler)
    return () => window.electronAPI.offUpdateStatus(handler)
  }, [])

  const handleSave = async () => {
    await saveConfig(config)
    setStatus('已保存')
    setTimeout(() => setStatus(''), 2000)
  }

  const handleAddProvider = () => {
    const id = `provider-${Date.now()}`
    const next = {
      id,
      name: '自定义模型',
      baseUrl: 'https://api.example.com/v1',
      apiKey: '',
      model: 'model-name',
    }
    setConfig((prev) => ({
      ...prev,
      providers: [...prev.providers, next],
    }))
  }

  const handleDeleteProvider = (id) => {
    const nextProviders = config.providers.filter((provider) => provider.id !== id)
    const activeProviderId =
      config.activeProviderId === id ? (nextProviders[0]?.id || '') : config.activeProviderId
    setConfig({ ...config, providers: nextProviders, activeProviderId })
  }

  const handleUpdateProvider = (id, patch) => {
    setConfig((prev) => ({
      ...prev,
      providers: prev.providers.map((provider) =>
        provider.id === id ? { ...provider, ...patch } : provider
      ),
    }))
  }

  const handleTestConnection = async () => {
    const active = config.providers.find((provider) => provider.id === config.activeProviderId)
    if (!active?.apiKey || !active?.baseUrl || !active?.model) {
      setTestStatus('请先填写完整的 Base URL / Key / 模型')
      return
    }
    setTestStatus('测试中...')
    try {
      const response = await fetch(`${active.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${active.apiKey}`,
        },
        body: JSON.stringify({
          model: active.model,
          temperature: 0,
          messages: [
            { role: 'system', content: 'ping' },
            { role: 'user', content: 'ping' },
          ],
        }),
      })
      if (!response.ok) {
        setTestStatus(`连接失败：${response.status}`)
        return
      }
      setTestStatus('连接成功')
    } catch {
      setTestStatus('连接失败')
    }
  }

  const handleCheckUpdate = async () => {
    if (!window.electronAPI?.checkForUpdates) {
      setUpdateStatus({ state: 'disabled', message: '当前环境不支持更新' })
      return
    }
    setUpdateStatus({ state: 'checking' })
    await window.electronAPI.checkForUpdates()
  }

  const handleDownloadUpdate = async () => {
    if (!window.electronAPI?.downloadUpdate) return
    await window.electronAPI.downloadUpdate()
  }

  const handleInstallUpdate = async () => {
    if (!window.electronAPI?.installUpdate) return
    await window.electronAPI.installUpdate()
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-500)]">设置</p>
        <h3 className="mt-2 text-xl font-semibold text-[var(--text-900)]">模型与密钥配置</h3>
        <p className="mt-2 text-xs text-[var(--text-500)]">
          可添加多家模型，选择激活项后用于任务解析与报告生成。
        </p>
        {appVersion && (
          <p className="mt-2 text-xs text-[var(--text-500)]">当前版本：{appVersion}</p>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--text-900)]">应用更新</p>
            <p className="text-xs text-[var(--text-500)]">GitHub Releases 自动检查更新</p>
          </div>
          <button
            onClick={handleCheckUpdate}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-700)]"
          >
            <ArrowDownToLine className="h-4 w-4" />
            检查更新
          </button>
        </div>
        <div className="mt-3 text-xs text-[var(--text-500)]">
          {updateStatus.state === 'checking' && '正在检查更新...'}
          {updateStatus.state === 'available' && '发现新版本，可手动下载。'}
          {updateStatus.state === 'none' && '已是最新版本。'}
          {updateStatus.state === 'downloading' && '下载中...'}
          {updateStatus.state === 'downloaded' && '更新已下载，点击安装。'}
          {updateStatus.state === 'error' && `更新失败：${updateStatus.message}`}
          {updateStatus.state === 'disabled' && updateStatus.message}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadUpdate}
            disabled={updateStatus.state !== 'available'}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--text-700)] disabled:opacity-60"
          >
            下载更新
          </button>
          <button
            onClick={handleInstallUpdate}
            disabled={updateStatus.state !== 'downloaded'}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--text-700)] disabled:opacity-60"
          >
            立即安装
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAddProvider}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-700)]"
          >
            <Plus className="h-4 w-4" />
            新增模型
          </button>
          <button
            onClick={handleTestConnection}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-700)]"
          >
            <Plug className="h-4 w-4" />
            测试连接
          </button>
          {testStatus && <span className="text-xs text-[var(--text-500)]">{testStatus}</span>}
        </div>

        <div className="grid gap-3">
          {config.providers.map((provider) => {
            const isActive = provider.id === config.activeProviderId
            const showKey = Boolean(showKeys[provider.id])
            return (
              <div
                key={provider.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-xs text-[var(--text-500)]">
                    <input
                      type="radio"
                      checked={isActive}
                      onChange={() =>
                        setConfig((prev) => ({ ...prev, activeProviderId: provider.id }))
                      }
                      className="mr-2"
                    />
                    激活
                  </label>
                  <input
                    value={provider.name}
                    onChange={(event) => handleUpdateProvider(provider.id, { name: event.target.value })}
                    className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                    placeholder="模型名称"
                  />
                  <button
                    onClick={() => handleDeleteProvider(provider.id)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-2 text-rose-700 disabled:opacity-50"
                    disabled={config.providers.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-[var(--text-700)]">
                    Base URL
                    <input
                      value={provider.baseUrl}
                      onChange={(event) => handleUpdateProvider(provider.id, { baseUrl: event.target.value })}
                      className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                      placeholder="https://api.example.com/v1"
                    />
                  </label>
                  <label className="text-sm text-[var(--text-700)]">
                    默认模型
                    <input
                      value={provider.model}
                      onChange={(event) => handleUpdateProvider(provider.id, { model: event.target.value })}
                      className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                      placeholder="model-name"
                    />
                  </label>
                </div>
                <label className="mt-3 block text-sm text-[var(--text-700)]">
                  API Key
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={provider.apiKey}
                      onChange={(event) => handleUpdateProvider(provider.id, { apiKey: event.target.value })}
                      className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                      placeholder="请输入 API Key"
                    />
                    <button
                      onClick={() =>
                        setShowKeys((prev) => ({
                          ...prev,
                          [provider.id]: !prev[provider.id],
                        }))
                      }
                      className="rounded-lg border border-[var(--border)] bg-white p-2 text-[var(--text-700)]"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-700)]"
          >
            <Save className="h-4 w-4" />
            保存设置
          </button>
          {status && <span className="text-xs text-[var(--text-500)]">{status}</span>}
        </div>
      </div>
    </div>
  )
}

export default SettingsView
