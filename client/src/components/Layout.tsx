import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="top-nav">
        <Link to="/" className="top-nav-brand">
          Expense Splitter
        </Link>
        {user && (
          <nav className="top-nav-links">
            <Link to="/">Dashboard</Link>
            <span>{user.name}</span>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Log out
            </button>
          </nav>
        )}
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
