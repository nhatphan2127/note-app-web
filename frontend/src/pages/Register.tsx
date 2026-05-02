import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import api from '../api';
import { useAuth } from '../AuthContext';

const Register: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState<string | string[]>('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/register', {
                name,
                email,
                password,
                password_confirmation: passwordConfirmation,
            });
            login(response.data.access_token, response.data.user);
            navigate('/');
        } catch (err: any) {
            if (err.response?.status === 422 && err.response?.data) {
                const validationErrors = err.response.data;
                const errorMessages = Object.values(validationErrors).flat() as string[];
                console.log(errorMessages)
                setError(errorMessages);
            } else {
                setError(err.response?.data?.message || 'Registration failed');
            }
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
                            <h2 className="text-center mb-4">Register</h2>
                            {error && (
                                <Alert variant="danger">
                                    {Array.isArray(error) ? (
                                        <div className='mb-0'>{error[0]}</div>
                                    ) : (
                                        error
                                    )}
                                </Alert>
                            )}
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Display Name</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        placeholder="Enter name" 
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)} 
                                        required 
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Email address</Form.Label>
                                    <Form.Control 
                                        placeholder="Enter email" 
                                        value={email} 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        required 
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Password</Form.Label>
                                    <Form.Control 
                                        type="password" 
                                        placeholder="Password" 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label>Confirm Password</Form.Label>
                                    <Form.Control 
                                        type="password" 
                                        placeholder="Confirm password" 
                                        value={passwordConfirmation} 
                                        onChange={(e) => setPasswordConfirmation(e.target.value)} 
                                    />
                                </Form.Group>

                                <div className="d-grid gap-2">
                                    <Button variant="primary" type="submit" disabled={loading}>
                                        {loading ? 'Registering...' : 'Register'}
                                    </Button>
                                </div>
                            </Form>
                            <div className="text-center mt-3">
                                <p className="mb-0">
                                    Already have an account? <Link to="/login">Login</Link>
                                </p>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Register;
