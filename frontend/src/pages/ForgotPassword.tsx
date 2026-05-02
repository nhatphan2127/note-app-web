import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

const ForgotPassword: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [step, setStep] = useState(1);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Polling effect to detect if password was reset via link in another tab
    useEffect(() => {
        let interval: any;
        if (step === 2 || step === 3) {
            interval = setInterval(async () => {
                try {
                    // We check if the reset record still exists. 
                    // If the user reset via link, the record is deleted.
                    // We can't directly check if it's gone without a specific endpoint, 
                    // but we can try to "verify" a dummy token. If it returns 422 "No reset request found",
                    // it means the process was completed elsewhere.
                    await api.post('/verify-reset', { email, otp: '000000' });
                } catch (err: any) {
                    if (err.response?.status === 422 && err.response?.data?.message === 'No reset request found') {
                        setMessage('Password was successfully reset via the link! Redirecting to login...');
                        setError('');
                        setStep(4);
                        clearInterval(interval);
                        setTimeout(() => navigate('/login'), 3000);
                    }
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [step, email, navigate]);

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await api.post('/forgot-password', { email });
            setStep(2);
            setMessage('OTP and Reset Link sent to your email');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send reset information');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage(''); // Clear previous success message
        try {
            await api.post('/verify-reset', { email, otp });
            setStep(3);
            setMessage('OTP verified. Please enter your new password.');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await api.post('/reset-password', {
                email,
                otp,
                password,
                password_confirmation: passwordConfirmation,
            });
            setMessage('Password reset successful! Redirecting to login...');
            setStep(4);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <Row className="w-100 justify-content-center">
                <Col md={6} lg={5}>
                    <Card className="shadow">
                        <Card.Body className="p-4">
                            <h2 className="text-center mb-4">Reset Password</h2>
                            
                            {/* Improved message handling: only show one type at a time */}
                            {error ? (
                                <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>
                            ) : (
                                message && <Alert variant="success">{message}</Alert>
                            )}
                            
                            {step === 1 && (
                                <Form onSubmit={handleForgot}>
                                    <p className="text-muted text-center mb-4">Enter your email to receive a reset link or OTP.</p>
                                    <Form.Group className="mb-4">
                                        <Form.Label>Email address</Form.Label>
                                        <Form.Control 
                                            type="email" 
                                            placeholder="Enter email" 
                                            value={email} 
                                            onChange={(e) => setEmail(e.target.value)} 
                                            required 
                                        />
                                    </Form.Group>
                                    <div className="d-grid gap-2">
                                        <Button variant="primary" type="submit" disabled={loading}>
                                            {loading ? 'Sending...' : 'Send Reset Info'}
                                        </Button>
                                    </div>
                                </Form>
                            )}

                            {step === 2 && (
                                <Form onSubmit={handleVerifyOtp}>
                                    <p className="text-muted text-center mb-4">Enter the OTP sent to <strong>{email}</strong> or click the link in your email.</p>
                                    <Form.Group className="mb-4">
                                        <Form.Label>OTP Code</Form.Label>
                                        <Form.Control 
                                            type="text" 
                                            placeholder="Enter OTP" 
                                            value={otp} 
                                            onChange={(e) => setOtp(e.target.value)} 
                                            required 
                                        />
                                    </Form.Group>
                                    <div className="d-grid gap-2">
                                        <Button variant="primary" type="submit" disabled={loading}>
                                            {loading ? 'Verifying...' : 'Verify OTP'}
                                        </Button>
                                    </div>
                                </Form>
                            )}

                            {step === 3 && (
                                <Form onSubmit={handleResetPassword}>
                                    <p className="text-muted text-center mb-4">Set a new password for <strong>{email}</strong>.</p>
                                    <Form.Group className="mb-3">
                                        <Form.Label>New Password</Form.Label>
                                        <Form.Control 
                                            type="password" 
                                            placeholder="New Password" 
                                            value={password} 
                                            onChange={(e) => setPassword(e.target.value)} 
                                            required 
                                            minLength={8}
                                        />
                                    </Form.Group>
                                    <Form.Group className="mb-4">
                                        <Form.Label>Confirm New Password</Form.Label>
                                        <Form.Control 
                                            type="password" 
                                            placeholder="Confirm New Password" 
                                            value={passwordConfirmation} 
                                            onChange={(e) => setPasswordConfirmation(e.target.value)} 
                                            required 
                                        />
                                    </Form.Group>
                                    <div className="d-grid gap-2">
                                        <Button variant="primary" type="submit" disabled={loading}>
                                            {loading ? 'Resetting...' : 'Reset Password'}
                                        </Button>
                                    </div>
                                </Form>
                            )}

                            {step === 4 && (
                                <div className="text-center mt-3">
                                    <p className="text-muted">You can now sign in with your new password.</p>
                                    <Link to="/login" className="btn btn-primary w-100">Go to Login</Link>
                                </div>
                            )}

                            {step !== 4 && (
                                <div className="text-center mt-3">
                                    <Link to="/login" className="text-decoration-none small">Back to Login</Link>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default ForgotPassword;
