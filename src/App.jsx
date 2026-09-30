import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import { ConfirmProvider, Field, ToastProvider, useToast } from './components/ui.jsx';
import DailyTab from './tabs/DailyTab.jsx';
import FlockTab from './tabs/FlockTab.jsx';
import FeedTab from './tabs/FeedTab.jsx';
import SalesTab from './tabs/SalesTab.jsx';
import ExpenditureTab from './tabs/ExpenditureTab.jsx';
import ReportsTab from './tabs/ReportsTab.jsx';
import HealthTab from './tabs/HealthTab.jsx';
import { InventoryTab, MortalityTab, NotesTab, WorkersTab } from './tabs/OtherTabs.jsx';

const TABS = [
  { id: 'daily', label: 'Daily Log' },
  { id: 'flock', label: 'Flock' },
  { id: 'feed', label: 'Feed' },
  { id: 'sales', label: 'Sales' },
  { id: 'expenditure', label: 'Expenditure' },
  { id: 'health', label: 'Health & Vaccination' },
  { id: 'mortality', label: 'Mortality' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'workers', label: 'Workers' },
  { id: 'notes', label: 'Staff Notes' },
  { id: 'reports', label: 'Reports' },
];

function Shell() {
  const toast = useToast();
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('daily');
  const [auth, setAuth] = useState({ email: '', password: '' });
  const [authErr, setAuthErr] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [actions, setActions] = useState(null);
  const [profile, setProfile] = useState(null);
  const role = profile?.role || 'admin'; // default open until profile loads

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    try { localStorage.setItem('farmops_theme', 'dark'); } catch (e) {}
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfile(uid) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    setProfile(data || null);
    if (data?.role === 'vet') setTab('daily');
  }

  const visibleTabs = role === 'vet' ? TABS.filter((t) => t.id === 'daily' || t.id === 'health') : TABS;

  // header actions are owned by the active tab (cleared on unmount — no ghost buttons)

  async function login(e) {
    e.preventDefault();
    setAuthErr('');
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithPassword(auth);
    setAuthBusy(false);
    if (error) setAuthErr(error.message);
    else toast('success', 'Signed in');
  }

  if (!session) {
    return (
      <div className="jalo-login">
        <div className="jalo-card">
          <div className="jalo-brand">
            <div className="jalo-shade" />
            <div className="jalo-brand-inner">
              <img src="/logo.png" alt="Jalo Dream Farm — Feathers to Fortune" className="jalo-logo" />
              <p>Feathers to Fortune — daily records for a thriving flock.</p>
            </div>
          </div>
          <div className="jalo-form">
            <h2>Welcome back</h2>
            <p className="jalo-sub">Sign in to continue to your farm</p>
            <form onSubmit={login}>
              {authErr && <div className="form-error-global">{authErr}</div>}
              <label className="jalo-label">Email</label>
              <input className="jalo-input" type="email" required placeholder="you@farm.com"
                value={auth.email} onChange={(e) => setAuth({ ...auth, email: e.target.value })} />
              <label className="jalo-label">Password</label>
              <div className="jalo-password">
                <input className="jalo-input" type={showPw ? 'text' : 'password'} required placeholder="••••••••"
                  value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} />
                <button type="button" className="jalo-eye" aria-label={showPw ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPw(!showPw)}>
                  {showPw ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="23" x2="23" y2="1" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              <button className="jalo-submit" disabled={authBusy}>{authBusy ? 'Signing in…' : 'Sign in'}</button>
            </form>
            <p className="jalo-secure">🔒 Encrypted &nbsp;•&nbsp; Role-based access</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="top-strip">
        <span className="brand" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/icon-192.png" alt="" style={{ width: 22, height: 22, borderRadius: 6 }} />
          Jalo Dream Farm
          {role === 'vet' && <span className="badge badge-info" style={{ marginLeft: 2 }}>Vet</span>}
        </span>
        <span className="row">
          <button className="btn btn-sm" style={{ background: '#ffffff22', color: '#fff' }}
            onClick={() => supabase.auth.signOut()}>Sign out</button>
        </span>
      </div>
      <div className="page">
        <div className="page-header">
          <div>
            <div className="breadcrumb"><span>Main</span><span>/</span><span>Operations</span></div>
            <h1>Operations</h1>
            <p className="u-text-secondary u-text-sm">Daily farm operations</p>
          </div>
          <div className="page-header-actions">{actions}</div>
        </div>
        <div className="tabs-bar">
          {visibleTabs.map((t) => (
            <button key={t.id} className={'btn btn-sm ' + (t.id === tab ? 'btn-primary' : 'btn-ghost')}
              onClick={() => { setActions(null); setTab(t.id); }}>{t.label}</button>
          ))}
        </div>
        {role === 'vet' && (
          <div className="card pad-3 mb-4"><span className="u-text-xs u-text-muted">Vet access — Daily Log is read-only; Health & Vaccination is fully editable.</span></div>
        )}
        <div key={tab}>
          {tab === 'daily' && <DailyTab setActions={setActions} writable={role !== 'vet'} />}
          {tab === 'flock' && <FlockTab setActions={setActions} />}
          {tab === 'feed' && <FeedTab setActions={setActions} />}
          {tab === 'sales' && <SalesTab setActions={setActions} />}
          {tab === 'expenditure' && <ExpenditureTab setActions={setActions} />}
          {tab === 'health' && <HealthTab setActions={setActions} />}
          {tab === 'mortality' && <MortalityTab />}
          {tab === 'inventory' && <InventoryTab setActions={setActions} />}
          {tab === 'workers' && <WorkersTab setActions={setActions} />}
          {tab === 'notes' && <NotesTab setActions={setActions} />}
          {tab === 'reports' && <ReportsTab setActions={setActions} />}
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Shell />
      </ConfirmProvider>
    </ToastProvider>
  );
}
