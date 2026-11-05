import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, ChevronRight, Code2, Menu, Plus, Swords, Trophy, Users, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import {
  createPublicArenaTeam,
  checkChallengeSubmission,
  getMyChallengeSlugs,
  getPublicChallengeLeaderboard,
  getPublicChallenges,
  getPublicLeaderboard,
  getPublicProfiles,
  getPublicTeamMembers,
  getPublicTeams,
  getMyTeamIds,
  getMyLeetCodeProfileUrl,
  getMyPublicVisibility,
  joinPublicArenaTeam,
  setMyPublicVisibility,
  setMyLeetCodeProfileUrl,
  submitChallenge,
  validateLeetCodeProfileUrl,
  type PublicArenaResult,
  type PublicChallenge,
  type PublicChallengeLeaderboardEntry,
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
  if (parts[0] === 'account') return { page: 'account' as const }
  if (parts[0] === 'challenges' && parts[1]) return { page: 'challenge' as const, slug: parts[1] }
  if (parts[0] === 'challenges') return { page: 'challenges' as const }
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
  const title = current.page === 'leaderboard' ? 'Public leaderboard' : current.page === 'teams' ? 'Public teams' : current.page === 'player' ? 'Player profile' : current.page === 'account' ? 'Profile settings' : current.page === 'challenges' || current.page === 'challenge' ? 'Coding challenges' : 'Team details'
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`} aria-label="Main sidebar">
      <a className="brand" href="/"><span className="brand-mark"><Swords size={21}/></span><span>leet<span className="brand-accent">wars</span></span><button type="button" className="mobile-close" aria-label="Close navigation" onClick={event => { event.preventDefault(); setMobileNav(false) }}><X size={18}/></button></a>
      <div className="workspace-label">COMMUNITY</div><div className="workspace"><div className="workspace-icon">LW</div><div><strong>Public Arena</strong><small>Browse public data</small></div></div>
      <nav className="nav-list" aria-label="Arena navigation">
        <a className={`nav-item ${current.page === 'leaderboard' ? 'active' : ''}`} aria-current={current.page === 'leaderboard' ? 'page' : undefined} href="/"><Trophy size={18}/><span>Leaderboard</span></a>
        <a className={`nav-item ${current.page === 'teams' || current.page === 'team' ? 'active' : ''}`} aria-current={current.page === 'teams' || current.page === 'team' ? 'page' : undefined} href="/teams"><Users size={18}/><span>Teams</span></a>
        <a className={`nav-item ${current.page === 'challenges' || current.page === 'challenge' ? 'active' : ''}`} aria-current={current.page === 'challenges' || current.page === 'challenge' ? 'page' : undefined} href="/challenges"><Code2 size={18}/><span>Challenges</span></a>
      </nav>
      <div className="sidebar-bottom"><div className="season-card"><div className="season-icon"><Activity size={17}/></div><div><b>LeetWars</b><small>Scheduled sync planned</small></div></div><div className="sidebar-user"><div className="avatar">LW</div><div><b>Public browsing</b><small>No account required</small></div></div></div>
    </aside>
    {mobileNav && <button type="button" className="scrim" aria-label="Close navigation menu" onClick={() => setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar"><button type="button" className="mobile-menu" aria-label="Open navigation" aria-expanded={mobileNav} onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumb">Arena <ChevronRight size={14}/> <span>{title}</span></div><div className="top-actions">{user ? <><a className="secondary-button header-button" href="/account">Profile settings</a><button className="secondary-button header-button" type="button" onClick={signOut}>Sign out</button></> : <button className="primary-button header-button" type="button" disabled={!authReady || !isSupabaseConfigured} onClick={() => void signIn()}>{!isSupabaseConfigured ? 'Sign-in setup needed' : 'Sign in with Google'}</button>}</div></header>
      <div className="content-wrap">
        {actionMessage && <div className="action-message" role="status"><span>{actionMessage}</span><button type="button" className="icon-button" aria-label="Dismiss message" onClick={() => setActionMessage('')}><X size={16}/></button></div>}
        {current.page === 'leaderboard' && <Leaderboard user={user} onSignIn={signIn} onMessage={setActionMessage} />}
        {current.page === 'teams' && <Teams user={user} onSignIn={signIn} onJoin={joinTeam} onCreate={createTeam} joinedTeamIds={joinedTeamIds} />}
        {current.page === 'player' && <PlayerProfile publicId={current.id} />}
        {current.page === 'account' && <AccountSettings user={user} onSignIn={signIn} />}
        {(current.page === 'challenges' || current.page === 'challenge') && <Challenges user={user} slug={current.page === 'challenge' ? current.slug : null} onSignIn={signIn} />}
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
  const challengeLeaderboard = useLoad(getPublicChallengeLeaderboard, 'challenge-leaderboard')
  if (profiles.status === 'loading' || leaderboard.status === 'loading') return <><PageHeading eyebrow="PUBLIC PLAYER" title="Player profile" description="Loading public profile…"/><div className="panel-state" role="status">Loading public profile…</div></>
  if (profiles.status === 'error') return <><PageHeading eyebrow="PUBLIC PLAYER" title="Player profile" description="This profile could not be loaded."/><StateMessage state={profiles} noun="the profile"/></>
  const profile = profiles.data.find(item => item.public_id === publicId)
  if (!profile) return <><PageHeading eyebrow="PUBLIC PLAYER" title="Profile unavailable" description="This profile is not public or could not be found."/><div className="empty-state" role="status">Only profiles opted into public visibility can be viewed.</div><a className="secondary-button inline-link" href="/">Back to leaderboard</a></>
  const stats = leaderboard.status === 'ready' ? leaderboard.data.find(item => item.public_id === publicId) : undefined
  const initials = (profile.display_name || profile.handle).trim().slice(0, 2).toUpperCase()
  const challengeStats = challengeLeaderboard.status === 'ready' ? challengeLeaderboard.data.find(row => row.public_id === publicId) : undefined
  return <><PageHeading eyebrow="PUBLIC PLAYER" title={profile.display_name} description={`@${profile.handle}`}/><section className="profile-card"><div className="profile-avatar">{initials}</div><div><div className="eyebrow">PUBLIC PROFILE</div><h2>{profile.display_name}</h2><p>@{profile.handle}</p></div></section>{profile.leetcode_profile_url && <section className="external-profile-link"><div><strong>LeetCode profile</strong><small>User-provided link · ownership not verified · stats are not synced</small></div><a className="secondary-button" href={profile.leetcode_profile_url} target="_blank" rel="noopener noreferrer">Open profile <ChevronRight size={15}/></a></section>}{leaderboard.status === 'error' ? <StateMessage state={leaderboard} noun="player statistics"/> : stats ? <section className="stats-grid profile-stats"><Stat label="LeetWars XP" value={stats.total_xp.toLocaleString()}/><Stat label="Level" value={String(stats.level)}/><Stat label="Leaderboard rank" value={`#${stats.leaderboard_rank}`}/></section> : <div className="panel-state">LeetWars XP and level are not available for this profile yet.</div>}<section className="challenge-profile-stats"><h2>LeetWars challenge stats</h2>{challengeLeaderboard.status === 'error' ? <StateMessage state={challengeLeaderboard} noun="challenge statistics"/> : challengeStats ? <div className="stats-grid profile-stats"><Stat label="Challenges solved" value={String(challengeStats.challenges_solved)}/><Stat label="Challenge XP" value={challengeStats.challenge_xp.toLocaleString()}/><Stat label="Challenge rank" value={`#${challengeStats.challenge_rank}`}/></div> : challengeLeaderboard.status === 'ready' ? <div className="panel-state">No accepted challenge solutions are listed for this public profile yet.</div> : <div className="panel-state" role="status">Loading challenge stats…</div>}</section><div className="disclaimer"><Activity size={14}/> LeetCode statistics and activity history are not available in this release.</div></>
}

function AccountSettings({ user, onSignIn }: { user: User | null; onSignIn: () => Promise<void> }) {
  const [profileUrl, setProfileUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!user) {
      setProfileUrl('')
      setLoading(false)
      return () => { active = false }
    }
    setLoading(true)
    void getMyLeetCodeProfileUrl(user.id).then(result => {
      if (!active) return
      setLoading(false)
      if (result.error) setError(result.error)
      else setProfileUrl(result.data ?? '')
    })
    return () => { active = false }
  }, [user?.id])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validated = validateLeetCodeProfileUrl(profileUrl)
    if (validated.error) {
      setError(validated.error)
      setMessage('')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    const result = await setMyLeetCodeProfileUrl(validated.url)
    setSaving(false)
    if (result.error) setError(result.error)
    else {
      setProfileUrl(result.data ?? '')
      setMessage(validated.url ? 'Your profile link has been saved.' : 'Your profile link has been removed.')
    }
  }

  return <>
    <PageHeading eyebrow="ACCOUNT" title="Profile settings" description="Add an optional link to your LeetCode profile."/>
    {!user ? <section className="panel account-panel"><p>Sign in to manage your profile link.</p><button className="primary-button" type="button" onClick={() => void onSignIn()}>Sign in with Google</button></section> : <section className="panel account-panel"><form onSubmit={event => void save(event)}><label htmlFor="leetcode-profile-url">LEETCODE PROFILE URL <span>OPTIONAL</span></label><input className="account-input" id="leetcode-profile-url" type="url" inputMode="url" autoComplete="url" placeholder="https://leetcode.com/u/yourname/" value={profileUrl} maxLength={200} onChange={event => { setProfileUrl(event.target.value); setError(''); setMessage('') }} disabled={loading || saving}/><p className="account-help">This link is not verified and does not sync LeetCode statistics. It appears on your public LeetWars profile only while your profile is public.</p>{error && <p className="field-error" role="alert">{error}</p>}{message && <p className="account-success" role="status">{message}</p>}<button className="primary-button" type="submit" disabled={loading || saving}>{loading ? 'Loading…' : saving ? 'Saving…' : 'Save profile link'}</button></form></section>}
  </>
}

function Challenges({ user, slug, onSignIn }: { user: User | null; slug: string | null; onSignIn: () => Promise<void> }) {
  const catalog = useLoad(getPublicChallenges, 'challenge-catalog')
  const [leaderboardRefresh, setLeaderboardRefresh] = useState(0)
  const leaderboard = useLoad(getPublicChallengeLeaderboard, `challenge-leaderboard-${leaderboardRefresh}`)
  const [completed, setCompleted] = useState<string[]>([])
  const [language, setLanguage] = useState<'javascript' | 'python'>('javascript')
  const [sourceCode, setSourceCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pendingSubmissionId, setPendingSubmissionId] = useState<string | null>(null)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const challenge = catalog.status === 'ready' ? catalog.data.find(item => item.slug === slug) ?? (!slug ? catalog.data[0] : undefined) : undefined

  useEffect(() => {
    if (!user) { setCompleted([]); return }
    let active = true
    void getMyChallengeSlugs(user.id).then(slugs => { if (active) setCompleted(slugs) })
    return () => { active = false }
  }, [user?.id])

  useEffect(() => {
    if (challenge) setSourceCode(language === 'javascript' ? challenge.starter_javascript : challenge.starter_python)
    setResult('')
    setError('')
  }, [challenge?.slug, language])

  const run = async () => {
    if (!user) { await onSignIn(); return }
    if (!challenge) return
    setSubmitting(true)
    setError('')
    let submissionId = pendingSubmissionId
    if (!submissionId) {
      setResult('Submitting to the LeetWars judge…')
      const started = await submitChallenge(challenge.slug, language, sourceCode)
      if (started.error !== null || started.data === null) {
        setSubmitting(false)
        setResult('')
        setError(started.error)
        return
      }
      submissionId = started.data
      setPendingSubmissionId(submissionId)
    }
    for (let attempt = 0; attempt < 40; attempt++) {
      await new Promise(resolve => window.setTimeout(resolve, 1500))
      const checked = await checkChallengeSubmission(submissionId)
      if (checked.error !== null || checked.data === null) {
        setSubmitting(false)
        setResult('')
        setError(checked.error)
        return
      }
      if (checked.data.status === 'queued' || checked.data.status === 'processing') {
        setResult(checked.data.status === 'queued' ? 'Waiting in the judge queue…' : 'Running your code…')
        continue
      }
      setSubmitting(false)
      setPendingSubmissionId(null)
      if (checked.data.status === 'accepted') {
        setCompleted(values => values.includes(challenge.slug) ? values : [...values, challenge.slug])
        setLeaderboardRefresh(value => value + 1)
        setResult(checked.data.xp_awarded > 0 ? `Accepted — +${checked.data.xp_awarded} LeetWars challenge XP.` : 'Accepted — you already earned XP for this challenge.')
      } else {
        const labels: Record<string, string> = { wrong_answer: 'Some test cases did not pass.', compile_error: 'Your code did not compile.', runtime_error: 'Your code stopped with a runtime error.', time_limit: 'Your code exceeded the time limit.', judge_error: 'The judge could not finish this run.' }
        setResult(labels[checked.data.status] ?? 'The judge could not finish this run.')
      }
      return
    }
    setSubmitting(false)
    setResult('The judge is taking longer than expected. Check this same submission again after a short wait.')
  }

  return <>
    <PageHeading eyebrow="LEETWARS PRACTICE" title="Coding challenges" description="Solve original LeetWars challenges. Only accepted judge results earn challenge XP."/>
    <StateMessage state={catalog} noun="the challenge catalog"/>
    {catalog.status === 'ready' && catalog.data.length === 0 && <div className="empty-state">No challenges have been published yet.</div>}
    {catalog.status === 'ready' && challenge && <div className="challenge-layout"><section className="panel challenge-panel"><div className="challenge-title"><div><span className={`difficulty-tag ${challenge.difficulty}`}>{challenge.difficulty}</span><h2>{challenge.title}</h2></div><span className="challenge-reward">{challenge.xp_reward} XP</span></div><p className="challenge-description">{challenge.description}</p><h3>Input</h3><p>{challenge.input_format}</p><h3>Output</h3><p>{challenge.output_format}</p><div className="sample-grid"><div><h3>Sample input</h3><pre>{challenge.sample_input}</pre></div><div><h3>Expected output</h3><pre>{challenge.sample_output}</pre></div></div><p className="account-help">Submissions run in a sandbox. XP is awarded once per challenge. Your challenge stats appear publicly only if your profile is public.</p><div className="challenge-catalog">{catalog.data.map(item => <a className={item.slug === challenge.slug ? 'challenge-catalog-item selected' : 'challenge-catalog-item'} key={item.slug} href={`/challenges/${encodeURIComponent(item.slug)}`}><span>{item.title}</span><small>{item.difficulty} · {item.xp_reward} XP{completed.includes(item.slug) ? ' · solved' : ''}</small></a>)}</div></section><section className="panel challenge-editor"><div className="editor-toolbar"><label htmlFor="challenge-language">LANGUAGE</label><select id="challenge-language" value={language} disabled={submitting || pendingSubmissionId !== null} onChange={event => setLanguage(event.target.value as 'javascript' | 'python')}><option value="javascript">JavaScript (Node.js)</option><option value="python">Python 3</option></select></div><label className="sr-only" htmlFor="challenge-source">Your solution</label><textarea id="challenge-source" spellCheck={false} value={sourceCode} maxLength={16_000} disabled={submitting || pendingSubmissionId !== null} onChange={event => setSourceCode(event.target.value)} /><button className="primary-button" type="button" disabled={submitting || (!pendingSubmissionId && !sourceCode.trim())} onClick={() => void run()}>{submitting ? 'Checking…' : pendingSubmissionId ? 'Check result' : user ? 'Submit solution' : 'Sign in to submit'}</button>{error && <p className="field-error" role="alert">{error}</p>}{result && <p className="judge-result" role="status">{result}</p>}</section></div>}
    {slug && catalog.status === 'ready' && !challenge && <div className="empty-state" role="status">This challenge is unavailable. <a href="/challenges">Browse challenges</a></div>}
    <section className="panel leaderboard-panel challenge-board"><div className="panel-heading"><div><div className="title-with-icon"><Trophy size={18}/><h2>Challenge leaderboard</h2></div><p>Ranked by XP from accepted LeetWars challenges.</p></div></div><StateMessage state={leaderboard} noun="the challenge leaderboard"/>{leaderboard.status === 'ready' && (leaderboard.data.length ? <div className="table-scroll"><table><thead><tr><th scope="col">RANK</th><th scope="col">PLAYER</th><th scope="col">CHALLENGES</th><th scope="col">CHALLENGE XP</th></tr></thead><tbody>{leaderboard.data.map(row => <ChallengeLeaderboardRow key={row.public_id} row={row}/>)}</tbody></table></div> : <div className="empty-state" role="status">No public challenge completions yet.</div>)}</section>
    <div className="disclaimer"><Activity size={14}/> LeetWars challenge XP is earned here. LeetCode profile links are not verified, and LeetCode statistics do not sync.</div>
  </>
}

function ChallengeLeaderboardRow({ row }: { row: PublicChallengeLeaderboardEntry }) {
  return <tr><td><span className={`rank rank-${row.challenge_rank}`}>{row.challenge_rank}</span></td><td><a className="warrior-cell player-link" href={`/players/${encodeURIComponent(row.public_id)}`}><span className="avatar">{row.display_name.slice(0, 2).toUpperCase()}</span><span><b>{row.display_name}</b><small>@{row.handle}</small></span></a></td><td>{row.challenges_solved}</td><td><strong>{row.challenge_xp.toLocaleString()}</strong></td></tr>
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
