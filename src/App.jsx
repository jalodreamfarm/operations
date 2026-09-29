import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import { ConfirmProvider, Field, ToastProvider, useToast } from './components/ui.jsx';
import DailyTab from './tabs/DailyTab.jsx';
import FlockTab from './tabs/FlockTab.jsx';
import FeedTab from './tabs/FeedTab.jsx';
import SalesTab from './tabs/SalesTab.jsx';
import ExpenditureTab from './tabs/ExpenditureTab.jsx';
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
];

function Shell() {
  const toast = useToast();
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('daily');
  const [auth, setAuth] = useState({ email: '', password: '' });
  const [authErr, setAuthErr] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('farmops_theme') || 'light');
  const [actions, setActions] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('farmops_theme', theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

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
      <div className="login-page">
        <div className="login-visual">
          <div className="login-visual-shade" />
          <div className="login-visual-content">
            <h1 className="login-brand-name">Farm Operations</h1>
            <p className="login-brand-sub">LUK54 Flock — daily farm operations</p>
            <p className="login-brand-desc">Log production, feed, sales, health and staff — from any phone.</p>
          </div>
        </div>
        <div className="login-panel">
          <div className="login-panel-inner">
            <h2 className="login-title">Sign in</h2>
            <p className="login-subtitle">Use your farm account to continue.</p>
            <form onSubmit={login}>
              {authErr && <div className="form-error-global">{authErr}</div>}
              <Field label="Email" type="email" required value={auth.email} onChange={(e) => setAuth({ ...auth, email: e.target.value })} />
              <Field label="Password" type="password" required value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} />
              <button className="login-submit" disabled={authBusy}>{authBusy ? 'Signing in…' : 'Sign in'}</button>
            </form>
            <p className="login-secure">Secure access for your farm operations.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="top-strip">
        <span className="brand">Farm Operations</span>
        <span className="row">
          <button className="btn btn-sm" style={{ background: '#ffffff22', color: '#fff' }}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button className="btn btn-sm" style={{ background: '#ffffff22', color: '#fff' }}
            onClick={() => supabase.auth.signOut()}>Sign out</button>
        </span>
      </div>
      <div className="page">
        <div className="page-header">
          <div>
            <div className="breadcrumb"><span>Main</span><span>/</span><span>Operations</span></div>
            <h1>Operations</h1>
            <p className="u-text-secondary u-text-sm">LUK54 Flock — daily farm operations</p>
          </div>
          <div className="page-header-actions">{actions}</div>
        </div>
        <div className="tabs-bar">
          {TABS.map((t) => (
            <button key={t.id} className={'btn btn-sm ' + (t.id === tab ? 'btn-primary' : 'btn-ghost')}
              onClick={() => { setTab(t.id); }}>{t.label}</button>
          ))}
        </div>
        <div key={tab}>
          {tab === 'daily' && <DailyTab setActions={setActions} />}
          {tab === 'flock' && <FlockTab setActions={setActions} />}
          {tab === 'feed' && <FeedTab setActions={setActions} />}
          {tab === 'sales' && <SalesTab setActions={setActions} />}
          {tab === 'expenditure' && <ExpenditureTab setActions={setActions} />}
          {tab === 'health' && <HealthTab setActions={setActions} />}
          {tab === 'mortality' && <MortalityTab />}
          {tab === 'inventory' && <InventoryTab setActions={setActions} />}
          {tab === 'workers' && <WorkersTab setActions={setActions} />}
          {tab === 'notes' && <NotesTab setActions={setActions} />}
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
