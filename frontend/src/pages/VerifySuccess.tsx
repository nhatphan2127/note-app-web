import React from 'react';
import { Container, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const VerifySuccess: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Container className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <div className="text-center p-5 bg-white rounded shadow-sm">
                <div className="mb-4">
                    <div className="display-1 text-success">
                        <i className="bi bi-check-circle"></i>
                    </div>
                    <h2 className="mt-3">Account Activated!</h2>
                </div>
                
                <p className="lead text-muted mb-4">
                    Your email has been successfully verified. You can now start using all the features of our application.
                </p>

                <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={() => navigate('/login')}
                    className="px-5"
                >
                    Go to Login
                </Button>
            </div>
        </Container>
    );
};

export default VerifySuccess;
