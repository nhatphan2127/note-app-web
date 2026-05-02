import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Alert, Spinner, Button } from 'react-bootstrap';
import api from '../api';

const VerifyEmail: React.FC = () => {
    const { id, hash } = useParams<{ id: string; hash: string }>();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const verify = async () => {
            try {
                const response = await api.get(`/email/verify/${id}/${hash}`);
                setStatus('success');
                setMessage(response.data.message);
                // Redirect to home after 3 seconds
                setTimeout(() => navigate('/'), 3000);
            } catch (err: any) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Verification failed');
            }
        };

        verify();
    }, [id, hash, navigate]);

    return (
        <Container className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <div className="text-center p-5 bg-white rounded shadow-sm">
                <h2 className="mb-4">Email Verification</h2>
                
                {status === 'loading' && (
                    <div className="my-4">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-3 text-muted">Verifying your email address...</p>
                    </div>
                )}

                {status === 'success' && (
                    <Alert variant="success" className="my-4">
                        <h4 className="alert-heading">Success!</h4>
                        <p>{message}</p>
                        <hr />
                        <p className="mb-0">Redirecting you to the home page...</p>
                    </Alert>
                )}

                {status === 'error' && (
                    <Alert variant="danger" className="my-4">
                        <h4 className="alert-heading">Verification Failed</h4>
                        <p>{message}</p>
                        <Button variant="primary" className="mt-3" onClick={() => navigate('/')}>
                            Go to Home
                        </Button>
                    </Alert>
                )}
            </div>
        </Container>
    );
};

export default VerifyEmail;
