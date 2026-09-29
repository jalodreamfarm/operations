import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { formatDate, todayEAT } from '../lib/format.js';
import { Badge, DataTable, Field, Modal, useConfirm, useToast } from '../components/ui.jsx';

const DEFAULT_TYPES = ['Vaccination', 'Medication', 'Treatment', 'Other'];
const DEFAULT_PRODUCTS = ['NEWCASTLE IB', 'GUMBOLO 1', 'GUMBOLO 2', 'NEWCASTLE PLAIN', 'FOWL POX', 'DEWORMING', 'DEBEAKING', 'FOWL TYPHOID', 'NEWCASTLE LASOTA', 'GLUCOVIT', 'ASHYTL', 'LIMOVIT', 'MACROLAN', 'COCCITOLTRAZOL', 'OXYVITAMIN', 'LEVACIDE', 'DISINFECTANT'];
const ADD_NEW = '— Add new —';

export default function HealthTab({ actionsRef }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [sched, setSched] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    const [s, e] = await Promise.all([
      supabase.from('vaccination_schedule').select('*').order('week'),
      supabase.from('health_events').select('*').order('date', { ascending: false }),
    ]);
    if (s.error) toast('error', s.error.message); else setSched(s.data || []);
    if (e.error) toast('error', e.error.message); else setEvents(e.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (actionsRef) actionsRef.current = <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Log treatment</button>;
  });

  async function onDelete(row) {
    const ok = await confirm({ title: 'Delete treatment', message: 'Delete this health record?', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const { error } = await supabase.from('health_events').delete().eq('id', row.id);
    if (error) toast('error', error.message);
    else { toast('success', 'Record deleted'); load(); }
  }

  const now = new Date();
  const ym = now.toISOString().slice(0, 7);
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const plannedSet = new Set(sched.filter((s) => s.planned_date).map((s) => String(s.planned_date).slice(0, 10)));
  const todayIso = now.toISOString().slice(0, 10);
  const blanks = [];
  for (let i = 0; i < startDow; i++) blanks.push(<div key={'b' + i} />);
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = ym + '-' + String(d).padStart(2, '0');
    const cls = 'cal-day' + (iso === todayIso ? ' cal-today' : plannedSet.has(iso) ? ' cal-planned' : '');
    days.push(<div key={d} className={cls}>{d}{plannedSet.has(iso) ? ' •' : ''}</div>);
  }

  return (
    <>
      <div className="card pad-4 mb-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 className="u-text-sm u-font-semibold">Calendar — {ym}</h3>
          <span className="u-text-xs u-text-muted">Vaccination planned dates highlighted</span>
        </div>
        <div className="cal-grid">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <div key={d} className="u-text-muted">{d}</div>)}
          {blanks}{days}
        </div>
      </div>
      <h3 className="u-text-sm u-font-semibold mb-3">Vaccination schedule</h3>
      <div className="mb-5">
        {loading ? <div className="skeleton" style={{ height: 100 }} /> : (
          <DataTable columns={[
            { key: 'w', label: 'Week', accessor: (r) => r.week || '—' },
            { key: 'v', label: 'Vaccine', accessor: (r) => r.vaccine },
            { key: 'p', label: 'Planned', accessor: (r) => r.planned_date || '—' },
            { key: 's', label: 'Status', accessor: (r) => {
              const s = r.status || 'Pending';
              return <Badge tone={s === 'Completed' ? 'positive' : s === 'Recurring' ? 'info' : 'caution'}>{s}</Badge>;
            } },
          ]} rows={sched} emptyMessage="No schedule." />
        )}
      </div>
      <h3 className="u-text-sm u-font-semibold mb-3">Treatments & events</h3>
      {loading ? <div className="skeleton" style={{ height: 120 }} /> : (
        <DataTable columns={[
          { key: 'd', label: 'Date', accessor: (r) => formatDate(r.date) },
          { key: 't', label: 'Type', accessor: (r) => r.type },
          { key: 'p', label: 'Product', accessor: (r) => r.product },
          { key: 'n', label: 'Notes', accessor: (r) => r.notes || '—' },
        ]} rows={events}
          actions={[{ id: 'delete', label: 'Delete', danger: true }]}
          onAction={(a, row) => { if (a === 'delete') onDelete(row); }}
          emptyMessage="No treatments logged." />
      )}
      {showForm && <HealthForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </>
  );
}

function HealthForm({ onClose, onSaved }) {
  const toast = useToast();
  const [types, setTypes] = useState(DEFAULT_TYPES);
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [f, setF] = useState({ date: todayEAT(), type: 'Vaccination', customType: '', product: '', customProduct: '', week: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    supabase.from('health_options').select('*').then(({ data }) => {
      if (!data) return;
      const t = data.filter((r) => r.kind === 'Type').map((r) => r.value);
      const p = data.filter((r) => r.kind === 'Product').map((r) => r.value);
      if (t.length) setTypes([...new Set([...DEFAULT_TYPES, ...t])]);
      if (p.length) setProducts([...new Set([...DEFAULT_PRODUCTS, ...p])]);
    });
  }, []);

  async function save() {
    if (!f.date) { toast('error', 'Date is required'); return; }
    let type = f.type, product = f.product;
    if (type === ADD_NEW) {
      type = (f.customType || '').trim();
      if (!type) { toast('error', 'Enter the new type name'); return; }
      await supabase.from('health_options').upsert({ project_id: 'LUK54', kind: 'Type', value: type }, { onConflict: 'project_id,kind,value' });
    }
    if (product === ADD_NEW || !product) {
      product = (f.customProduct || '').trim();
      if (!product) { toast('error', 'Enter the product name'); return; }
      await supabase.from('health_options').upsert({ project_id: 'LUK54', kind: 'Product', value: product }, { onConflict: 'project_id,kind,value' });
    }
    if (!type || !product) { toast('error', 'Type and product required'); return; }
    setBusy(true);
    const { error } = await supabase.from('health_events').insert({
      project_id: 'LUK54', date: f.date, type, product,
      notes: f.notes || '',
    });
    if (!error && type === 'Vaccination' && f.week) {
      await supabase.from('vaccination_schedule')
        .update({ status: 'Completed' })
        .eq('project_id', 'LUK54').eq('week', Number(f.week)).ilike('vaccine', product.split(' ')[0] + '%');
    }
    setBusy(false);
    if (error) toast('error', error.message);
    else { toast('success', 'Treatment logged'); onSaved(); }
  }

  return (
    <Modal title="Log treatment" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Field label="Date" type="date" required value={f.date} onChange={set('date')} />
      <Field label="Type" type="select" required value={f.type} onChange={set('type')} options={[...types, ADD_NEW]} />
      {f.type === ADD_NEW && <Field label="New type (if adding)" hint="Only fill if you chose Add new" value={f.customType} onChange={set('customType')} />}
      <Field label="Product" type="select" required value={f.product} onChange={set('product')} options={['', ...products, ADD_NEW]} />
      {(f.product === ADD_NEW || f.product === '') && <Field label="New product (if adding)" hint="Only fill if you chose Add new" value={f.customProduct} onChange={set('customProduct')} />}
      <Field label="Week" type="number" value={f.week} onChange={set('week')} />
      <Field label="Notes" type="textarea" value={f.notes} onChange={set('notes')} />
    </Modal>
  );
}
