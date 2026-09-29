import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { formatDate, formatUGX, todayEAT } from '../lib/format.js';
import { DataTable, Field, Modal, useConfirm, useToast } from '../components/ui.jsx';

const EXPENSE_CATEGORIES = [
  'Booking', 'Brooder', 'Feeds', 'Medication', 'Vaccination',
  'Labour', 'Utilities', 'Transport', 'Maintenance', 'Equipment', 'Other',
];

export default function ExpenditureTab({ setActions }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    if (error) toast('error', error.message);
    else setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    setActions(<button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Record expense</button>);
    return () => setActions(null);
  }, []);

  async function onDelete(row) {
    if (!row.id) { toast('error', 'Cannot delete: missing id'); return; }
    const ok = await confirm({ title: 'Delete expense', message: 'Delete this expense? This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const { error } = await supabase.from('expenses').delete().eq('id', row.id);
    if (error) toast('error', error.message);
    else { toast('success', 'Deleted'); load(); }
  }

  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const byCat = {};
  rows.forEach((r) => { byCat[r.category] = (byCat[r.category] || 0) + Number(r.amount || 0); });
  const catLines = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <div className="kpi-grid mb-4" style={{ maxWidth: 640 }}>
        <div className="card kpi-card">
          <div className="kpi-label">Total expenses</div>
          <div className="kpi-value">{formatUGX(total)}</div>
        </div>
        {catLines.slice(0, 3).map(([c, sum]) => (
          <div className="card kpi-card" key={c}>
            <div className="kpi-label">{c}</div>
            <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{formatUGX(sum)}</div>
          </div>
        ))}
      </div>
      {loading ? <div className="skeleton" style={{ height: 140 }} /> : (
        <DataTable
          columns={[
            { key: 'date', label: 'Date', accessor: (r) => formatDate(r.date) },
            { key: 'cat', label: 'Category', accessor: (r) => r.category },
            { key: 'sub', label: 'Detail', accessor: (r) => r.sub_category || '—' },
            { key: 'amt', label: 'Amount', accessor: (r) => formatUGX(r.amount) },
            { key: 'sup', label: 'Supplier', accessor: (r) => r.supplier || '—' },
          ]}
          rows={rows}
          actions={[{ id: 'delete', label: 'Delete', danger: true }]}
          onAction={(a, row) => { if (a === 'delete') onDelete(row); }}
          emptyMessage="No expenses recorded."
        />
      )}
      {showForm && <ExpenseForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </>
  );
}

function ExpenseForm({ onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ date: todayEAT(), category: 'Feeds', sub_category: '', amount: '', supplier: '', notes: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Save');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save() {
    if (!f.date || !f.category || !f.amount) { toast('error', 'Date, category and amount are required'); return; }
    setBusy(true);
    setBusyLabel('Saving…');
    let documentId = '';
    if (file) {
      setBusyLabel('Uploading…');
      const path = 'LUK54/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const { error } = await supabase.storage.from('receipts').upload(path, file);
      if (error) { setBusy(false); toast('error', error.message || 'Upload failed'); return; }
      documentId = path;
      setBusyLabel('Saving…');
    }
    const { error } = await supabase.from('expenses').insert({
      project_id: 'LUK54', date: f.date, category: f.category,
      sub_category: f.sub_category || '', amount: Number(f.amount) || 0,
      supplier: f.supplier || '', document_id: documentId, notes: f.notes || '',
    });
    setBusy(false);
    if (error) toast('error', error.message);
    else { toast('success', 'Expense recorded'); onSaved(); }
  }

  return (
    <Modal title="Record expense" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? busyLabel : 'Save'}</button></>}>
      <Field label="Date" type="date" required value={f.date} onChange={set('date')} />
      <Field label="Category" type="select" required value={f.category} onChange={set('category')} options={EXPENSE_CATEGORIES} />
      <Field label="Sub-item / description" value={f.sub_category} onChange={set('sub_category')} />
      <Field label="Amount (UGX)" type="number" required value={f.amount} onChange={set('amount')} />
      <Field label="Supplier" value={f.supplier} onChange={set('supplier')} />
      <Field label="Notes" type="textarea" value={f.notes} onChange={set('notes')} />
      <div className="form-group">
        <label className="form-label">Invoice / receipt (optional)</label>
        <input className="form-input" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
          onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
        <div className="form-hint">Stored with this expense for evidence.</div>
      </div>
    </Modal>
  );
}
