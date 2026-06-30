import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    companyName: '', companyGSTIN: '', companyAddress: '', city: '', state: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setBusy(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not register');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ width: 460 }}>
        <div className="brand"><span className="dot" /><h3 style={{ margin: 0 }}>InvoiceFlow</h3></div>
        <p className="subtitle">Set up your account and company profile.</p>
        {error && <div className="alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="field"><label>Your name</label><input required value={form.name} onChange={set('name')} /></div>
            <div className="field"><label>Email</label><input type="email" required value={form.email} onChange={set('email')} /></div>
          </div>
          <div className="field"><label>Password</label><input type="password" required minLength={6} value={form.password} onChange={set('password')} /></div>
          <hr className="dashed-divider" />
          <div className="form-row">
            <div className="field"><label>Company name</label><input value={form.companyName} onChange={set('companyName')} /></div>
            <div className="field"><label>Company GSTIN</label><input value={form.companyGSTIN} onChange={set('companyGSTIN')} maxLength={15} /></div>
          </div>
          <div className="field"><label>Company address</label><input value={form.companyAddress} onChange={set('companyAddress')} /></div>
          <div className="form-row">
            <div className="field"><label>City</label><input value={form.city} onChange={set('city')} /></div>
            <div className="field"><label>State</label><input value={form.state} onChange={set('state')} /></div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <div className="switch-link">Already have an account? <Link to="/login">Log in</Link></div>
      </div>
    </div>
  );
}
