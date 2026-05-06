import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { PreferencesProvider } from './PreferencesContext';
import { ConnectivityProvider } from './ConnectivityContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import VerifySuccess from './pages/VerifySuccess';
import VerifyError from './pages/VerifyError';
import '/src/assets/css/App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token, loading } = useAuth();
    
    if (loading) return <div>Loading...</div>;
    if (!token) return <Navigate to="/login" />;
    
    return <>{children}</>;
};

const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token, loading } = useAuth();

    if (loading) return <div>Loading...</div>;
    if (token) return <Navigate to="/" />;

    return <>{children}</>;
};

function App() {
    return (
        <AuthProvider>
            <ConnectivityProvider>
                <PreferencesProvider>
                    <Router>
                <Routes>
                    <Route path="/login" element={
                        <GuestRoute>
                            <Login />
                        </GuestRoute>
                    } />
                    <Route path="/register" element={
                        <GuestRoute>
                            <Register />
                        </GuestRoute>
                    } />
                    <Route path="/forgot-password" element={
                        <GuestRoute>
                            <ForgotPassword />
                        </GuestRoute>
                    } />
                    <Route path="/reset-password" element={
                        <GuestRoute>
                            <ResetPassword />
                        </GuestRoute>
                    } />
                    <Route path="/email/verify/:id/:hash" element={<VerifyEmail />} />
                    <Route path="/email/verify-success" element={<VerifySuccess />} />
                    <Route path="/email/verify-error" element={<VerifyError />} />
                    <Route path="/" element={
                        <ProtectedRoute>
                            <Home />
                        </ProtectedRoute>
                    } />
                </Routes>
                    </Router>
                </PreferencesProvider>
            </ConnectivityProvider>
        </AuthProvider>
    );
}

export default App;
