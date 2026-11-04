import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, ChevronRight, Menu, Plus, Swords, Trophy, Users, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import {
  createPublicArenaTeam,
  getPublicLeaderboard,
  getPublicProfiles,
  getPublicTeamMembers,
  getPublicTeams,
  getMyTeamIds,
  getMyPublicVisibility,
  joinPublicArenaTeam,
  setMyPublicVisibility,
  type PublicArenaResult,
  type PublicLeaderboardEntry,
  type PublicProfile,
  type PublicTeam,
  type PublicTeamMember,
} from './lib/publicArena'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type LoadState<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T }

function useLoad<T>(load: () => Promise<PublicArenaResult<T>>, key: string): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' })
  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    void load().then(result => {
      if (!active) return
      if (result.error !== null) setState({ status: 'error', message: result.error })
      else if (result.data !== null) setState({ status: 'ready', data: result.data })
      else setState({ status: 'error', message: 'Public data is temporarily unavailable.' })
    }).catch(() => {
      if (active) setState({ status: 'error', message: 'Public data is temporarily unavailable.' })
    })
    return () => { active = false }
  }, [key])
  return state
}

function route() {
  const parts = window.location.pathname.split('/').filter(Boolean).map(part => decodeURIComponent(part))
  if (parts[0] === 'players' && parts[1]) return { page: 'player' as const, id: parts[1] }
  if (parts[0] === 'teams' && parts[1]) return { page: 'team' as const, id: parts[1] }
  if (parts[0] === 'teams') return { page: 'teams' as const }
  if (['privacy-policy', 'terms-of-service', 'accessibility'].includes(parts[0] ?? '')) return { page: 'legal' as const }
  return { page: 'leaderboard' as const }
}

export default function App() {
  const current = route()
  const [mobileNav, setMobileNav] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [joinedTeamIds, setJoinedTeamIds] = useState<string[]>([])

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return
    }
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setUser(data.session?.user ?? null)
        setAuthReady(true)
      }
    }).catch(() => { if (active) setAuthReady(true) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setJoinedTeamIds([])
      setActionMessage('')
      setAuthReady(true)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!user) {
      setJoinedTeamIds([])
      return () => { active = false }
    }
    void getMyTeamIds(user.id).then(ids => { if (active) setJoinedTeamIds(ids) })
    return () => { active = false }
  }, [user?.id])

  const signIn = async () => {
    if (!supabase) {
      setActionMessage('Account sign-in is not configured on this deployment yet.')
      return
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) setActionMessage('Google sign-in is unavailable. The project owner needs to enable Google in Supabase Auth.')
    } catch {
      setActionMessage('Google sign-in is unavailable. Check the Supabase Auth provider and redirect settings.')
    }
  }

  const signOut = async () => {
    if (!supabase) return
    try {
      const { error } = await supabase.auth.signOut()
      if (error) setActionMessage('Could not sign out. Please try again.')
    } catch {
      setActionMessage('Could not sign out. Check your connection and try again.')
    }
  }

  const joinTeam = async (teamId: string) => {
    if (!user) {
      await signIn()
      return
    }
    let result: Awaited<ReturnType<typeof joinPublicArenaTeam>>
    try { result = await joinPublicArenaTeam(teamId) } catch { setActionMessage('Could not join this team. Check your connection and try again.'); return }
    if (result.error) setActionMessage(result.error)
    else {
      setJoinedTeamIds(ids => ids.includes(teamId) ? ids : [...ids, teamId])
      setActionMessage('You joined the team. Your membership appears on its public roster only if your profile is public.')
    }
  }

  const createTeam = async (name: string, description: string) => {
    if (!user) {
      await signIn()
      return
    }
    let result: Awaited<ReturnType<typeof createPublicArenaTeam>>
    try { result = await createPublicArenaTeam(name, description) } catch { setActionMessage('Could not create the team. Check your connection and try again.'); return }
    if (result.error !== null) setActionMessage(result.error)
    else window.location.assign(`/teams/${encodeURIComponent(result.data)}`)
  }

  if (current.page === 'legal') return <LegalPage />
  const title = current.page === 'leaderboard' ? 'Public leaderboard' : current.page === 'teams' ? 'Public teams' : current.page === 'player' ? 'Player profile' : 'Team details'
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`} aria-label="Main sidebar">
      <a className="brand" href="/"><span className="brand-mark"><Swords size={21}/></span><span>leet<span className="brand-accent">wars</span></span><button type="button" className="mobile-close" aria-label="Close navigation" onClick={event => { event.preventDefault(); setMobileNav(false) }}><X size={18}/></button></a>
      <div className="workspace-label">COMMUNITY</div><div className="workspace"><div className="workspace-icon">LW</div><div><strong>Public Arena</strong><small>Browse public data</small></div></div>
      <nav className="nav-list" aria-label="Arena navigation">
        <a className={`nav-item ${current.page === 'leaderboard' ? 'active' : ''}`} aria-current={current.page === 'leaderboard' ? 'page' : undefined} href="/"><Trophy size={18}/><span>Leaderboard</span></a>
        <a className={`nav-item ${current.page === 'teams' || current.page === 'team' ? 'active' : ''}`} aria-current={current.page === 'teams' || current.page === 'team' ? 'page' : undefined} href="/teams"><Users size={18}/><span>Teams</span></a>
      </nav>
      <div className="sidebar-bottom"><div className="season-card"><div className="season-icon"><Activity size={17}/></div><div><b>LeetWars</b><small>Scheduled sync planned</small></div></div><div className="sidebar-user"><div className="avatar">LW</div><div><b>Public browsing</b><small>No account required</small></div></div></div>
    </aside>
    {mobileNav && <button type="button" className="scrim" aria-label="Close navigation menu" onClick={() => setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar"><button type="button" className="mobile-menu" aria-label="Open navigation" aria-expanded={mobileNav} onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumb">Arena <ChevronRight size={14}/> <span>{title}</span></div><div className="top-actions">{user ? <><span className="signed-in-label">Signed in</span><button className="secondary-button header-button" type="button" onClick={signOut}>Sign out</button></> : <button className="primary-button header-button" type="button" disabled={!authReady || !isSupabaseConfigured} onClick={() => void signIn()}>{!isSupabaseConfigured ? 'Sign-in setup needed' : 'Sign in with Google'}</button>}</div></header>
      <div className="content-wrap">
        {actionMessage && <div className="action-message" role="status"><span>{actionMessage}</span><button type="button" className="icon-button" aria-label="Dismiss message" onClick={() => setActionMessage('')}><X size={16}/></button></div>}
        {current.page === 'leaderboard' && <Leaderboard user={user} onSignIn={signIn} onMessage={setActionMessage} />}
        {current.page === 'teams' && <Teams user={user} onSignIn={signIn} onJoin={joinTeam} onCreate={createTeam} joinedTeamIds={joinedTeamIds} />}
        {current.page === 'player' && <PlayerProfile publicId={current.id} />}
        {current.page === 'team' && <TeamDetail id={current.id} user={user} onSignIn={signIn} onJoin={joinTeam} joined={joinedTeamIds.includes(current.id)} />}
      </div>
      <footer className="site-footer"><span>LeetWars · Public Arena</span><nav aria-label="Legal information"><a href="/privacy-policy">Privacy</a><a href="/terms-of-service">Terms</a><a href="/accessibility">Accessibility</a></nav></footer>
    </main>
  </div>
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/>{eyebrow}</div><h1>{title}</h1><p className="subheading">{description}</p></div></section>
}

function StateMessage({ state, noun }: { state: LoadState<unknown>; noun: string }) {
  if (state.status === 'loading') return <div className="panel-state" role="status">Loading {noun}…</div>
  if (state.status === 'error') return <div className="panel-state state-error" role="alert"><strong>Couldn’t load {noun}</strong><span>{state.message}</span></div>
  return null
}

function Leaderboard({ user, onSignIn, onMessage }: { user: User | null; onSignIn: () => Promise<void>; onMessage: (message: string) => void }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const state = useLoad(getPublicLeaderboard, `leaderboard-${refreshKey}`)
  const [query, setQuery] = useState('')
  const [isPublic, setIsPublic] = useState<boolean | null>(null)
  const [visibilityLoading, setVisibilityLoading] = useState(false)
  const [updatingVisibility, setUpdatingVisibility] = useState(false)
  useEffect(() => {
    let active = true
    if (!user) {
      setIsPublic(null)
      setVisibilityLoading(false)
      return () => { active = false }
    }
    setVisibilityLoading(true)
    void getMyPublicVisibility(user.id).then(value => {
      if (active) {
        setIsPublic(value)
        setVisibilityLoading(false)
      }
    })
    return () => { active = false }
  }, [user?.id])

  const toggleParticipation = async () => {
    if (!user) {
      await onSignIn()
      return
    }
    if (isPublic === null) {
      onMessage('Your profile visibility could not be loaded. Check the Supabase migration and profile permissions.')
      return
    }
    setUpdatingVisibility(true)
    let result: Awaited<ReturnType<typeof setMyPublicVisibility>>
    try { result = await setMyPublicVisibility(isPublic !== true) } catch { setUpdatingVisibility(false); onMessage('Could not update your leaderboard visibility. Check your connection and try again.'); return }
    setUpdatingVisibility(false)
    if (result.error) onMessage(result.error)
    else {
      setIsPublic(result.data)
      setRefreshKey(key => key + 1)
      onMessage(result.data ? 'You joined the public leaderboard. Your profile is visible to everyone.' : 'You left the public leaderboard. Your profile is private again.')
    }
  }
  const rows = state.status === 'ready' ? state.data.filter(row => `${row.display_name} ${row.handle}`.toLowerCase().includes(query.toLowerCase())) : []
  return <>
    <PageHeading eyebrow="PUBLIC COMPETITION HUB" title="Public leaderboard" description="Public players ranked by LeetWars XP. LeetCode problem statistics are not available yet."/>
    <section className="participation-card"><div><strong>{user ? (isPublic === true ? 'You are on the public leaderboard' : 'Join the public leaderboard') : 'Want to join the leaderboard?'}</strong><p>{user ? (isPublic === true ? 'Your LeetWars XP, level, handle, and display name are visible to everyone.' : isPublic === false ? 'Joining makes your display name, handle, LeetWars XP, and level visible to everyone.' : 'Your profile visibility could not be loaded. Check the database setup and try again.') : 'Sign in with Google, then choose whether to make your profile public.'}</p></div><button className={user && isPublic === true ? 'secondary-button' : 'primary-button'} type="button" disabled={updatingVisibility || visibilityLoading || (user !== null && isPublic === null)} onClick={() => void toggleParticipation()}>{updatingVisibility ? 'Saving…' : visibilityLoading ? 'Loading…' : user && isPublic === true ? 'Leave leaderboard' : user && isPublic === null ? 'Unavailable' : user ? 'Join leaderboard' : 'Sign in to join'}</button></section>
    <section className="panel leaderboard-panel"><div className="panel-heading leaderboard-heading"><div><div className="title-with-icon"><Trophy size={18}/><h2>Players</h2></div><p>Only profiles that have opted into public visibility appear here.</p></div><label className="search-box"><span className="sr-only">Search public players</span><input value={query} maxLength={80} onChange={event => setQuery(event.target.value)} placeholder="Search players…"/></label></div>
      <StateMessage state={state} noun="the leaderboard"/>
      {state.status === 'ready' && <><div className="table-scroll"><table><caption className="sr-only">Public players ranked by LeetWars XP</caption><thead><tr><th scope="col">RANK</th><th scope="col">PLAYER</th><th scope="col">TOTAL XP</th><th scope="col">LEVEL</th></tr></thead><tbody>{rows.map(player => <LeaderboardRow key={player.public_id} player={player}/>)}</tbody></table>{rows.length === 0 && <div className="empty-state" role="status">{state.data.length === 0 ? 'No public players yet. Players can appear after opting into public visibility.' : 'No players match your search.'}</div>}</div><div className="table-footer"><span>Showing <b>{rows.length}</b> of <b>{state.data.length}</b> public players</span><span>LeetWars XP</span></div></>}
    </section><div className="disclaimer"><Activity size={14}/> LeetCode sync is planned on a schedule. No LeetCode metrics are shown until a reliable data source is selected.</div>
  </>
}

function LeaderboardRow({ player }: { player: PublicLeaderboardEntry }) {
  const initials = (player.display_name || player.handle).trim().slice(0, 2).toUpperCase()
  return <tr><td><span className={`rank rank-${player.leaderboard_rank}`}>{player.leaderboard_rank}</span></td><td><a className="warrior-cell player-link" href={`/players/${encodeURIComponent(player.public_id)}`}><span className="avatar">{initials}</span><span><b>{player.display_name}</b><small>@{player.handle}</small></span></a></td><td><strong className="solved-number">{player.total_xp.toLocaleString()}</strong></td><td><span className="difficulty">{player.level}</span></td></tr>
}

function Teams({ user, onSignIn, onJoin, onCreate, joinedTeamIds }: {
  user: User | null
  onSignIn: () => Promise<void>
  onJoin: (teamId: string) => Promise<void>
  onCreate: (name: string, description: string) => Promise<void>
  joinedTeamIds: string[]
}) {
  const state = useLoad(getPublicTeams, 'teams')
  const [createOpen, setCreateOpen] = useState(false)
  return <><PageHeading eyebrow="COMMUNITY" title="Public teams" description="Discover public teams, join one, or create a team for your friends."/><section className="panel leaderboard-panel"><div className="panel-heading"><div><div className="title-with-icon"><Users size={18}/><h2>Teams</h2></div><p>Public team names and rosters are visible to everyone.</p></div><button className="primary-button" type="button" onClick={() => user ? setCreateOpen(true) : void onSignIn()}><Plus size={15}/>Create a team</button></div><StateMessage state={state} noun="public teams"/>{state.status === 'ready' && (state.data.length ? <div className="directory-list">{state.data.map(team => <TeamCard key={team.id} team={team} joined={joinedTeamIds.includes(team.id)} onJoin={() => void onJoin(team.id)} onSignIn={onSignIn} signedIn={Boolean(user)}/>)}</div> : <div className="empty-state" role="status">No public teams yet. Create one to get started.</div>)}</section>{createOpen && <CreateTeamDialog onClose={() => setCreateOpen(false)} onCreate={onCreate}/>}</>
}

function TeamCard({ team, joined, onJoin, onSignIn, signedIn }: { team: PublicTeam; joined: boolean; onJoin: () => void; onSignIn: () => Promise<void>; signedIn: boolean }) {
  return <div className="team-card-row"><a className="directory-card" href={`/teams/${encodeURIComponent(team.id)}`}><span className="directory-icon"><Users size={19}/></span><span className="directory-copy"><strong>{team.name}</strong><span>{team.description || 'No description provided.'}</span><small>Created {new Date(team.created_at).toLocaleDateString()}</small></span><ChevronRight size={17}/></a><button type="button" className={joined ? 'secondary-button' : 'primary-button'} disabled={joined} onClick={signedIn ? onJoin : () => void onSignIn()}>{joined ? 'Joined' : 'Join team'}</button></div>
}

function CreateTeamDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, description: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (name.trim().length < 2 || name.trim().length > 40 || description.trim().length > 240) {
      setError('Use a team name between 2 and 40 characters and a description under 240 characters.')
      return
    }
    setBusy(true)
    await onCreate(name, description)
    setBusy(false)
    setError('')
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-team-title"><div className="modal-head"><div><h2 id="create-team-title">Create a public team</h2><p>Your team will appear in the directory and anyone can join.</p></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18}/></button></div><form onSubmit={event => void submit(event)}><label htmlFor="team-name">TEAM NAME</label><div className="input-wrap"><input id="team-name" value={name} maxLength={40} required minLength={2} onChange={event => setName(event.target.value)} placeholder="e.g. Weekend Warriors" autoFocus/></div><label className="form-label" htmlFor="team-description">DESCRIPTION <span>OPTIONAL</span></label><textarea id="team-description" value={description} maxLength={240} onChange={event => setDescription(event.target.value)} placeholder="What is your team about?" rows={3}/><p className="modal-note">Team name and description are public. Your personal profile stays private unless you join the leaderboard.</p>{error && <p className="field-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Creating…' : 'Create team'}</button></div></form></section></div>
}

function PlayerProfile({ publicId }: { publicId: string }) {
  const profiles = useLoad(getPublicProfiles, 'profiles')
  const leaderboard = useLoad(getPublicLeaderboard, 'leaderboard')
  if (profiles.status === 'loading' || leaderboard.status === 'loading') return <><PageHeading eyebrow="PUBLIC PLAYER" title="Player profile" description="Loading public profile…"/><div className="panel-state" role="status">Loading public profile…</div></>
  if (profiles.status === 'error') return <><PageHeading eyebrow="PUBLIC PLAYER" title="Player profile" description="This profile could not be loaded."/><StateMessage state={profiles} noun="the profile"/></>
  const profile = profiles.data.find(item => item.public_id === publicId)
  if (!profile) return <><PageHeading eyebrow="PUBLIC PLAYER" title="Profile unavailable" description="This profile is not public or could not be found."/><div className="empty-state" role="status">Only profiles opted into public visibility can be viewed.</div><a className="secondary-button inline-link" href="/">Back to leaderboard</a></>
  const stats = leaderboard.status === 'ready' ? leaderboard.data.find(item => item.public_id === publicId) : undefined
  const initials = (profile.display_name || profile.handle).trim().slice(0, 2).toUpperCase()
  return <><PageHeading eyebrow="PUBLIC PLAYER" title={profile.display_name} description={`@${profile.handle}`}/><section className="profile-card"><div className="profile-avatar">{initials}</div><div><div className="eyebrow">PUBLIC PROFILE</div><h2>{profile.display_name}</h2><p>@{profile.handle}</p></div></section>{leaderboard.status === 'error' ? <StateMessage state={leaderboard} noun="player statistics"/> : stats ? <section className="stats-grid profile-stats"><Stat label="LeetWars XP" value={stats.total_xp.toLocaleString()}/><Stat label="Level" value={String(stats.level)}/><Stat label="Leaderboard rank" value={`#${stats.leaderboard_rank}`}/></section> : <div className="panel-state">LeetWars XP and level are not available for this profile yet.</div>}<div className="disclaimer"><Activity size={14}/> LeetCode statistics and activity history are not available in this release.</div></>
}

function Stat({ label, value }: { label: string; value: string }) { return <article className="stat-card"><span className="stat-label">{label}</span><strong>{value}</strong></article> }

function TeamDetail({ id, user, onSignIn, onJoin, joined }: { id: string; user: User | null; onSignIn: () => Promise<void>; onJoin: (teamId: string) => Promise<void>; joined: boolean }) {
  const teams = useLoad(getPublicTeams, 'teams')
  const members = useLoad(() => getPublicTeamMembers(id), `${id}-${joined ? 'joined' : 'not-joined'}`)
  if (teams.status === 'loading') return <><PageHeading eyebrow="PUBLIC TEAM" title="Team details" description="Loading public team…"/><div className="panel-state" role="status">Loading public team…</div></>
  if (teams.status === 'error') return <><PageHeading eyebrow="PUBLIC TEAM" title="Team details" description="This team could not be loaded."/><StateMessage state={teams} noun="the team"/></>
  const team = teams.data.find(item => item.id === id)
  if (!team) return <><PageHeading eyebrow="PUBLIC TEAM" title="Team unavailable" description="This team is private or could not be found."/><div className="empty-state" role="status">Only public teams can be viewed.</div><a className="secondary-button inline-link" href="/teams">Back to public teams</a></>
  return <><PageHeading eyebrow="PUBLIC TEAM" title={team.name} description={team.description || 'No description provided.'}/><div className="team-detail-actions"><span>Join to take part with your friends.</span><button type="button" className={joined ? 'secondary-button' : 'primary-button'} disabled={joined} onClick={user ? () => void onJoin(id) : () => void onSignIn()}>{joined ? 'Joined' : user ? 'Join this team' : 'Sign in to join'}</button></div><section className="panel leaderboard-panel"><div className="panel-heading"><div><div className="title-with-icon"><Users size={18}/><h2>Public roster</h2></div><p>Only members with public profiles are listed.</p></div></div><TeamRoster state={members}/></section><a className="back-link back-to-list" href="/teams">← All public teams</a></>
}

function TeamRoster({ state }: { state: LoadState<PublicTeamMember[]> }) {
  if (state.status !== 'ready') return <StateMessage state={state} noun="the public roster"/>
  if (!state.data.length) return <div className="empty-state" role="status">No public members are listed for this team.</div>
  return <div className="directory-list">{state.data.map(member => <a className="directory-card roster-card" href={`/players/${encodeURIComponent(member.public_id)}`} key={member.public_id}><span className="avatar">{(member.display_name || member.handle).slice(0, 2).toUpperCase()}</span><span className="directory-copy"><strong>{member.display_name}</strong><span>@{member.handle}</span></span><span className="role-badge">{member.role}</span></a>)}</div>
}

function LegalPage() {
  return <main className="legal-shell"><header className="legal-header"><a className="brand legal-brand" href="/"><span className="brand-mark"><Swords size={21}/></span><span>leet<span className="brand-accent">wars</span></span></a><a className="back-link" href="/">Back to arena</a></header><article className="legal-content"><p className="eyebrow">LEETWARS · PUBLIC ARENA</p><h1>LeetWars public browsing</h1><p className="legal-intro">Public browsing uses allowlisted Supabase views. Profiles remain private unless their owner opts into public visibility.</p><section><h2>Data shown</h2><p>The public arena currently displays public profile names and handles, LeetWars XP and levels, and public team descriptions with public member names, handles, roles, and join dates. It does not display private profile fields or LeetCode statistics.</p></section><section><h2>Planned integrations</h2><p>Scheduled LeetCode synchronization is planned. It is not active while a reliable, permitted data source remains unselected. Google sign-in and profile visibility controls require their respective application and Supabase setup.</p></section></article></main>
}
