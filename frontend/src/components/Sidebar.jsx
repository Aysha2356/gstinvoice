import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/invoices/new', label: 'New Invoice' },
  { to: '/clients', label: 'Clients' },
  { to: '/settings', label: 'Settings' },
];

export default function Sidebar({ open, onClose }) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand"><span className="dot" />InvoiceFlow</div>
      <nav>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            onClick={onClose}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">GST Invoice Manager v1.0</div>
    </aside>
  );
}
