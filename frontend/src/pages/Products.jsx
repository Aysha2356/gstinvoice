import { useEffect, useState } from 'react';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';
import { useToast } from '../context/ToastContext';

const empty = { name: '', hsnSac: '', rate: 0, sgstPct: 0, cgstPct: 0, unit: 'pcs' };

export default function Products() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const load = () => api.get('/products').then((res) => setProducts(res.data));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const openNew = () => { setForm(empty); setEditingId(null); setShowModal(true); };
  const openEdit = (p) => { setForm(p); setEditingId(p.id); setShowModal(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await api.put(`/products/${editingId}`, form);
      else await api.post('/products', form);
      showToast(editingId ? 'Product updated' : 'Product added', 'success');
      setShowModal(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save product', 'error');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this product from the catalog?')) return;
    try {
      await api.delete(`/products/${id}`);
      showToast('Product deleted', 'success');
      load();
    } catch (err) {
      showToast('Could not delete product', 'error');
    }
  };

  return (
    <AppLayout title="Product Catalog">
      <div className="card">
        <div className="flex-between mb-16">
          <h3>Your products</h3>
          <button className="btn btn-primary" onClick={openNew}>+ Add product</button>
        </div>

        {products.length === 0 ? (
          <div className="empty-state">No products yet. Add products here so you can quickly pick them when creating invoices.</div>
        ) : (
          <table className="list-table">
            <thead>
              <tr><th>Name</th><th>HSN/SAC</th><th>Rate</th><th>SGST%</th><th>CGST%</th><th>Unit</th><th></th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.hsnSac || '—'}</td>
                  <td>₹{Number(p.rate).toFixed(2)}</td>
                  <td>{p.sgstPct}%</td>
                  <td>{p.cgstPct}%</td>
                  <td>{p.unit}</td>
                  <td className="text-right">
                    <button className="btn btn-ghost" onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn btn-danger" onClick={() => remove(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'Edit product' : 'Add product'}</h3>
            <form onSubmit={save}>
              <div className="field"><label>Product name</label><input required value={form.name} onChange={set('name')} /></div>
              <div className="field"><label>HSN/SAC code</label><input value={form.hsnSac} onChange={set('hsnSac')} /></div>
              <div className="form-row">
                <div className="field"><label>Rate (₹)</label><input type="number" min="0" step="0.01" value={form.rate} onChange={set('rate')} /></div>
                <div className="field"><label>Unit</label><input value={form.unit} onChange={set('unit')} placeholder="pcs, hr, kg…" /></div>
              </div>
              <div className="form-row">
                <div className="field"><label>SGST%</label><input type="number" min="0" step="0.01" value={form.sgstPct} onChange={set('sgstPct')} /></div>
                <div className="field"><label>CGST%</label><input type="number" min="0" step="0.01" value={form.cgstPct} onChange={set('cgstPct')} /></div>
              </div>
              <div className="flex-between">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary">Save product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}