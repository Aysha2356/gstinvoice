import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';
import { useToast } from '../context/ToastContext';
import { formatINR } from '../utils/format';

const blankItem = () => ({
  productId: '', description: '', hsnSac: '', qty: 1, rate: 0, sgstPct: 0, cgstPct: 0,
});

function calcLocalTotals(items) {
  let subtotal = 0, sgstTotal = 0, cgstTotal = 0;
  const computed = items.map((it) => {
    const qty = Number(it.qty) || 0;
    const rate = Number(it.rate) || 0;
    const amount = qty * rate;
    const sgst = (amount * (Number(it.sgstPct) || 0)) / 100;
    const cgst = (amount * (Number(it.cgstPct) || 0)) / 100;
    subtotal += amount; sgstTotal += sgst; cgstTotal += cgst;
    return { ...it, amount };
  });
  const total = subtotal + sgstTotal + cgstTotal;
  return { computed, subtotal, sgstTotal, cgstTotal, total };
}

export default function InvoiceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();

  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState(today());
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [items, setItems] = useState([blankItem()]);
  const [notes, setNotes] = useState('It was great doing business with you.');
  const [terms, setTerms] = useState('Please make the payment by the due date.');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get('/clients', { params: { page: 1, pageSize: 100 } })
      .then((res) => setClients(res.data.clients || res.data));
    api.get('/products').then((res) => setProducts(res.data));
    if (id) {
      api.get(`/invoices/${id}`).then((res) => {
        const inv = res.data;
        setClientId(inv.clientId || '');
        setInvoiceNumber(inv.invoiceNumber);
        setInvoiceDate(inv.invoiceDate);
        setDueDate(inv.dueDate);
        setPlaceOfSupply(inv.placeOfSupply || '');
        setNotes(inv.notes || '');
        setTerms(inv.terms || '');
        setItems(inv.items?.length ? inv.items : [blankItem()]);
      });
    } else {
      api.get('/auth/next-invoice-number')
        .then((res) => setInvoiceNumber(res.data.invoiceNumber));
    }
  }, [id]);

  // NEW: fills a line item row when a product is chosen from the inline search dropdown
  const selectProductForRow = (idx, product) => {
    const next = [...items];
    next[idx] = {
      ...next[idx],
      productId: product.id,
      description: product.name,
      hsnSac: product.hsnSac || '',
      rate: Number(product.rate),
      sgstPct: Number(product.sgstPct),
      cgstPct: Number(product.cgstPct),
    };
    setItems(next);
    setItemSearch((prev) => ({ ...prev, [idx]: '' }));
    setOpenDropdownIdx(null);
  };

  // NEW: per-row search text + which row's dropdown is open
  const [itemSearch, setItemSearch] = useState({});
  const [openDropdownIdx, setOpenDropdownIdx] = useState(null);

  const getRowSearchResults = (idx) => {
    const query = (itemSearch[idx] || '').toLowerCase();
    if (!query) return products;
    return products.filter((p) => p.name.toLowerCase().includes(query));
  };

  const updateItem = (idx, key, value) => {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: value };
    setItems(next);
  };
  const addItem = () => setItems([...items, blankItem()]);
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const { computed, subtotal, sgstTotal, cgstTotal, total } = calcLocalTotals(items);

  const validate = () => {
    const errs = {};
    if (!invoiceNumber.trim()) errs.invoiceNumber = 'Invoice number is required';
    if (!invoiceDate) errs.invoiceDate = 'Invoice date is required';
    if (!dueDate) errs.dueDate = 'Due date is required';
    if (dueDate && invoiceDate && dueDate < invoiceDate)
      errs.dueDate = 'Due date cannot be before invoice date';
    if (!items.length || items.every((it) => !it.description?.trim()))
      errs.items = 'Add at least one item with a description';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validate()) { showToast('Please fix the highlighted fields', 'error'); return; }
    setSaving(true);
    const payload = {
      clientId: clientId || null, invoiceNumber, invoiceDate, dueDate,
      placeOfSupply, notes, terms,
      items: items.map((it) => ({ ...it, cessPct: 0 })),
    };
    try {
      let res;
      if (id) res = await api.put(`/invoices/${id}`, payload);
      else res = await api.post('/invoices', payload);
      showToast(id ? 'Invoice updated' : 'Invoice created', 'success');
      navigate(`/invoices/${res.data.id}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save invoice', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title={id ? 'Edit invoice' : 'New invoice'}>
      <div className="invoice-layout invoice-layout-single">

        {/* Invoice form */}
        <form onSubmit={save} className="card">

          {/* Client + Place of supply */}
          <div className="form-row mb-16">
            <div className="field">
              <label>Bill to (client)</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Select a client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Place of supply (state)</label>
              <input value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} />
            </div>
          </div>

          {/* Invoice # + Dates */}
          <div className="form-row-3 mb-16">
            <div className="field">
              <label>Invoice #</label>
              <input
                className={errors.invoiceNumber ? 'invalid' : ''}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
              {errors.invoiceNumber && <div className="field-error">{errors.invoiceNumber}</div>}
            </div>
            <div className="field">
              <label>Invoice date</label>
              <input type="date"
                className={errors.invoiceDate ? 'invalid' : ''}
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)} />
              {errors.invoiceDate && <div className="field-error">{errors.invoiceDate}</div>}
            </div>
            <div className="field">
              <label>Due date</label>
              <input type="date"
                className={errors.dueDate ? 'invalid' : ''}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)} />
              {errors.dueDate && <div className="field-error">{errors.dueDate}</div>}
            </div>
          </div>

          <hr className="dashed-divider" />
          {errors.items && <div className="field-error mb-16">{errors.items}</div>}

          {/* Line items table */}
          <div style={{ overflowX: 'visible' }}>
            <table className="items-table list-table mb-16" style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  <th>Item name</th>
                  <th>HSN/SAC</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>SGST%</th>
                  <th>CGST%</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td style={{ position: 'relative' }}>
                      {/* CHANGED: item name is now a searchable combobox sourced from
                          the product catalog, instead of a plain select or free text */}
                      <input
                        value={
                          openDropdownIdx === idx
                            ? (itemSearch[idx] ?? it.description)
                            : it.description
                        }
                        placeholder="Search item…"
                        onFocus={() => {
                          setOpenDropdownIdx(idx);
                          setItemSearch((prev) => ({ ...prev, [idx]: '' }));
                        }}
                        onChange={(e) =>
                          setItemSearch((prev) => ({ ...prev, [idx]: e.target.value }))
                        }
                        onBlur={() => {
                          setTimeout(() => setOpenDropdownIdx((cur) => (cur === idx ? null : cur)), 150);
                        }}
                      />
                      {openDropdownIdx === idx && (
                        <div className="item-search-dropdown">
                          {getRowSearchResults(idx).length === 0 ? (
                            <div className="item-search-empty">No products found.</div>
                          ) : (
                            getRowSearchResults(idx).map((p) => (
                              <div
                                key={p.id}
                                className="item-search-option"
                                onMouseDown={() => selectProductForRow(idx, p)}
                              >
                                <div className="p-name">{p.name}</div>
                                <div className="p-meta">
                                  {p.hsnSac ? `HSN: ${p.hsnSac} · ` : ''}
                                  ₹{Number(p.rate).toFixed(2)} · GST {Number(p.sgstPct) + Number(p.cgstPct)}%
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <input value={it.hsnSac} style={{ width: 70 }}
                        onChange={(e) => updateItem(idx, 'hsnSac', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" min="0" step="0.01" value={it.qty}
                        style={{ width: 55 }}
                        onChange={(e) => updateItem(idx, 'qty', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" min="0" step="0.01" value={it.rate}
                        style={{ width: 75 }}
                        onChange={(e) => updateItem(idx, 'rate', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" min="0" step="0.01" value={it.sgstPct}
                        style={{ width: 55 }}
                        onChange={(e) => updateItem(idx, 'sgstPct', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" min="0" step="0.01" value={it.cgstPct}
                        style={{ width: 55 }}
                        onChange={(e) => updateItem(idx, 'cgstPct', e.target.value)} />
                    </td>
                    <td className="col-amount">{formatINR(computed[idx]?.amount || 0)}</td>
                    <td>
                      <button type="button" className="btn btn-danger"
                        onClick={() => removeItem(idx)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" className="btn btn-secondary mb-16" onClick={addItem}>
            + Add line item manually
          </button>

          {/* Totals */}
          <div style={{ maxWidth: 320, marginLeft: 'auto' }}>
            <div className="flex-between">
              <span className="muted">Subtotal</span><span>{formatINR(subtotal)}</span>
            </div>
            <div className="flex-between">
              <span className="muted">SGST</span><span>{formatINR(sgstTotal)}</span>
            </div>
            <div className="flex-between">
              <span className="muted">CGST</span><span>{formatINR(cgstTotal)}</span>
            </div>
            <div className="total-band">
              <span>Total</span><span>{formatINR(total)}</span>
            </div>
          </div>

          <hr className="dashed-divider" />
          <div className="field">
            <label>Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="field">
            <label>Terms & conditions</label>
            <textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>

          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save invoice'}
          </button>
        </form>

      </div>
    </AppLayout>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}