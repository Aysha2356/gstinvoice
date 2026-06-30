import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not log in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        {/* 🌟 Centered branding header stack */}
        <div 
          className="brand" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}
        >
          <span className="dot" style={{ margin: 0 }} />
          <h3 style={{ margin: 0, textAlign: 'center' }}>InvoiceFlow</h3>
        </div>
        
       
        <p className="subtitle text-center" style={{ textAlign: 'center', marginBottom: '24px' }}>
          Log in to manage your GST invoices.
        </p>

        {error && <div className="alert-error">{error}</div>}
        
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <div style={{ textAlign: 'right', marginTop: 6 }}>
              <Link to="/forgot-password" style={{ fontSize: '0.82rem' }}>Forgot password?</Link>
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <div className="switch-link" style={{ textAlign: 'center' }}>No account? <Link to="/register">Create one</Link></div>
      </div>
    </div>
  );
}