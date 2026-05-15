import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

/**
 * Restricts routes to specific roles (admin / driver).
 */
export default function RoleGate({ allow, children }) {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !allow.includes(user.role)) {
    const redirect = user?.role === 'admin' ? '/admin' : '/driver';
    return <Navigate to={redirect} replace />;
  }

  return children;
}
