import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Activity, ChevronDown, ChevronRight, Code2, Crown, Flame, LayoutDashboard, Menu, Plus, Search, Swords, Trophy, Users, X, Zap, GitCompareArrows, CircleHelp } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

type Member = { rank: number; name: string; handle: string; solved: number; easy: number; medium: number; hard: number; weekly: number; streak: number; rating: number; initials: string; color: string }
type LegalPath = '/privacy-policy' | '/terms-of-service' | '/accessibility'

const initialMembers: Member[] = [
  { rank: 1, name: 'Arjun Rao', handle: 'arjun_codes', solved: 846, easy: 231, medium: 481, hard: 134, weekly: 28, streak: 19, rating: 1842, initials: 'AR', color: 'violet' },
  { rank: 2, name: 'Mehal Skanda', handle: 'mehal_skanda', solved: 782, easy: 219, medium: 438, hard: 125, weekly: 24, streak: 12, rating: 1765, initials: 'MS', color: 'blue' },
  { rank: 3, name: 'Rahul Nair', handle: 'rahul_codes', solved: 693, easy: 205, medium: 391, hard: 97, weekly: 21, streak: 8, rating: 1698, initials: 'RN', color: 'orange' },
  { rank: 4, name: 'Ananya S', handle: 'ananya_dev', solved: 621, easy: 188, medium: 352, hard: 81, weekly: 18, streak: 16, rating: 1624, initials: 'AS', color: 'pink' },
  { rank: 5, name: 'Karthik M', handle: 'karthik_m', solved: 588, easy: 174, medium: 337, hard: 77, weekly: 15, streak: 5, rating: 1589, initials: 'KM', color: 'green' },
  { rank: 6, name: 'Sanjay P', handle: 'sanjay_codes', solved: 512, easy: 163, medium: 291, hard: 58, weekly: 12, streak: 3, rating: 1512, initials: 'SP', color: 'cyan' },
]
const activity = [{ day: 'Mon', solved: 34 }, { day: 'Tue', solved: 48 }, { day: 'Wed', solved: 39 }, { day: 'Thu', solved: 61 }, { day: 'Fri', solved: 45 }, { day: 'Sat', solved: 72 }, { day: 'Sun', solved: 43 }]
const navItems = [{ label: 'Overview', icon: LayoutDashboard }, { label: 'Leaderboard', icon: Trophy }, { label: 'Warriors', icon: Users }, { label: 'Compare', icon: GitCompareArrows }]
const USERNAME_PATTERN = /^[A-Za-z0-9_]{1,25}$/

function getLegalPath(): LegalPath | null {
  const path = window.location.pathname.replace(/\/$/, '')
  return path === '/privacy-policy' || path === '/terms-of-service' || path === '/accessibility' ? path : null
}

export default function App() {
  const legalPath = getLegalPath()
  if (legalPath) return <LegalPage path={legalPath} />
  return <Dashboard />
}

function Dashboard() {
  const [page, setPage] = useState('Overview')
  const [members, setMembers] = useState(initialMembers)
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState<'All time' | 'This week'>('All time')
  const [showAdd, setShowAdd] = useState(false)
  const [newHandle, setNewHandle] = useState('')
  const [inputError, setInputError] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [compareA, setCompareA] = useState('mehal_skanda')
  const [compareB, setCompareB] = useState('arjun_codes')
  const modalRef = useRef<HTMLElement | null>(null)
  const addWarriorButtonRef = useRef<HTMLButtonElement | null>(null)
  const wasDialogOpen = useRef(false)
  const closeAdd = () => { setShowAdd(false); setInputError(''); setNewHandle('') }

  useEffect(() => {
    if (!showAdd) {
      if (wasDialogOpen.current) addWarriorButtonRef.current?.focus()
      wasDialogOpen.current = false
      return
    }
    wasDialogOpen.current = true
    const dialog = modalRef.current
    const focusable = (): HTMLElement[] => dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')) : []
    focusable()[0]?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { closeAdd(); return }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showAdd])
  const sorted = useMemo(() => [...members].sort((a, b) => period === 'All time' ? b.solved - a.solved : b.weekly - a.weekly).map((member, index) => ({ ...member, rank: index + 1 })), [members, period])
  const filtered = sorted.filter(member => `${member.name} ${member.handle}`.toLowerCase().includes(query.slice(0, 80).toLowerCase()))
  const totalSolved = members.reduce((total, member) => total + member.solved, 0)
  const totalWeekly = members.reduce((total, member) => total + member.weekly, 0)
  const a = members.find(member => member.handle === compareA) ?? members[0]
  const b = members.find(member => member.handle === compareB) ?? members[1] ?? members[0]

  const addWarrior = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const handle = newHandle.trim().replace(/^@/, '')
    if (!USERNAME_PATTERN.test(handle)) {
      setInputError('Use 1–25 letters, numbers or underscores. Do not include spaces or links.')
      return
    }
    if (members.some(member => member.handle.toLowerCase() === handle.toLowerCase())) {
      setInputError('That username is already in this demo leaderboard.')
      return
    }
    const initials = handle.split('_').filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || 'LW'
    const displayName = handle.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase())
    setMembers(previous => [...previous, { rank: previous.length + 1, name: displayName, handle, solved: 0, easy: 0, medium: 0, hard: 0, weekly: 0, streak: 0, rating: 0, initials, color: 'cyan' }])
    closeAdd()
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`} aria-label="Main sidebar">
      <div className="brand"><div className="brand-mark" aria-hidden="true"><Swords size={21}/></div><span>leet<span className="brand-accent">wars</span></span><button type="button" className="mobile-close" aria-label="Close navigation" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="workspace"><div className="workspace-icon" aria-hidden="true">LW</div><div><strong>Public Arena</strong><small>Community hub</small></div><ChevronDown size={15} aria-hidden="true"/></div>
      <nav className="nav-list" aria-label="Dashboard navigation">{navItems.map(item => <button type="button" key={item.label} onClick={() => { setPage(item.label); setMobileNav(false) }} className={`nav-item ${page === item.label ? 'active' : ''}`} aria-current={page === item.label ? 'page' : undefined}><item.icon size={18} aria-hidden="true"/><span>{item.label}</span>{item.label === 'Leaderboard' && <span className="nav-count">{members.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="season-card"><div className="season-icon"><Flame size={17}/></div><div><b>Season 01</b><small>Competition is live</small></div><span className="live-dot" aria-label="Live"/></div><div className="sidebar-user"><div className="avatar avatar-blue" aria-hidden="true">MS</div><div><b>Demo account</b><small>Sample profile</small></div><ChevronDown size={15} aria-hidden="true"/></div></div>
    </aside>
    {mobileNav && <button type="button" className="scrim" aria-label="Close navigation menu" onClick={() => setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar"><button type="button" className="mobile-menu" aria-label="Open navigation" aria-expanded={mobileNav} onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumb">Arena <ChevronRight size={14} aria-hidden="true"/> <span>{page}</span></div><div className="top-actions"><div className="status-pill"><span className="live-dot"/> Demo mode</div><div className="top-avatar" aria-label="Demo profile">LW</div></div></header>
      <div className="content-wrap">
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> PUBLIC COMPETITION HUB</div><h1>{page === 'Overview' ? 'Your arena. Your rivals.' : page}</h1><p className="subheading">{page === 'Overview' ? 'Track progress, climb the ranks, and stay ahead of the competition.' : page === 'Leaderboard' ? 'Every problem solved moves you up the board.' : page === 'Warriors' ? 'Meet the competitors in the LeetWars arena.' : 'See how two warriors stack up against each other.'}</p></div><button ref={addWarriorButtonRef} type="button" className="primary-button" onClick={() => setShowAdd(true)}><Plus size={17} aria-hidden="true"/> Add warrior</button></section>
        {page === 'Compare' ? (a && b ? <ComparePanel members={members} a={a} b={b} compareA={compareA} compareB={compareB} setCompareA={setCompareA} setCompareB={setCompareB}/> : <p className="empty-state">Add at least one warrior to compare profiles.</p>) : <>
          <section className="stats-grid" aria-label="Community statistics">
            <StatCard label="Total problems solved" value={totalSolved.toLocaleString()} change="Across all warriors" icon={<Code2 size={18}/>} tone="purple"/>
            <StatCard label="Solved this week" value={totalWeekly.toLocaleString()} change="Community activity" icon={<Activity size={18}/>} tone="green"/>
            <StatCard label="Warriors" value={String(members.length).padStart(2, '0')} change="In this public arena" icon={<Users size={18}/>} tone="blue"/>
            <StatCard label="Top contest rating" value={String(members.length ? Math.max(...members.map(member => member.rating)) : 0)} change="Highest recorded rating" icon={<Zap size={18}/>} tone="orange"/>
          </section>
          {page === 'Overview' && <section className="middle-grid"><div className="panel activity-panel"><div className="panel-heading"><div><h2>Community activity</h2><p>Problems solved over the last 7 days</p></div><span className="chart-legend"><i/> Problems</span></div><div className="chart-wrap" role="img" aria-label="Demo chart showing community problems solved each day over the last week"><ResponsiveContainer width="100%" height="100%"><AreaChart data={activity} margin={{ top: 10, right: 5, left: -22, bottom: 0 }}><CartesianGrid stroke="#292b29" vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#a3a5a0', fontSize: 11 }} dy={10}/><Tooltip contentStyle={{ background: '#171918', border: '1px solid #3a3c39', borderRadius: 5, color: '#f2f2ee', fontSize: 12 }}/><Area type="monotone" dataKey="solved" stroke="#b7bab3" strokeWidth={2} fill="#b7bab3" fillOpacity={0.08}/></AreaChart></ResponsiveContainer></div></div><div className="panel top-performer"><div className="panel-heading"><div><h2>Top warrior</h2><p>Leading the demo arena</p></div><Crown className="crown-icon" size={19}/></div>{sorted[0] && <><div className="winner-avatar" aria-hidden="true">{sorted[0].initials}</div><h3>{sorted[0].name}</h3><p className="muted">@{sorted[0].handle}</p><div className="winner-score"><strong>{sorted[0].solved}</strong><span>problems solved</span></div><div className="winner-footer"><span><Flame size={14}/> {sorted[0].streak} day streak</span><span>#{sorted[0].rank} rank</span></div></>}</div></section>}
          <section className="panel leaderboard-panel"><div className="panel-heading leaderboard-heading"><div><div className="title-with-icon"><Trophy size={18} aria-hidden="true"/><h2>{page === 'Warriors' ? 'All warriors' : 'Leaderboard'}</h2></div><p>{page === 'Warriors' ? 'Everyone competing in this arena' : 'See who is leading the competition'}</p></div><div className="table-actions"><label className="search-box"><Search size={15} aria-hidden="true"/><span className="sr-only">Search warriors</span><input value={query} maxLength={80} onChange={event => setQuery(event.target.value.slice(0, 80))} placeholder="Search warrior..." autoComplete="off"/></label><div className="period-switch" role="group" aria-label="Leaderboard period"><button type="button" className={period === 'All time' ? 'selected' : ''} aria-pressed={period === 'All time'} onClick={() => setPeriod('All time')}>All time</button><button type="button" className={period === 'This week' ? 'selected' : ''} aria-pressed={period === 'This week'} onClick={() => setPeriod('This week')}>This week</button></div></div></div>
            <div className="table-scroll"><table><caption className="sr-only">LeetWars demo leaderboard, sorted by {period.toLowerCase()} problems solved</caption><thead><tr><th scope="col">RANK</th><th scope="col">WARRIOR</th><th scope="col">PROBLEMS SOLVED</th><th scope="col">EASY</th><th scope="col">MEDIUM</th><th scope="col">HARD</th><th scope="col">WEEKLY</th><th scope="col">STREAK</th></tr></thead><tbody>{filtered.map(member => <tr key={member.handle}><td><span className={`rank rank-${member.rank}`}>{member.rank === 1 ? <Crown size={15} aria-label="First place"/> : String(member.rank).padStart(2, '0')}</span></td><td><div className="warrior-cell"><div className={`avatar avatar-${member.color}`} aria-hidden="true">{member.initials}</div><div><b>{member.name}</b><small>@{member.handle}</small></div></div></td><td><strong className="solved-number">{period === 'All time' ? member.solved : member.weekly}</strong><span className="progress-track" aria-hidden="true"><i style={{ width: `${Math.max(2, (member.solved / Math.max(1, ...members.map(item => item.solved))) * 100)}%` }}/></span></td><td><span className="difficulty easy">{member.easy}</span></td><td><span className="difficulty medium">{member.medium}</span></td><td><span className="difficulty hard">{member.hard}</span></td><td><span className="weekly-number">+{member.weekly}</span></td><td><span className="streak"><Flame size={14} aria-hidden="true"/>{member.streak}d</span></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state" role="status">No warriors match your search.</div>}</div>
            <div className="table-footer"><span>Showing <b>{filtered.length}</b> of <b>{members.length}</b> warriors</span><span>Sample data <span className="live-dot"/></span></div>
          </section>
          <div className="disclaimer"><CircleHelp size={14} aria-hidden="true"/> Demo leaderboard with sample data. LeetCode profile syncing is not connected yet.</div>
        </>}
      </div>
      <footer className="site-footer"><span>© {new Date().getFullYear()} LeetWars · Demo project</span><nav aria-label="Legal information"><a href="/privacy-policy">Privacy</a><a href="/terms-of-service">Terms</a><a href="/accessibility">Accessibility</a></nav></footer>
    </main>
    {showAdd && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeAdd() }}><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="add-warrior-title" aria-describedby="add-warrior-description"><div className="modal-head"><div><h2 id="add-warrior-title">Add a warrior</h2><p id="add-warrior-description">Add a LeetCode username to the demo arena.</p></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={closeAdd}><X size={18}/></button></div><form onSubmit={addWarrior} noValidate><label htmlFor="handle">LEETCODE USERNAME</label><div className="input-wrap"><span aria-hidden="true">@</span><input id="handle" name="handle" autoFocus value={newHandle} maxLength={26} onChange={event => { setNewHandle(event.target.value.slice(0, 26)); setInputError('') }} placeholder="e.g. username" autoComplete="off" aria-invalid={Boolean(inputError)} aria-describedby={inputError ? 'handle-error' : 'handle-help'}/></div>{inputError ? <p className="field-error" id="handle-error" role="alert">{inputError}</p> : <p className="modal-note" id="handle-help">Use 1–25 letters, numbers or underscores. This phase adds a local placeholder only.</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={closeAdd}>Cancel</button><button type="submit" className="primary-button" disabled={!newHandle.trim()}>Add to arena <ChevronRight size={16}/></button></div></form></section></div>}
  </div>
}

function StatCard({ label, value, change, icon, tone }: { label: string; value: string; change: string; icon: ReactNode; tone: string }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`} aria-hidden="true">{icon}</div><span className="stat-label">{label}</span><strong>{value}</strong><span className="stat-change">{change}</span></article>
}

function ComparePanel({ members, a, b, compareA, compareB, setCompareA, setCompareB }: { members: Member[]; a: Member; b: Member; compareA: string; compareB: string; setCompareA: (value: string) => void; setCompareB: (value: string) => void }) {
  return <section className="panel compare-panel"><div className="panel-heading"><div><h2>Head-to-head comparison</h2><p>Compare total solved questions and difficulty breakdown.</p></div></div><div className="compare-selectors"><label>WARRIOR ONE<select value={compareA} onChange={event => setCompareA(event.target.value)}>{members.map(member => <option key={member.handle} value={member.handle}>{member.name} (@{member.handle})</option>)}</select></label><div className="versus" aria-hidden="true">VS</div><label>WARRIOR TWO<select value={compareB} onChange={event => setCompareB(event.target.value)}>{members.map(member => <option key={member.handle} value={member.handle}>{member.name} (@{member.handle})</option>)}</select></label></div><div className="compare-cards"><CompareCard member={a}/><div className="compare-divider" aria-hidden="true"><GitCompareArrows size={20}/></div><CompareCard member={b}/></div><div className="comparison-bars">{(['easy', 'medium', 'hard'] as const).map(key => <div className="comparison-row" key={key}><span className={`difficulty ${key}`}>{key}</span><div className="dual-bars"><div className="bar-side" aria-label={`${a.name}: ${a[key]}`}><i style={{ width: `${Math.max(2, a[key] / Math.max(a[key], b[key], 1) * 100)}%` }}/></div><div className="bar-side right" aria-label={`${b.name}: ${b[key]}`}><i style={{ width: `${Math.max(2, b[key] / Math.max(a[key], b[key], 1) * 100)}%` }}/></div></div><b>{a[key]} / {b[key]}</b></div>)}</div></section>
}

function CompareCard({ member }: { member: Member }) {
  return <article className="compare-user"><div className={`avatar avatar-${member.color}`} aria-hidden="true">{member.initials}</div><h3>{member.name}</h3><span>@{member.handle}</span><strong>{member.solved}</strong><small>problems solved</small><div className="compare-meta"><span><Flame size={13} aria-hidden="true"/>{member.streak} day streak</span><span>Rating {member.rating || '—'}</span></div></article>
}

function LegalPage({ path }: { path: LegalPath }) {
  const content = {
    '/privacy-policy': { title: 'Privacy Policy', intro: 'This page is a pre-launch policy draft. It must be reviewed and completed by the site operator and qualified counsel before public launch.', sections: [['Current demo data', 'This Phase 1 build uses fictional sample leaderboard records stored in the application bundle. Adding a username changes local in-memory demo state only; it is not transmitted to a server or saved after a page refresh.'], ['Personal information and tracking', 'This prototype does not provide accounts, authentication, analytics, advertising pixels, tracking cookies, or a backend database. The production version must identify the operator, lawful purposes, data categories, legal bases where applicable, recipients, retention periods, international transfers, user rights, and contact details before collecting personal information.'], ['Your rights and deletion requests', 'A production service must provide a verified process for access, correction, export, objection where applicable, and deletion requests, with a documented retention and response procedure. No personal-data deletion workflow is active in this prototype.'], ['Contact', 'The production operator must insert a monitored privacy contact address and business identity here before launch.']] },
    '/terms-of-service': { title: 'Terms of Service', intro: 'This is a non-binding placeholder, not a complete contract. The operator must obtain legal review and publish final terms before opening the service to the public.', sections: [['Service status', 'LeetWars is currently a frontend demonstration using fictional sample data. It does not authenticate users, verify LeetCode accounts, or guarantee leaderboard accuracy.'], ['Third-party services', 'LeetWars is an independent project and is not affiliated with, endorsed by, or sponsored by LeetCode. LeetCode names and marks belong to their respective owners. Any future integration must respect applicable third-party terms and rate limits.'], ['Acceptable use', 'Production terms should prohibit unlawful activity, abuse, automated attacks, impersonation, harassment, scraping beyond permitted access, and attempts to disrupt the service.'], ['Operator details and disputes', 'Before launch, insert the legal operator name, contact address, governing law, dispute process, service limitations, liability provisions, and effective date after qualified legal review.']] },
    '/accessibility': { title: 'Accessibility Statement', intro: 'LeetWars aims to support inclusive access and is being developed toward WCAG 2.1 Level AA. This statement is not a certification or a claim that every page has passed an accessibility audit.', sections: [['Current efforts', 'The interface uses semantic landmarks, labelled form controls, keyboard-operable buttons, visible focus indicators, text alternatives for chart summaries, and responsive layouts.'], ['Known limitations', 'This prototype has not yet undergone a full manual screen-reader, keyboard-only, zoom/reflow, color-contrast, or automated WCAG audit. Interactive charts and the add-warrior dialog require further assistive-technology testing.'], ['Feedback and accommodations', 'Before public launch, the operator must provide an accessible contact method for reporting barriers, a response target, and a process for prioritising and resolving accessibility issues. Insert a monitored accessibility contact address here.']] },
  }[path]
  return <main className="legal-shell"><header className="legal-header"><a className="brand legal-brand" href="/" aria-label="LeetWars home"><span className="brand-mark"><Swords size={21}/></span><span>leet<span className="brand-accent">wars</span></span></a><a className="back-link" href="/">Back to arena</a></header><article className="legal-content"><p className="eyebrow">LEETWARS · LEGAL & ACCESSIBILITY</p><h1>{content.title}</h1><p className="legal-intro">{content.intro}</p>{content.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}<p className="legal-updated">Draft status: 1 November 2026 · Requires operator review before production use.</p></article></main>
}
