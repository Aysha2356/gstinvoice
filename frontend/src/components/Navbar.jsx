import { useAuth } from '../context/AuthContext';

export default function Navbar({ title, onMenuClick }) {
  const { user, logout } = useAuth();
  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="hamburger-btn" onClick={onMenuClick} aria-label="Toggle menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
        <h2>{title}</h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="muted" style={{ fontSize: '0.88rem' }}>{user?.companyName || user?.name}</span>
        <button className="btn btn-ghost" onClick={logout}>Log out</button>
      </div>
    </div>
  );
}
