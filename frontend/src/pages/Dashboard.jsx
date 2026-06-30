import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';
import { formatINR } from '../utils/format';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    api.get('/invoices/stats/dashboard').then((res) => setStats(res.data));
    api.get('/invoices', { params: { page: 1, pageSize: 5 } }).then((res) => setRecent(res.data.invoices));
  }, []);

  return (
    <AppLayout title="Dashboard">
      <div className="stat-grid">
        <StatCard label="Total billed" value={stats?.totalBilled} />
        <StatCard label="Paid" value={stats?.totalPaid} />
        <StatCard label="Outstanding" value={stats?.totalOutstanding} />
        <StatCard label="Overdue" value={stats?.totalOverdue} coral count={stats?.overdueCount} />
      </div>

      <div className="card">
        <div className="flex-between mb-16">
          <h3>Recent invoices</h3>
          <Link to="/invoices" className="btn btn-secondary">View all</Link>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">
            No invoices yet. <Link to="/invoices/new">Create your first invoice</Link>.
          </div>
        ) : (
          <table className="list-table">
            <thead><tr><th>Invoice #</th><th>Client</th><th>Due date</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {recent.map((inv) => (
                <tr key={inv.id}>
                  <td><Link to={`/invoices/${inv.id}`}>{inv.invoiceNumber}</Link></td>
                  <td>{inv.Client?.name || '—'}</td>
                  <td>{inv.dueDate}</td>
                  <td>{formatINR(inv.total)}</td>
                  <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value, coral, count }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className={`value ${coral ? 'coral' : ''}`}>{formatINR(value || 0)}</div>
      {count != null && <div className="muted" style={{ fontSize: '0.78rem', marginTop: 4 }}>{count} invoice(s)</div>}
    </div>
  );
}
