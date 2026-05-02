import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook } from '@fortawesome/free-solid-svg-icons';
import api from '../api';
import { useAuth } from '../AuthContext';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/login', { email, password });
            login(response.data.access_token, response.data.user);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <Row className="w-100 justify-content-center">
                <Col md={8} lg={5} xl={4}>
                    <div className="text-center mb-4 text-primary">
                        <FontAwesomeIcon icon={faBook} style={{ fontSize: '3rem' }} />
                        <h1 className="fw-bold mt-2">NotesApp</h1>
                        <p className="text-muted">Welcome back! Please login to your account.</p>
                    </div>
                    <Card className="auth-card shadow">
                        <Card.Body>
                            <h2 className="fw-bold mb-4">Login</h2>
                            {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3" controlId="formBasicEmail">
                                    <Form.Label className="small fw-bold text-muted">Email address</Form.Label>
                                    <Form.Control 
                                        type="email" 
                                        placeholder="Email" 
                                        className="py-2"
                                        value={email || ""} 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        required 
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4" controlId="formBasicPassword">
                                    <div className="d-flex justify-content-between">
                                        <Form.Label className="small fw-bold text-muted">Password</Form.Label>
                                        <Link to="/forgot-password" style={{ fontSize: '0.8rem' }} className="text-decoration-none">Forgot password?</Link>
                                    </div>
                                    <Form.Control 
                                        type="password" 
                                        placeholder="Enter your password" 
                                        className="py-2"
                                        value={password || ""} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        required 
                                    />
                                </Form.Group>

                                <div className="d-grid gap-2">
                                    <Button variant="primary" type="submit" size="lg" className="py-2 fw-bold" disabled={loading}>
                                        {loading ? 'Logging in...' : 'Sign In'}
                                    </Button>
                                </div>
                            </Form>
                            <div className="text-center mt-4">
                                <p className="mb-0 text-muted small">
                                    Don't have an account? <Link to="/register" className="fw-bold text-decoration-none">Create Account</Link>
                                </p>
                            </div>
                        </Card.Body>
                    </Card>
                    <p className="text-center mt-4 text-muted small">
                        &copy; 2026 NotesApp. All rights reserved.
                    </p>
                </Col>
            </Row>
        </Container>
    );
};

export default Login;
