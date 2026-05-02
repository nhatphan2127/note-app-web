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
import '../public/css/App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token, loading } = useAuth();
    
    if (loading) return <div>Loading...</div>;
    if (!token) return <Navigate to="/login" />;
    
    return <>{children}</>;
};

function App() {
    return (
        <AuthProvider>
            <ConnectivityProvider>
                <PreferencesProvider>
                    <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/email/verify/:id/:hash" element={<VerifyEmail />} />
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
