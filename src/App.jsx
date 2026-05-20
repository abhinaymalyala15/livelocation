import { Toaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import { GoogleMapsProvider } from '@/components/GoogleMapsProvider';
import RoleGate from '@/components/RoleGate';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Login from './pages/Login';
import RoleRouter from './pages/RoleRouter';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminVehicles from './pages/AdminVehicles';
import AdminTripLogs from './pages/AdminTripLogs';
import AdminGeofences from './pages/AdminGeofences';
import AdminDrivers from './pages/AdminDrivers';
import AdminLayout from './components/tracking/AdminLayout';
import FleetDataLoader from './components/FleetDataLoader';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const location = useLocation();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  if (authError?.type === 'auth_required') {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?return=${returnTo}`} replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<RoleRouter />} />
      <Route
        path="/driver"
        element={
          <RoleGate allow={['driver']}>
            <DriverDashboard />
          </RoleGate>
        }
      />
      <Route
        element={
          <RoleGate allow={['admin']}>
            <AdminLayout />
          </RoleGate>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/drivers" element={<AdminDrivers />} />
        <Route path="/admin/vehicles" element={<AdminVehicles />} />
        <Route path="/admin/trip-logs" element={<AdminTripLogs />} />
        <Route path="/admin/geofences" element={<AdminGeofences />} />
        <Route path="/admin/trips" element={<Navigate to="/admin/trip-logs" replace />} />
        <Route path="/admin/analytics" element={<Navigate to="/admin" replace />} />
        <Route path="/admin/maintenance" element={<Navigate to="/admin/vehicles" replace />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <GoogleMapsProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/*"
                  element={
                    <FleetDataLoader>
                      <AuthenticatedApp />
                    </FleetDataLoader>
                  }
                />
              </Routes>
            </Router>
            <Toaster position="top-right" richColors closeButton />
          </GoogleMapsProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App
