import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import api from '../api';

const ResetPassword: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';
    const email = searchParams.get('email') || '';
    
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (token && email) {
            verifyToken();
        } else {
            setLoading(false);
            setError('Missing token or email in the link.');
        }
    }, [token, email]);

    const verifyToken = async () => {
        setLoading(true);
        try {
            await api.post('/verify-reset', { email, token });
            setIsVerified(true);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'This reset link is invalid or has already been used.');
            setIsVerified(false);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await api.post('/reset-password', {
                email,
                token,
                password,
                password_confirmation: passwordConfirmation,
            });
            setMessage('Password reset successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to reset password.');
            setSubmitting(false);
        }
    };

    return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <Row className="w-100 justify-content-center">
                <Col md={6} lg={5}>
                    <Card className="shadow">
                        <Card.Body className="p-4">
                            <h2 className="text-center mb-4">Reset Password</h2>
                            
                            {loading ? (
                                <div className="text-center py-4">
                                    <Spinner animation="border" variant="primary" />
                                    <p className="mt-2 text-muted">Verifying your reset link...</p>
                                </div>
                            ) : (
                                <>
                                    {message && <Alert variant="success">{message}</Alert>}
                                    {error && (
                                            <Alert variant="danger">
                                                {error}
                                            </Alert>
                                            
                                    )}

                                    {isVerified && !message && (
                                        <Form onSubmit={handleReset}>
                                            <p className="text-muted text-center mb-4">
                                                Setting new password for <strong>{email}</strong>
                                            </p>
                                            <Form.Group className="mb-3">
                                                <Form.Label>New Password</Form.Label>
                                                <Form.Control 
                                                    type="password" 
                                                    placeholder="Enter new password" 
                                                    value={password || ""} 
                                                    onChange={(e) => setPassword(e.target.value)} 
                                                    required 
                                                    minLength={8}
                                                />
                                            </Form.Group>
                                            <Form.Group className="mb-4">
                                                <Form.Label>Confirm New Password</Form.Label>
                                                <Form.Control 
                                                    type="password" 
                                                    placeholder="Confirm new password" 
                                                    value={passwordConfirmation || ""} 
                                                    onChange={(e) => setPasswordConfirmation(e.target.value)} 
                                                    required 
                                                />
                                            </Form.Group>
                                            <div className="d-grid gap-2">
                                                <Button variant="primary" type="submit" disabled={submitting}>
                                                    {submitting ? 'Updating...' : 'Update Password'}
                                                </Button>
                                            </div>
                                        </Form>
                                    )}

                                    {!isVerified && !loading && !error && (
                                        <div className="text-center">
                                            <Alert variant="warning">Link verification failed.</Alert>
                                            <Link to="/forgot-password" data-testid="back-to-forgot">Go back</Link>
                                        </div>
                                    )}
                                    
                                    <div className="text-center mt-3">
                                        <Link to="/login" className="text-decoration-none small">Back to Login</Link>
                                    </div>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default ResetPassword;
