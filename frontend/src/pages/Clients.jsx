import { useEffect, useState } from 'react';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';
import { useToast } from '../context/ToastContext';

const empty = { name: '', gstin: '', address: '', city: '', state: '', email: '' };
const PAGE_SIZE = 10;

export default function Clients() {
  const { showToast } = useToast();
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = () => {
    api.get('/clients', { params: { search, page, pageSize: PAGE_SIZE } }).then((res) => {
      setClients(res.data.clients);
      setTotal(res.data.total);
    });
  };

  useEffect(() => { load(); }, [page]);
  useEffect(() => {
    setPage(1);
    const t = setTimeout(load, 300); // debounce search
    return () => clearTimeout(t);
  }, [search]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const openNew = () => { setForm(empty); setErrors({}); setEditingId(null); setShowModal(true); };
  const openEdit = (c) => { setForm(c); setErrors({}); setEditingId(c.id); setShowModal(true); };

  const validate = () => {
    const errs = {};
    if (!form.name?.trim()) errs.name = 'Client name is required';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address';
    if (form.gstin && form.gstin.length > 0 && form.gstin.length !== 15) {
      errs.gstin = 'GSTIN should be 15 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) await api.put(`/clients/${editingId}`, form);
      else await api.post('/clients', form);
      showToast(editingId ? 'Client updated' : 'Client added', 'success');
      setShowModal(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save client', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this client?')) return;
    try {
      await api.delete(`/clients/${id}`);
      showToast('Client deleted', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not delete client', 'error');
    }
  };

  return (
    <AppLayout title="Clients">
      <div className="card">
        <div className="flex-between mb-16">
          <h3>Your clients</h3>
          <button className="btn btn-primary" onClick={openNew}>+ Add client</button>
        </div>

        <div className="toolbar">
          <input
            type="text"
            placeholder="Search by name or GSTIN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {clients.length === 0 ? (
          <div className="empty-state">
            {search ? 'No clients match your search.' : 'No clients yet. Add one to start billing them.'}
          </div>
        ) : (
          <>
            <table className="list-table">
              <thead><tr><th>Name</th><th>GSTIN</th><th>City</th><th>State</th><th></th></tr></thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.gstin || '—'}</td>
                    <td>{c.city || '—'}</td>
                    <td>{c.state || '—'}</td>
                    <td className="text-right">
                      <button className="btn btn-ghost" onClick={() => openEdit(c)}>Edit</button>
                      <button className="btn btn-danger" onClick={() => remove(c.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination">
                <span className="page-info">Page {page} of {totalPages} ({total} clients)</span>
                <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
                <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'Edit client' : 'Add client'}</h3>
            <form onSubmit={save}>
              <div className="field">
                <label>Client / company name</label>
                <input className={errors.name ? 'invalid' : ''} value={form.name} onChange={set('name')} />
                {errors.name && <div className="field-error">{errors.name}</div>}
              </div>
              <div className="field">
                <label>GSTIN</label>
                <input className={errors.gstin ? 'invalid' : ''} value={form.gstin} onChange={set('gstin')} maxLength={15} />
                {errors.gstin && <div className="field-error">{errors.gstin}</div>}
              </div>
              <div className="field"><label>Address</label><input value={form.address} onChange={set('address')} /></div>
              <div className="form-row">
                <div className="field"><label>City</label><input value={form.city} onChange={set('city')} /></div>
                <div className="field"><label>State</label><input value={form.state} onChange={set('state')} /></div>
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" className={errors.email ? 'invalid' : ''} value={form.email} onChange={set('email')} />
                {errors.email && <div className="field-error">{errors.email}</div>}
                <div className="muted" style={{ fontSize: '0.78rem', marginTop: 4 }}>Used for "Save and Send" and the AI payment reminder.</div>
              </div>
              <div className="flex-between">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save client'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
