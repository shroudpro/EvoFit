import { useEffect, useState, createContext, useContext } from 'react'
import { NavLink, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { Activity, Bot, Dumbbell, Home, Settings, Utensils, Sparkles, Database, RefreshCw } from 'lucide-react'
import { repo } from '../db/database'
import { resetDemoData } from '../db/seed'
import type { Mode, UserProfile } from '../shared/types'
import { Onboarding } from '../pages/Onboarding'
import { Today } from '../pages/Today'
import { Nutrition } from '../pages/Nutrition'
import { Training } from '../pages/Training'
import { Progress } from '../pages/Progress'
import { SettingsPage } from '../pages/Settings'
import { ChatCoach } from '../pages/ChatCoach'

interface AppContextValue { mode: Mode; setMode: (mode: Mode) => void; profile: UserProfile | undefined; refreshProfile: () => Promise<void>; demoReset: () => Promise<void> }
const AppContext = createContext<AppContextValue | null>(null)
export const useApp = () => { const value = useContext(AppContext); if (!value) throw new Error('App context missing'); return value }

const NAV_ITEMS = [
  ['/today', Home, '今日'],
  ['/nutrition', Utensils, '饮食'],
  ['/training', Dumbbell, '训练'],
  ['/progress', Activity, '成长'],
  ['/settings', Settings, '我的'],
] as const

function MainNavigation({ mobile = false }: { mobile?: boolean }) {
  return <nav className={mobile ? 'mobile-nav' : 'desktop-nav'} aria-label={mobile ? '移动端主导航' : '主导航'}>
    {NAV_ITEMS.map(([to, Icon, label]) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>{<Icon size={18} />}{label}</NavLink>)}
  </nav>
}

function AppLayout() { const { mode, setMode, demoReset } = useApp(); const [aiOpen, setAiOpen] = useState(false); return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark">E</div><div><b>EvoFit</b><small>自适应健康计划</small></div></div><MainNavigation /><div className="sidebar-bottom"><button className="ai-button" onClick={() => setAiOpen(true)}><Bot size={18} />AI 教练</button><div className="mode-switch"><span className={mode === 'real' ? 'mode-pill selected' : 'mode-pill'} onClick={() => setMode('real')}>真实</span><span className={mode === 'demo' ? 'mode-pill selected demo' : 'mode-pill'} onClick={() => setMode('demo')}>演示</span></div>{mode === 'demo' && <button className="text-button" onClick={() => void demoReset()}><RefreshCw size={14} />重置演示数据</button>}</div></aside><main className="main"><header className="topbar"><div><span className={mode === 'demo' ? 'eyebrow mode-eyebrow demo' : 'eyebrow mode-eyebrow'}>{mode === 'demo' ? '演示空间 · 合成数据' : '本地优先 · 真实空间'}</span><h1>保持小步，持续变好</h1></div><div className="top-actions"><span className="save-status"><Database size={15} />本地已保存</span><button className="icon-button" onClick={() => setAiOpen(true)} title="打开 AI 教练"><Sparkles size={18} /></button></div></header><div className="page-content"><Outlet /></div></main><MainNavigation mobile />{aiOpen && <div className="drawer-backdrop" onClick={() => setAiOpen(false)}><aside className="ai-drawer" onClick={(event) => event.stopPropagation()}><ChatCoach onClose={() => setAiOpen(false)} /></aside></div>}</div> }

export default function App() { const [mode, setModeState] = useState<Mode>(() => (localStorage.getItem('evofit-mode') as Mode) || 'real'); const [profile, setProfile] = useState<UserProfile>(); const [ready, setReady] = useState(false); const refreshProfile = async () => setProfile(await repo.getProfile(mode)); useEffect(() => { let cancelled = false; const load = async () => { if (mode === 'demo' && !(await repo.getProfile('demo'))) await resetDemoData(); if (!cancelled) await refreshProfile(); if (!cancelled) setReady(true) }; void load(); return () => { cancelled = true } }, [mode]); const setMode = (next: Mode) => { localStorage.setItem('evofit-mode', next); setReady(false); setModeState(next) }; const demoReset = async () => { await resetDemoData(); await refreshProfile() }; if (!ready) return <div className="loading-screen">正在读取本地数据…</div>; return <AppContext.Provider value={{ mode, setMode, profile, refreshProfile, demoReset }}><Routes><Route path="/onboarding" element={<Onboarding />} /><Route element={<AppLayout />}><Route path="/today" element={profile ? <Today /> : <Navigate to="/onboarding" replace />} /><Route path="/nutrition" element={profile ? <Nutrition /> : <Navigate to="/onboarding" replace />} /><Route path="/training" element={profile ? <Training /> : <Navigate to="/onboarding" replace />} /><Route path="/progress" element={profile ? <Progress /> : <Navigate to="/onboarding" replace />} /><Route path="/settings" element={profile ? <SettingsPage /> : <Navigate to="/onboarding" replace />} /></Route><Route path="*" element={<Navigate to={profile ? '/today' : '/onboarding'} replace />} /></Routes></AppContext.Provider> }
