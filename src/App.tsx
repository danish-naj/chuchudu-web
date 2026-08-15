import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import UploadStatus from './pages/UploadStatus';
import GetApps from './pages/GetApps';
import Settings from './pages/Settings';
import Transfers from './pages/Transfers';
import Activity from './pages/Activity';
import FilePreview from './pages/FilePreview';
import SharedLink from './pages/SharedLink';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import { TransferProvider } from './context/TransferContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { DriveProvider } from './context/DriveContext';

const PrivateRoute = ({ children }: { children: React.ReactElement }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div className="h-screen w-screen bg-background flex items-center justify-center text-on-background font-headline-lg">Loading...</div>;
  }
  
  return currentUser ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'mock-client-id'}>
      <DriveProvider>
        <AuthProvider>
          <TransferProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/t/:linkId" element={<SharedLink />} />
                
                {/* Authenticated Portal Routes */}
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/status" element={<PrivateRoute><UploadStatus /></PrivateRoute>} />
                <Route path="/apps" element={<PrivateRoute><GetApps /></PrivateRoute>} />
                
                {/* Other Protected Routes */}
                <Route path="/transfers" element={<PrivateRoute><Transfers /></PrivateRoute>} />
                <Route path="/activity" element={<PrivateRoute><Activity /></PrivateRoute>} />
                <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
                <Route path="/preview" element={<PrivateRoute><FilePreview /></PrivateRoute>} />
                
                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </TransferProvider>
        </AuthProvider>
      </DriveProvider>
    </GoogleOAuthProvider>
  );
}
