import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { formatDate, formatNumber, formatUGX, todayEAT } from '../lib/format.js';
import { DataTable, useToast } from '../components/ui.jsx';

function isoWeekOf(dateStr) {
  const p = String(dateStr).split('-');
  const d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  if (isNaN(d)) return '';
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const f = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const fd = (f.getUTCDay() + 6) % 7;
  f.setUTCDate(f.getUTCDate() - fd + 3);
  return d.getUTCFullYear() + '-W' + String(1 + Math.round((d - f) / 604800000)).padStart(2, '0');
}

function currentWeek() {
  return isoWeekOf(todayEAT());
}

function currentMonth() {
  return todayEAT().slice(0, 7);
}

function weekRange(isoWeek) {
  const m = /^(\d{4})-W(\d{2})$/.exec(isoWeek || '');
  if (!m) return null;
  const jan4 = new Date(Date.UTC(Number(m[1]), 0, 4));
  const jan4day = (jan4.getUTCDay() + 6) % 7;
  const mon = new Date(jan4);
  mon.setUTCDate(jan4.getUTCDate() - jan4day + (Number(m[2]) - 1) * 7);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { start: iso(mon), end: iso(sun) };
}

function monthRange(ym) {
  if (!/^\d{4}-\d{2}$/.test(ym || '')) return null;
  const [y, mo] = ym.split('-').map(Number);
  const end = new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
  return { start: ym + '-01', end };
}

const inRange = (rows, field, range) => rows.filter((r) => {
  const k = String(r[field] || '').slice(0, 10);
  return k >= range.start && k <= range.end;
});

export default function ReportsTab({ setActions }) {
  const toast = useToast();
  const [mode, setMode] = useState('weekly');
  const [week, setWeek] = useState(currentWeek());
  const [month, setMonth] = useState(currentMonth());
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);

  React.useEffect(() => {
    setActions(
      <button className="btn btn-secondary btn-sm" disabled={!report} onClick={() => window.print()}>Print / PDF</button>
    );
    return () => setActions(null);
  }, [report]);

  async function generate() {
    const range = mode === 'weekly' ? weekRange(week) : monthRange(month);
    if (!range) { toast('error', mode === 'weekly' ? 'Enter a valid ISO week (YYYY-Www)' : 'Enter a valid month (YYYY-MM)'); return; }
    setBusy(true);
    try {
      const q = (table, order) => supabase.from(table).select('*')
        .gte('date', range.start).lte('date', range.end).order(order || 'date', { ascending: false }).limit(1000);
      const [daily, sales, expenses, purch, mixes, health, flock] = await Promise.all([
        q('daily_production'), q('sales'), q('expenses'), q('feed_purchases'),
        supabase.from('weekly_feed_mix').select('*').gte('week_start', range.start).lte('week_start', range.end).order('week_start', { ascending: false }).limit(100),
        q('health_events'), q('flock_events'),
      ]);
      const errs = [daily, sales, expenses, purch, mixes, health, flock].map((r) => r.error).filter(Boolean);
      if (errs.length) throw new Error(errs[0].message);

      const D = daily.data || [], S = sales.data || [], E = expenses.data || [];
      const P = purch.data || [], M = mixes.data || [], H = health.data || [], F = flock.data || [];

      const eggs = D.reduce((s, r) => s + Number(r.eggs_collected || 0), 0);
      const birds = D.length ? D.reduce((s, r) => s + Number(r.opening_birds || 0), 0) / D.length : 0;
      const mort = D.reduce((s, r) => s + Number(r.mortality || 0), 0);
      const feedKg = D.reduce((s, r) => s + Number(r.feed_issued_kg || 0), 0);
      const revenue = S.reduce((s, r) => s + Number(r.total_revenue || 0), 0);
      const trays = S.reduce((s, r) => s + Number(r.quantity_trays || 0), 0);
      const expTotal = E.reduce((s, r) => s + Number(r.amount || 0), 0);
      const byCat = {};
      E.forEach((r) => { byCat[r.category || 'Other'] = (byCat[r.category || 'Other'] || 0) + Number(r.amount || 0); });
      const feedCost = P.reduce((s, r) => s + Number(r.total_cost || 0), 0);

      const schedRes = await supabase.from('vaccination_schedule').select('*');
      const sched = schedRes.data || [];
      const today = todayEAT();
      let schedDone = 0, schedOverdue = 0;
      sched.forEach((s) => {
        if (s.status === 'Completed') schedDone++;
        else if (s.planned_date && String(s.planned_date).slice(0, 10) < today) schedOverdue++;
      });

      setReport({
        label: mode === 'weekly' ? 'Week ' + week + ' (' + range.start + ' → ' + range.end + ')' : 'Month ' + month,
        days: D.length, eggs, avgBirds: Math.round(birds), mort,
        mortRate: birds ? Math.round((mort / (birds * Math.max(1, D.length))) * 1000) / 10 : 0,
        avgProd: birds ? Math.round((eggs / Math.max(1, D.length) / birds) * 1000) / 10 : 0,
        feedKg, revenue, trays, salesCount: S.length,
        expTotal, byCat, feedCost, purchCount: P.length,
        mixKg: M.reduce((s, r) => s + Number(r.total_kg || 0), 0),
        schedTotal: sched.length, schedDone, schedOverdue, treatments: H.length,
        flockCount: F.length,
        daily: D, sales: S, expenses: E, purch: P,
      });
    } catch (e) {
      toast('error', e.message || 'Report failed');
    }
    setBusy(false);
  }

  return (
    <>
      <div className="card pad-4 mb-4">
        <div className="form-row" style={{ alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Report type</label>
            <select className="form-select" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="weekly">Weekly report</option>
              <option value="monthly">Monthly report</option>
            </select>
          </div>
          {mode === 'weekly' ? (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Week (YYYY-Www)</label>
              <input className="form-input" value={week} onChange={(e) => setWeek(e.target.value)} placeholder="e.g. 2026-W40" />
              <div className="form-hint">Type year, a dash, W plus 2-digit week number — e.g. 2026-W40 = Mon 28 Sep → Sun 4 Oct 2026.</div>
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Month</label>
              <input className="form-input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <button className="btn btn-primary" disabled={busy} onClick={generate}>{busy ? 'Generating…' : 'Generate report'}</button>
          </div>
        </div>
      </div>

      {!report && (
        <div className="empty-state">
          <p className="empty-state-desc">Pick Weekly or Monthly, choose the period, then Generate. Covers production, sales, expenditure, feed, health and flock.</p>
        </div>
      )}

      {report && (
        <div className="report">
          <h2 style={{ margin: '0 0 4px' }}>Farm Report — {report.label}</h2>
          <p className="u-text-sm u-text-secondary mb-4">LUK54 Flock · generated {formatDate(todayEAT())}</p>

          <h3 className="u-text-sm u-font-semibold mb-3">Production</h3>
          <div className="kpi-grid mb-4">
            <Kpi label="Days logged" value={report.days} />
            <Kpi label="Total eggs" value={formatNumber(report.eggs)} />
            <Kpi label="Avg production" value={report.avgProd + '%'} />
            <Kpi label="Mortality" value={formatNumber(report.mort) + ' (' + report.mortRate + '%)'} />
            <Kpi label="Feed used" value={formatNumber(report.feedKg, 1) + ' kg'} />
            <Kpi label="Avg birds" value={formatNumber(report.avgBirds)} />
          </div>

          <h3 className="u-text-sm u-font-semibold mb-3">Money</h3>
          <div className="kpi-grid mb-4">
            <Kpi label="Sales revenue" value={formatUGX(report.revenue)} />
            <Kpi label="Trays sold" value={formatNumber(report.trays, 1) + ' (' + report.salesCount + ' sales)'} />
            <Kpi label="Expenditure" value={formatUGX(report.expTotal)} />
            <Kpi label="Net (sales − expenses)" value={formatUGX(report.revenue - report.expTotal)} />
          </div>

          <h3 className="u-text-sm u-font-semibold mb-3">Feed & Health</h3>
          <div className="kpi-grid mb-4">
            <Kpi label="Feed purchases" value={formatUGX(report.feedCost) + ' (' + report.purchCount + ')'} />
            <Kpi label="Weekly mix total" value={formatNumber(report.mixKg, 1) + ' kg'} />
            <Kpi label="Vaccinations" value={report.schedDone + '/' + report.schedTotal + ' done'} />
            <Kpi label="Overdue / treatments" value={report.schedOverdue + ' / ' + report.treatments} />
          </div>

          <h3 className="u-text-sm u-font-semibold mb-3">Day by day</h3>
          <div className="mb-5">
            <DataTable columns={[
              { key: 'd', label: 'Date', accessor: (r) => formatDate(r.date) },
              { key: 'e', label: 'Eggs', accessor: (r) => formatNumber(r.eggs_collected) },
              { key: 'm', label: 'Mortality', accessor: (r) => formatNumber(r.mortality) },
              { key: 'f', label: 'Feed kg', accessor: (r) => formatNumber(r.feed_issued_kg, 1) },
            ]} rows={report.daily} emptyMessage="No production logged in this period." />
          </div>

          <h3 className="u-text-sm u-font-semibold mb-3">Sales lines</h3>
          <div className="mb-5">
            <DataTable columns={[
              { key: 'd', label: 'Date', accessor: (r) => formatDate(r.date) },
              { key: 'c', label: 'Customer', accessor: (r) => r.customer || '—' },
              { key: 't', label: 'Trays', accessor: (r) => formatNumber(r.quantity_trays, 1) },
              { key: 'r', label: 'Revenue', accessor: (r) => formatUGX(r.total_revenue) },
            ]} rows={report.sales} emptyMessage="No sales in this period." />
          </div>

          <h3 className="u-text-sm u-font-semibold mb-3">Expense lines</h3>
          <div className="mb-5">
            <DataTable columns={[
              { key: 'd', label: 'Date', accessor: (r) => formatDate(r.date) },
              { key: 'c', label: 'Category', accessor: (r) => r.category },
              { key: 'a', label: 'Amount', accessor: (r) => formatUGX(r.amount) },
            ]} rows={report.expenses} emptyMessage="No expenses in this period." />
          </div>
        </div>
      )}
    </>
  );
}

function Kpi({ label, value }) {
  return <div className="card kpi-card"><div className="kpi-label">{label}</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{value}</div></div>;
}
