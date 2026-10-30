import { useRef, useState, type ChangeEvent } from 'react'
import { Download, ExternalLink, KeyRound, ShieldCheck } from 'lucide-react'
import { useApp } from '../app/App'
import { exportModeBackup, importModeBackup, previewModeBackupWithConflicts, type BackupPreview } from '../db/database'

export function SettingsPage() {
  const { mode } = useApp()
  const [message, setMessage] = useState('')
  const [previewToken, setPreviewToken] = useState(() => typeof sessionStorage === 'undefined' ? '' : sessionStorage.getItem('evofit-preview-token') ?? '')
  const [preview, setPreview] = useState<BackupPreview>()
  const [pendingBackup, setPendingBackup] = useState<unknown>()
  const fileInput = useRef<HTMLInputElement>(null)
  const exportData = async () => {
    const data = await exportModeBackup(mode)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `evofit-${mode}-backup.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('已生成当前模式的 JSON 备份。')
  }
  const inspectBackup = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; try { const parsed: unknown = JSON.parse(await file.text()); const nextPreview = await previewModeBackupWithConflicts(parsed, mode); setPendingBackup(parsed); setPreview(nextPreview); setMessage(nextPreview.ok ? '已完成校验，请确认合并。' : `导入已阻止：${nextPreview.errors.join('、')}`) } catch { setPendingBackup(undefined); setPreview({ ok: false, mode, recordCounts: {}, timeRange: {}, conflicts: [], errors: ['BACKUP_JSON_INVALID'] }); setMessage('导入文件不是合法 JSON。') } finally { event.target.value = '' } }
  const confirmImport = async () => { if (!pendingBackup || !preview?.ok) return; try { const result = await importModeBackup(pendingBackup, mode); setMessage(`导入完成：新增 ${result.imported} 条，跳过冲突 ${result.conflicts} 条。`); setPendingBackup(undefined); setPreview(undefined) } catch (error) { setMessage(error instanceof Error ? `导入失败：${error.message}；本地数据未改变。` : '导入失败；本地数据未改变。') } }
  const savePreviewToken = () => { if (previewToken.trim()) sessionStorage.setItem('evofit-preview-token', previewToken.trim()); else sessionStorage.removeItem('evofit-preview-token'); setMessage(previewToken.trim() ? '受控预览访问码已保存到本次会话。' : '已清除本次会话的受控预览访问码。') }
  const countSummary = preview ? Object.entries(preview.recordCounts).map(([name, count]) => `${name} ${count}`).join(' · ') : ''
  return <div className="stack-lg"><section className="page-intro"><div><span className="eyebrow">我的与设置</span><h2>把边界说清楚，数据才更安心</h2><p className="muted">当前空间：{mode === 'demo' ? '演示（合成）' : '真实（本地）'}。切换不会混合查询。</p></div></section><section className="settings-grid"><div className="panel setting-card"><div className="setting-icon"><ShieldCheck /></div><div><h3>隐私与数据处理</h3><p>记录默认只保存在浏览器 IndexedDB。发起真实 AI 请求前，会提示需要发送的最小健康摘要。</p><span className="tag green-tag">本地优先</span></div></div><div className="panel setting-card"><div className="setting-icon"><KeyRound /></div><div><h3>模型连接状态</h3><p>餐图、运动解析和周报都会先经过受控 Function；未配置、未同意或校验失败时会回到手工/本地规则。</p><span className="tag orange-tag">按请求显示结果</span></div></div></section><section className="panel"><div className="panel-head"><div><span className="eyebrow">受控预览</span><h3>Function 访问码</h3></div><KeyRound size={16} /></div><p className="muted">部署者启用 `PREVIEW_ACCESS_TOKEN` 后，在这里输入访问码。访问码仅保存在本次浏览器会话，不会写入备份或发送给模型。</p><div className="button-row"><input type="password" value={previewToken} onChange={(event) => setPreviewToken(event.target.value)} placeholder="受控预览访问码" aria-label="受控预览访问码" /><button className="secondary-button" onClick={savePreviewToken}>保存访问码</button></div></section><section className="panel"><div className="panel-head"><div><span className="eyebrow">备份与恢复</span><h3>当前模式的安全合并</h3></div><div className="button-row"><button className="secondary-button" onClick={() => void exportData()}><Download size={16} />导出 JSON</button><button className="secondary-button" onClick={() => fileInput.current?.click()}>选择备份文件</button><input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(event) => void inspectBackup(event)} /></div></div><p className="muted">导入先做严格 schema、来源和 mode 校验，再展示预览；确认后只合并当前模式，重复 ID 保留本地记录。</p>{preview && <div className="diff-card"><b>导入预览</b><span>{countSummary}</span><small>{preview.timeRange.start ? `时间范围：${preview.timeRange.start} 至 ${preview.timeRange.end}` : '没有可导入记录'}</small>{preview.conflicts.length > 0 && <small>已存在冲突：{preview.conflicts.length} 条（确认后跳过）</small>}{preview.errors.length > 0 && <small className="error-message">阻止原因：{preview.errors.join('、')}</small>}{preview.ok && <button className="primary-button" onClick={() => void confirmImport()}>确认合并当前模式</button>}</div>}{message && <div className="inline-status success">{message}</div>}</section><section className="panel"><div className="panel-head"><div><span className="eyebrow">安全边界</span><h3>适用范围</h3></div><ExternalLink size={16} /></div><ul className="safe-list"><li>仅面向年满 18 岁、无特殊医学照护需求的健康用户。</li><li>能量、MET 和趋势均为估算，不构成诊断或治疗建议。</li><li>极端节食、训练过量或持续不适时，停止自动计划调整并寻求专业帮助。</li></ul></section></div>
}
