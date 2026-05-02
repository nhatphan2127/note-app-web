import React from 'react';
import { Container, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';

const VerifyError: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Container className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <div className="auth-container text-center" style={{ maxWidth: '500px' }}>
                <div className="mb-4">
                    <FontAwesomeIcon icon={faTimesCircle} size="5x" className="text-danger mb-3" />
                    <h2 className="mt-3">Xác thực thất bại!</h2>
                </div>
                
                <p className="lead text-muted mb-4">
                    Liên kết xác thực đã hết hạn hoặc không hợp lệ. Vui lòng thử đăng ký lại hoặc liên hệ với bộ phận hỗ trợ.
                </p>

                <div className="d-grid gap-2">
                    <Button 
                        variant="primary" 
                        size="lg" 
                        onClick={() => navigate('/register')}
                    >
                        Quay lại Đăng ký
                    </Button>
                    <Button 
                        variant="link" 
                        onClick={() => navigate('/login')}
                    >
                        Đến trang Đăng nhập
                    </Button>
                </div>
            </div>
        </Container>
    );
};

export default VerifyError;
