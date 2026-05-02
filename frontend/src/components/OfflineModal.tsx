import React from 'react';
import { Modal, Button } from 'react-bootstrap';

interface OfflineModalProps {
    show: boolean;
    onHide: () => void;
}

const OfflineModal: React.FC<OfflineModalProps> = ({ show, onHide }) => {
    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Internet Required</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                This feature requires an internet connection. Please check your network and try again.
            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" onClick={onHide}>
                    OK
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default OfflineModal;
