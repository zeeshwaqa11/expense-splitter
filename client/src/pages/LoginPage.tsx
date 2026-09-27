import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HttpError } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import { useAuth } from '../context/AuthContext';

const DEMO_USERS = [
  { label: 'Ali (Flatmates)', email: 'ali@example.com' },
  { label: 'Omar (Trip)', email: 'omar@example.com' },
  { label: 'Sara (Office Lunch)', email: 'sara@example.com' },
];
const DEMO_PASSWORD = 'password123';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function doLogin(loginEmail: string, loginPassword: string) {
    setError(null);
    setSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      navigate('/');
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Failed to log in');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void doLogin(email, password);
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '40px auto' }}>
      <h1>Log in</h1>
      {error && <ErrorBanner message={error} />}
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <p style={{ marginTop: 16 }}>
        No account? <Link to="/register">Register</Link>
      </p>

      <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
        Demo login (local seed data only)
      </p>
      <div className="demo-login-grid">
        {DEMO_USERS.map((u) => (
          <button
            key={u.email}
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={submitting}
            onClick={() => doLogin(u.email, DEMO_PASSWORD)}
          >
            {u.label}
          </button>
        ))}
      </div>
    </div>
  );
}
