import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';

const TABS = ['daily', 'flock', 'feed', 'sales', 'health', 'mortality', 'inventory', 'workers', 'notes'];
const TRAY = 30;
const today = () => new Date().toISOString().slice(0, 10);
const ugx = (n) => 'UGX ' + Number(n || 0).toLocaleString('en-UG');

function useList(table, orderCol = 'date') {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  async function load() {
    setLoading(true);
    setErr('');
    const { data, error } = await supabase.from(table).select('*').order(orderCol, { ascending: false }).limit(100);
    if (error) setErr(error.message);
    else setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [table]);
  return { rows, loading, err, reload: load };
}

async function remove(table, id, reload) {
  if (!confirm('Delete this record?')) return;
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) alert(error.message);
  else reload();
}

function Field({ label, ...p }) {
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
      <span className="muted">{label}</span>
      <input {...p} />
    </label>
  );
}

/* ── Daily ── */
function Daily() {
  const { rows, loading, err, reload } = useList('daily_production');
  const [f, setF] = useState({ date: today(), section: 'Combined', opening_birds: '', mortality: 0, eggs_trays: 0, feed_issued_kg: 0, notes: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const birds = Number(f.opening_birds) || 0;
  const pct = birds > 0 && Number(f.eggs_trays) > 0 ? ((Number(f.eggs_trays) * TRAY) / birds * 100).toFixed(1) + '%' : '—';
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    const opening = Number(f.opening_birds) || 0;
    const mort = Number(f.mortality) || 0;
    const trays = Number(f.eggs_trays) || 0;
    const payload = {
      project_id: 'LUK54',
      date: f.date,
      section: f.section || 'Combined',
      opening_birds: opening,
      mortality: mort,
      closing_birds: opening - mort,
      eggs_trays: trays,
      eggs_collected: trays * TRAY,
      feed_issued_kg: Number(f.feed_issued_kg) || 0,
      notes: f.notes || '',
    };
    const { error } = await supabase.from('daily_production').insert(payload);
    setBusy(false);
    if (error) alert(error.message);
    else { setF({ date: today(), section: 'Combined', opening_birds: '', mortality: 0, eggs_trays: 0, feed_issued_kg: 0, notes: '' }); reload(); }
  }
  return (
    <>
      <div className="card"><div className="muted">Latest production</div>
        <div className="kpi">{rows[0] ? ((rows[0].eggs_collected / Math.max(1, rows[0].opening_birds)) * 100).toFixed(1) + '%' : '—'}</div>
        <div className="muted">Target 88–92% · ≥85% commercial</div></div>
      <form className="card grid" onSubmit={save}>
        <div className="row2"><Field label="Date" type="date" value={f.date} onChange={set('date')} required />
          <Field label="Section" value={f.section} onChange={set('section')} /></div>
        <div className="row2"><Field label="Opening birds" type="number" value={f.opening_birds} onChange={set('opening_birds')} required />
          <Field label="Mortality" type="number" value={f.mortality} onChange={set('mortality')} /></div>
        <div className="row2"><Field label="Eggs (trays)" type="number" value={f.eggs_trays} onChange={set('eggs_trays')} />
          <Field label="Feed issued (kg)" type="number" value={f.feed_issued_kg} onChange={set('feed_issued_kg')} /></div>
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}><span className="muted">Notes</span><textarea value={f.notes} onChange={set('notes')} rows={2} /></label>
        <div className="muted">Production: <b>{pct}</b> (auto)</div>
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Log day'}</button>
      </form>
      <div className="card">{loading ? 'Loading…' : err ? <div className="err">{err}</div> :
        <table><thead><tr><th>Date</th><th>Open</th><th>Mort</th><th>Close</th><th>Trays</th><th>Prod%</th><th></th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}><td>{r.date}</td><td>{r.opening_birds}</td><td>{r.mortality}</td><td>{r.closing_birds}</td>
              <td>{r.eggs_trays}</td><td>{r.opening_birds ? ((r.eggs_collected / r.opening_birds) * 100).toFixed(1) + '%' : '—'}</td>
              <td><button className="btn-ghost btn" style={{ padding: '4px 8px' }} onClick={() => remove('daily_production', r.id, reload)}>Del</button></td></tr>
          ))}</tbody></table>}</div>
    </>
  );
}

/* ── Flock + sections ── */
function Flock() {
  const ev = useList('flock_events');
  const [secs, setSecs] = useState([]);
  const [f, setF] = useState({ date: today(), event_type: 'Stocking', quantity: '', notes: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function loadSecs() {
    const { data } = await supabase.from('flock_sections').select('*').order('section_id');
    setSecs(data || []);
  }
  useEffect(() => { loadSecs(); }, []);
  const total = secs.reduce((s, r) => s + Number(r.bird_count || 0), 0);
  async function saveSections() {
    for (const s of secs) {
      await supabase.from('flock_sections').update({ bird_count: Number(s.bird_count) || 0 }).eq('id', s.id);
    }
    alert('Sections saved — total ' + total); loadSecs();
  }
  async function saveEv(e) {
    e.preventDefault();
    const { error } = await supabase.from('flock_events').insert({ project_id: 'LUK54', date: f.date, event_type: f.event_type, quantity: Number(f.quantity) || 0, notes: f.notes });
    if (error) alert(error.message); else { setF({ date: today(), event_type: 'Stocking', quantity: '', notes: '' }); ev.reload(); }
  }
  return (
    <>
      <div className="card"><div className="muted">Total birds (all sections)</div><div className="kpi">{total.toLocaleString()}</div>
        {secs.map((s) => (
          <div className="row2" key={s.id} style={{ marginTop: 6 }}>
            <Field label={s.label || s.section_id} value={s.label || s.section_id} onChange={(e) => setSecs(secs.map((x) => x.id === s.id ? { ...x, label: e.target.value } : x))} />
            <Field label="Birds" type="number" value={s.bird_count} onChange={(e) => setSecs(secs.map((x) => x.id === s.id ? { ...x, bird_count: e.target.value } : x))} />
          </div>
        ))}
        <button className="btn" style={{ marginTop: 8 }} onClick={saveSections}>Save sections</button></div>
      <form className="card grid" onSubmit={saveEv}>
        <div className="row2"><Field label="Date" type="date" value={f.date} onChange={set('date')} />
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}><span className="muted">Event</span>
            <select value={f.event_type} onChange={set('event_type')}>{['Stocking', 'Transfer', 'Culling', 'Sale of birds', 'Other'].map((o) => <option key={o}>{o}</option>)}</select></label></div>
        <Field label="Quantity" type="number" value={f.quantity} onChange={set('quantity')} required />
        <button className="btn">Save event</button></form>
      <div className="card"><table><thead><tr><th>Date</th><th>Event</th><th>Qty</th><th></th></tr></thead>
        <tbody>{ev.rows.map((r) => <tr key={r.id}><td>{r.date}</td><td>{r.event_type}</td><td>{r.quantity}</td><td><button className="btn-ghost btn" style={{ padding: '4px 8px' }} onClick={() => remove('flock_events', r.id, ev.reload)}>Del</button></td></tr>)}</tbody></table></div>
    </>
  );
}

/* ── Feed ── */
function Feed() {
  const purch = useList('feed_purchases');
  const inv = useList('feed_inventory', 'product');
  const mix = useList('weekly_feed_mix', 'week_start');
  const [f, setF] = useState({ date: today(), product: 'Brand', qty_kg: '', unit_cost: '', supplier: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save(e) {
    e.preventDefault();
    const qty = Number(f.qty_kg) || 0, unit = Number(f.unit_cost) || 0;
    const { error } = await supabase.from('feed_purchases').insert({ project_id: 'LUK54', date: f.date, product: f.product, qty_kg: qty, unit_cost: unit, total_cost: qty * unit, supplier: f.supplier });
    if (error) alert(error.message); else { purch.reload(); inv.reload(); }
  }
  return (
    <>
      <div className="card"><div className="muted">Stock</div>
        <table><thead><tr><th>Product</th><th>kg</th><th>Unit</th></tr></thead>
          <tbody>{inv.rows.map((r) => <tr key={r.id}><td>{r.product}</td><td>{r.closing_stock}</td><td>{ugx(r.unit_cost)}</td></tr>)}</tbody></table></div>
      <form className="card grid" onSubmit={save}>
        <div className="row2"><Field label="Date" type="date" value={f.date} onChange={set('date')} />
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}><span className="muted">Product</span>
            <select value={f.product} onChange={set('product')}>{['Brand', 'Concentrate', 'Lime powder', 'Limestone', 'Soya', 'Sunflower', 'Broken', 'Maize', 'Others'].map((o) => <option key={o}>{o}</option>)}</select></label></div>
        <div className="row2"><Field label="Qty (kg)" type="number" value={f.qty_kg} onChange={set('qty_kg')} required />
          <Field label="Unit cost" type="number" value={f.unit_cost} onChange={set('unit_cost')} required /></div>
        <Field label="Supplier" value={f.supplier} onChange={set('supplier')} />
        <button className="btn">Record purchase</button></form>
      <div className="card"><div className="muted">Purchases</div>
        <table><thead><tr><th>Date</th><th>Product</th><th>kg</th><th>Total</th><th></th></tr></thead>
          <tbody>{purch.rows.map((r) => <tr key={r.id}><td>{r.date}</td><td>{r.product}</td><td>{r.qty_kg}</td><td>{ugx(r.total_cost)}</td><td><button className="btn-ghost btn" style={{ padding: '4px 8px' }} onClick={() => remove('feed_purchases', r.id, purch.reload)}>Del</button></td></tr>)}</tbody></table></div>
      <div className="card"><div className="muted">Weekly mixes ({mix.rows.length})</div>
        <table><thead><tr><th>Week</th><th>Total kg</th></tr></thead>
          <tbody>{mix.rows.map((r) => <tr key={r.id}><td>{r.week_start}</td><td>{r.total_kg}</td></tr>)}</tbody></table></div>
    </>
  );
}

/* ── Sales ── */
function Sales() {
  const { rows, loading, err, reload } = useList('sales');
  const [f, setF] = useState({ date: today(), customer: '', quantity_trays: '', unit_price: '11000', payment_status: 'Cash', notes: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const total = rows.reduce((s, r) => s + Number(r.total_revenue || 0), 0);
  async function save(e) {
    e.preventDefault();
    const trays = Number(f.quantity_trays) || 0, price = Number(f.unit_price) || 0;
    const { error } = await supabase.from('sales').insert({ project_id: 'LUK54', date: f.date, customer: f.customer, quantity_trays: trays, quantity_eggs: trays * TRAY, unit_price: price, total_revenue: trays * price, payment_status: f.payment_status, notes: f.notes });
    if (error) alert(error.message); else reload();
  }
  return (
    <>
      <div className="card"><div className="muted">Total revenue</div><div className="kpi">{ugx(total)}</div></div>
      <form className="card grid" onSubmit={save}>
        <div className="row2"><Field label="Date" type="date" value={f.date} onChange={set('date')} />
          <Field label="Customer" value={f.customer} onChange={set('customer')} /></div>
        <div className="row2"><Field label="Trays" type="number" value={f.quantity_trays} onChange={set('quantity_trays')} required />
          <Field label="Price/tray" type="number" value={f.unit_price} onChange={set('unit_price')} required /></div>
        <button className="btn">Record sale</button></form>
      <div className="card">{loading ? 'Loading…' : err ? <div className="err">{err}</div> :
        <table><thead><tr><th>Date</th><th>Cust</th><th>Trays</th><th>Rev</th><th></th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td>{r.date}</td><td>{r.customer || '—'}</td><td>{r.quantity_trays}</td><td>{ugx(r.total_revenue)}</td><td><button className="btn-ghost btn" style={{ padding: '4px 8px' }} onClick={() => remove('sales', r.id, reload)}>Del</button></td></tr>)}</tbody></table>}</div>
    </>
  );
}

/* ── Health ── */
function Health() {
  const ev = useList('health_events');
  const sched = useList('vaccination_schedule', 'week');
  const [f, setF] = useState({ date: today(), type: 'Vaccination', product: '', notes: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save(e) {
    e.preventDefault();
    const { error } = await supabase.from('health_events').insert({ project_id: 'LUK54', date: f.date, type: f.type, product: f.product, notes: f.notes });
    if (error) alert(error.message); else ev.reload();
  }
  return (
    <>
      <div className="card"><div className="muted">Vaccination schedule</div>
        <table><thead><tr><th>Wk</th><th>Vaccine</th><th>Planned</th><th>Status</th></tr></thead>
          <tbody>{sched.rows.map((r) => <tr key={r.id}><td>{r.week}</td><td>{r.vaccine}</td><td>{r.planned_date || '—'}</td><td>{r.status}</td></tr>)}</tbody></table></div>
      <form className="card grid" onSubmit={save}>
        <div className="row2"><Field label="Date" type="date" value={f.date} onChange={set('date')} />
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}><span className="muted">Type</span>
            <select value={f.type} onChange={set('type')}>{['Vaccination', 'Medication', 'Treatment', 'Other'].map((o) => <option key={o}>{o}</option>)}</select></label></div>
        <Field label="Product" value={f.product} onChange={set('product')} required placeholder="e.g. NEWCASTLE LASOTA" />
        <button className="btn">Log treatment</button></form>
      <div className="card"><table><thead><tr><th>Date</th><th>Type</th><th>Product</th><th></th></tr></thead>
        <tbody>{ev.rows.map((r) => <tr key={r.id}><td>{r.date}</td><td>{r.type}</td><td>{r.product}</td><td><button className="btn-ghost btn" style={{ padding: '4px 8px' }} onClick={() => remove('health_events', r.id, ev.reload)}>Del</button></td></tr>)}</tbody></table></div>
    </>
  );
}

function Mortality() {
  const { rows } = useList('daily_production');
  const list = rows.filter((r) => Number(r.mortality) > 0);
  return <div className="card"><table><thead><tr><th>Date</th><th>Deaths</th><th>Rate%</th></tr></thead>
    <tbody>{list.map((r) => <tr key={r.id}><td>{r.date}</td><td>{r.mortality}</td><td>{r.opening_birds ? ((r.mortality / r.opening_birds) * 100).toFixed(1) : '—'}</td></tr>)}</tbody></table>
    {!list.length && <div className="muted">No mortality recorded.</div>}</div>;
}

function Inventory() {
  const { rows, reload } = useList('inventory', 'name');
  const [f, setF] = useState({ name: '', quantity: '', unit: 'pcs' });
  async function save(e) {
    e.preventDefault();
    const { error } = await supabase.from('inventory').upsert({ project_id: 'LUK54', name: f.name, quantity: Number(f.quantity) || 0, unit: f.unit }, { onConflict: 'project_id,name' });
    if (error) alert(error.message); else { setF({ name: '', quantity: '', unit: 'pcs' }); reload(); }
  }
  return (<><form className="card grid" onSubmit={save}>
    <div className="row2"><Field label="Item" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
      <Field label="Qty" type="number" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} required /></div>
    <button className="btn">Adjust stock</button></form>
    <div className="card"><table><thead><tr><th>Item</th><th>Qty</th><th></th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.quantity} {r.unit}</td><td><button className="btn-ghost btn" style={{ padding: '4px 8px' }} onClick={() => remove('inventory', r.id, reload)}>Del</button></td></tr>)}</tbody></table></div></>);
}

function Workers() {
  const { rows, reload } = useList('workers', 'name');
  const [f, setF] = useState({ name: '', payroll: 0, bonus: 0, advance: 0, notes: '' });
  async function save(e) {
    e.preventDefault();
    const { error } = await supabase.from('workers').insert({ project_id: 'LUK54', ...f, payroll: Number(f.payroll) || 0, bonus: Number(f.bonus) || 0, advance: Number(f.advance) || 0 });
    if (error) alert(error.message); else { setF({ name: '', payroll: 0, bonus: 0, advance: 0, notes: '' }); reload(); }
  }
  return (<><form className="card grid" onSubmit={save}>
    <Field label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
    <div className="row2"><Field label="Payroll" type="number" value={f.payroll} onChange={(e) => setF({ ...f, payroll: e.target.value })} />
      <Field label="Advance" type="number" value={f.advance} onChange={(e) => setF({ ...f, advance: e.target.value })} /></div>
    <button className="btn">Save worker</button></form>
    <div className="card"><table><thead><tr><th>Name</th><th>Payroll</th><th>Advance</th><th></th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id}><td>{r.name}</td><td>{ugx(r.payroll)}</td><td>{ugx(r.advance)}</td><td><button className="btn-ghost btn" style={{ padding: '4px 8px' }} onClick={() => remove('workers', r.id, reload)}>Del</button></td></tr>)}</tbody></table></div></>);
}

function Notes() {
  const { rows, reload } = useList('staff_notes');
  const [f, setF] = useState({ content: '', category: 'General' });
  async function save(e) {
    e.preventDefault();
    const { error } = await supabase.from('staff_notes').insert({ project_id: 'LUK54', date: today(), content: f.content, category: f.category });
    if (error) alert(error.message); else { setF({ content: '', category: 'General' }); reload(); }
  }
  return (<><form className="card grid" onSubmit={save}>
    <Field label="Note" value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} required />
    <button className="btn">Add note</button></form>
    <div className="card"><table><thead><tr><th>Date</th><th>Note</th><th></th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id}><td>{r.date}</td><td>{r.content}</td><td><button className="btn-ghost btn" style={{ padding: '4px 8px' }} onClick={() => remove('staff_notes', r.id, reload)}>Del</button></td></tr>)}</tbody></table></div></>);
}

export default function App() {
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('daily');
  const [auth, setAuth] = useState({ email: '', password: '' });
  const [authErr, setAuthErr] = useState('');
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  async function login(e) {
    e.preventDefault();
    setAuthErr('');
    const { error } = await supabase.auth.signInWithPassword(auth);
    if (error) setAuthErr(error.message);
  }
  if (!session) {
    return (<main><form className="card login grid" onSubmit={login}>
      <h2 style={{ margin: 0 }}>Farm Operations</h2>
      <div className="muted">Sign in with your farm account (create users in Supabase → Authentication).</div>
      {authErr && <div className="err">{authErr}</div>}
      <Field label="Email" type="email" value={auth.email} onChange={(e) => setAuth({ ...auth, email: e.target.value })} required />
      <Field label="Password" type="password" value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} required />
      <button className="btn">Sign in</button></form></main>);
  }
  return (<>
    <header className="top"><h1>Farm Operations</h1>
      <button onClick={() => supabase.auth.signOut()}>Sign out</button></header>
    <main>
      <div className="tabs">{TABS.map((t) => <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === 'daily' && <Daily />}{tab === 'flock' && <Flock />}{tab === 'feed' && <Feed />}
      {tab === 'sales' && <Sales />}{tab === 'health' && <Health />}{tab === 'mortality' && <Mortality />}
      {tab === 'inventory' && <Inventory />}{tab === 'workers' && <Workers />}{tab === 'notes' && <Notes />}
    </main></>);
}
