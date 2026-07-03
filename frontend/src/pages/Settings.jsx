import { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const { user, updateCompany, uploadLogo } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    companyName: '',
    companyGSTIN: '',
    companyAddress: '',
    city: '',
    state: '',
    invoicePrefix: 'INV-',
    pdfTemplate: 'classic',
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        companyName: user.companyName || '',
        companyGSTIN: user.companyGSTIN || '',
        companyAddress: user.companyAddress || '',
        city: user.city || '',
        state: user.state || '',
        invoicePrefix: user.invoicePrefix || 'INV-',
        pdfTemplate: user.pdfTemplate || 'classic',
      });
    }
  }, [user]);

  const set = (k) => (e) =>
    setForm({
      ...form,
      [k]: e.target.value,
    });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateCompany(form);
      showToast('Company settings saved', 'success');
    } catch (err) {
      showToast(
        err.response?.data?.message || 'Could not save settings',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const onLogoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      await uploadLogo(file);
      showToast('Logo updated', 'success');
    } catch (err) {
      showToast(
        err.response?.data?.message || 'Could not upload logo',
        'error'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout title="Settings">
      <div className="card" style={{ maxWidth: 640 }}>
        <h3 className="mb-16">Company profile</h3>

        <div className="field">
          <label>Company logo</label>

          <label className="logo-uploader">
            {user?.logoUrl ? (
              <img src={user.logoUrl} alt="Company logo" />
            ) : (
              <span>{uploading ? 'Uploading…' : 'Upload Logo'}</span>
            )}

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={onLogoSelect}
            />
          </label>

          <div
            className="muted"
            style={{ fontSize: '0.78rem', marginTop: 6 }}
          >
            240 × 240 pixels recommended. Maximum size of 1MB.
          </div>
        </div>

        <form onSubmit={save}>
          <div className="form-row">
            <div className="field">
              <label>Company name</label>
              <input
                value={form.companyName}
                onChange={set('companyName')}
              />
            </div>

            <div className="field">
              <label>Company GSTIN</label>
              <input
                value={form.companyGSTIN}
                onChange={set('companyGSTIN')}
                maxLength={15}
              />
            </div>
          </div>

          <div className="field">
            <label>Company address</label>
            <input
              value={form.companyAddress}
              onChange={set('companyAddress')}
            />
          </div>

          <div className="form-row">
            <div className="field">
              <label>City</label>
              <input
                value={form.city}
                onChange={set('city')}
              />
            </div>

            <div className="field">
              <label>State</label>
              <input
                value={form.state}
                onChange={set('state')}
              />
            </div>
          </div>

          <hr className="dashed-divider" />

          <div className="field">
            <label>Invoice number prefix</label>

            <input
              value={form.invoicePrefix}
              onChange={set('invoicePrefix')}
              placeholder="INV-"
              style={{ maxWidth: 160 }}
            />

            <div
              className="muted"
              style={{ fontSize: '0.78rem', marginTop: 4 }}
            >
              New invoices will be auto-numbered like{' '}
              {form.invoicePrefix || 'INV-'}
              {String((user?.lastInvoiceSeq || 0) + 1).padStart(3, '0')}
            </div>
          </div>

          <div className="field">
            <label>PDF template</label>

            <div className="template-picker">
              {['classic', 'minimal', 'bold', 'elegant'].map((t) => (
                <button
                  type="button"
                  key={t}
                  className={`template-option ${
                    form.pdfTemplate === t ? 'selected' : ''
                  }`}
                  onClick={() =>
                    setForm({
                      ...form,
                      pdfTemplate: t,
                    })
                  }
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}