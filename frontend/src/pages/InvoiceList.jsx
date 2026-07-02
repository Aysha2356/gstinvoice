import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';
import { formatINR } from '../utils/format';

const PAGE_SIZE = 10;

export default function InvoiceList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(() => {
    api
      .get('/invoices', {
        params: { search, status, page, pageSize: PAGE_SIZE },
      })
      .then((res) => {
        setInvoices(res.data.invoices);
        setTotal(res.data.total);
      });
  }, [page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load, search]);

  return (
    <AppLayout title="Invoices">
      <div className="card">
        <div className="flex-between mb-16">
          <h3>All invoices</h3>
          <Link to="/invoices/new" className="btn btn-primary">
            + New invoice
          </Link>
        </div>

        <div className="toolbar">
          <input
            type="text"
            placeholder="Search by invoice # or client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {invoices.length === 0 ? (
          <div className="empty-state">
            {search || status
              ? 'No invoices match your filters.'
              : (
                <>
                  No invoices yet. <Link to="/invoices/new">Create one</Link>.
                </>
              )}
          </div>
        ) : (
          <>
            <table className="list-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Due</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.invoiceNumber}</td>
                    <td>{inv.Client?.name || '—'}</td>
                    <td>{inv.invoiceDate}</td>
                    <td>{inv.dueDate}</td>
                    <td>{formatINR(inv.total)}</td>
                    <td>
                      <span className={`badge badge-${inv.status}`}>
                        {inv.status}
                      </span>
                    </td>

                    {/* CHANGED: explicit "View Bill" button instead of relying
                        on the invoice number text or the whole row being
                        clickable — removes any ambiguity about how to open it */}
                    <td>
                      <button
                        type="button"
                        className="view-bill-btn"
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                      >
                        <span className="view-bill-icon" aria-hidden="true">👁</span>
                        View Bill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination">
                <span className="page-info">
                  Page {page} of {totalPages} ({total} invoices)
                </span>

                <button
                  className="btn btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </button>

                <button
                  className="btn btn-secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}