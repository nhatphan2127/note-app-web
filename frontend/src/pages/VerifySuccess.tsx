import React from 'react';
import { Container, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';

const VerifySuccess: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Container className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <div className="auth-container text-center" style={{ maxWidth: '500px' }}>
                <div className="mb-4">
                    <FontAwesomeIcon icon={faCheckCircle} size="5x" className="text-success mb-3 pulse-animation" />
                    <h2 className="mt-3">Xác thực thành công!</h2>
                </div>
                
                <p className="lead text-muted mb-4">
                    Email của bạn đã được xác thực thành công.
                </p>

                <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={() => navigate('/')}
                    className="px-5"
                >
                    Quay về trang chủ
                </Button>
            </div>
        </Container>
    );
};

export default VerifySuccess;
