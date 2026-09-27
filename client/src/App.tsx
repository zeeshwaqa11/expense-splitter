import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { ExpenseDetailPage } from './pages/ExpenseDetailPage';
import { ExpenseFormPage } from './pages/ExpenseFormPage';
import { GroupPage } from './pages/GroupPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/groups/:groupId"
        element={
          <ProtectedRoute>
            <Layout>
              <GroupPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/groups/:groupId/expenses/new"
        element={
          <ProtectedRoute>
            <Layout>
              <ExpenseFormPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses/:expenseId"
        element={
          <ProtectedRoute>
            <Layout>
              <ExpenseDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses/:expenseId/edit"
        element={
          <ProtectedRoute>
            <Layout>
              <ExpenseFormPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
