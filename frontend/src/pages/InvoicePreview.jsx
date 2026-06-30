import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';
import { useToast } from '../context/ToastContext';
import { formatINR } from '../utils/format';

export default function InvoicePreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [invoice, setInvoice] = useState(null);
  const [draft, setDraft] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);

  const load = () =>
    api.get(`/invoices/${id}`).then((res) => setInvoice(res.data));

  useEffect(() => {
    load();
  }, [id]);

  const setStatus = async (status) => {
    try {
      await api.put(`/invoices/${id}`, { status });
      showToast(`Marked as ${status}`, 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not update status', 'error');
    }
  };

  const remove = async () => {
    if (!confirm('Delete this invoice?')) return;
    try {
      await api.delete(`/invoices/${id}`);
      showToast('Invoice deleted', 'success');
      navigate('/invoices');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not delete invoice', 'error');
    }
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/invoices/${id}/pdf`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: 'application/pdf' })
      );

      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast('Could not generate PDF', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const sendEmail = async () => {
    setSending(true);
    try {
      await api.post(`/invoices/${id}/send`);
      showToast('Invoice emailed to client', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not send email', 'error');
    } finally {
      setSending(false);
    }
  };

  const draftReminder = async () => {
    setDrafting(true);
    setDraftError('');
    setDraft('');

    try {
      const res = await api.post(`/reminders/${id}/draft`);
      setDraft(res.data.draft);
    } catch (err) {
      setDraftError(
        err.response?.data?.message ||
          'Could not generate a reminder draft. Check OPENAI_API_KEY.'
      );
    } finally {
      setDrafting(false);
    }
  };

  if (!invoice) return null;

  const isOverdue =
    invoice.status !== 'paid' &&
    new Date(invoice.dueDate) < new Date();

  return (
    <AppLayout title={`Invoice ${invoice.invoiceNumber}`}>
      <div className="flex-between mb-16" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to={`/invoices/${id}/edit`} className="btn btn-secondary">
            Edit
          </Link>

          <button
            className="btn btn-secondary"
            onClick={downloadPdf}
            disabled={downloading}
          >
            {downloading ? 'Preparing…' : 'Download PDF'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={sendEmail}
            disabled={sending}
          >
            {sending ? 'Sending…' : 'Save and Send'}
          </button>

          {invoice.status !== 'paid' && (
            <button
              className="btn btn-secondary"
              onClick={() => setStatus('sent')}
            >
              Mark as sent
            </button>
          )}

          {invoice.status !== 'paid' && (
            <button
              className="btn btn-secondary"
              onClick={() => setStatus('paid')}
            >
              Mark as paid
            </button>
          )}

          <button className="btn btn-danger" onClick={remove}>
            Delete
          </button>
        </div>

        <span className={`badge badge-${invoice.status}`}>
          {invoice.status}
        </span>
      </div>

      <div className="invoice-preview mb-24">
        <div className="invoice-head">
          <div>
            <div className="invoice-title">TAX INVOICE</div>
            <div className="muted">{invoice.invoiceNumber}</div>
          </div>

          <div className="text-right">
            <div className="meta-label">Invoice date</div>
            <div>{invoice.invoiceDate}</div>

            <div className="meta-label" style={{ marginTop: 6 }}>
              Due date
            </div>
            <div>{invoice.dueDate}</div>
          </div>
        </div>

        <div className="form-row mb-24">
          <div>
            <div className="meta-label">Bill to</div>
            <div>
              <strong>{invoice.Client?.name || '—'}</strong>
            </div>
            <div className="muted">{invoice.Client?.gstin}</div>
            <div className="muted">{invoice.Client?.address}</div>
            <div className="muted">
              {[invoice.Client?.city, invoice.Client?.state]
                .filter(Boolean)
                .join(', ')}
            </div>
          </div>

          <div className="text-right">
            <div className="meta-label">Place of supply</div>
            <div>{invoice.placeOfSupply || '—'}</div>
          </div>
        </div>

        <table className="list-table mb-16">
          <thead>
            <tr>
              <th>Item</th>
              <th>HSN/SAC</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>SGST</th>
              <th>CGST</th>
              <th>Amount</th>
            </tr>
          </thead>

          <tbody>
            {invoice.items?.map((it) => (
              <tr key={it.id}>
                <td>{it.description}</td>
                <td>{it.hsnSac}</td>
                <td>{it.qty}</td>
                <td>{formatINR(it.rate)}</td>
                <td>{formatINR((it.amount * it.sgstPct) / 100 || 0)}</td>
                <td>{formatINR((it.amount * it.cgstPct) / 100 || 0)}</td>
                <td className="text-right">{formatINR(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ maxWidth: 320, marginLeft: 'auto' }}>
          <div className="flex-between">
            <span className="muted">Subtotal</span>
            <span>{formatINR(invoice.subtotal)}</span>
          </div>

          <div className="flex-between">
            <span className="muted">SGST</span>
            <span>{formatINR(invoice.sgstTotal)}</span>
          </div>

          <div className="flex-between">
            <span className="muted">CGST</span>
            <span>{formatINR(invoice.cgstTotal)}</span>
          </div>

          <div className="total-band">
            <span>Total</span>
            <span>{formatINR(invoice.total)}</span>
          </div>
        </div>

        {invoice.notes && (
          <>
            <hr className="dashed-divider" />
            <div className="muted">{invoice.notes}</div>
          </>
        )}

        {invoice.terms && (
          <div className="muted" style={{ marginTop: 8 }}>
            {invoice.terms}
          </div>
        )}
      </div>

      {isOverdue && (
        <div className="card">
          <div
            className="flex-between"
            style={{ flexWrap: 'wrap', gap: 10 }}
          >
            <div>
              <h3 style={{ margin: 0 }}>Payment is overdue</h3>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                Let AI draft a polite reminder email.
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={draftReminder}
              disabled={drafting}
            >
              {drafting ? 'Drafting…' : 'Draft reminder with AI'}
            </button>
          </div>

          {draftError && (
            <div className="alert-error" style={{ marginTop: 12 }}>
              {draftError}
            </div>
          )}

          {draft && <div className="reminder-draft">{draft}</div>}
        </div>
      )}
    </AppLayout>
  );
}