import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Table, InputGroup, Badge, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faTrash, faSpinner } from '@fortawesome/free-solid-svg-icons';
import api from '../api';
import type { Note } from '../types';

interface ShareModalProps {
    show: boolean;
    onHide: () => void;
    note: Note;
}

interface Recipient {
    id: number;
    name: string;
    email: string;
    pivot: {
        permission: 'read-only' | 'edit';
        shared_at: string;
    };
}

const ShareModal: React.FC<ShareModalProps> = ({ show, onHide, note }) => {
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [email, setEmail] = useState('');
    const [permission, setPermission] = useState<'read-only' | 'edit'>('read-only');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmRevoke, setShowConfirmRevoke] = useState<number | null>(null);

    const fetchRecipients = async () => {
        try {
            const response = await api.get(`/notes/${note.id}/share`);
            setRecipients(response.data);
        } catch (err) {
            console.error('Failed to fetch recipients', err);
        }
    };

    useEffect(() => {
        if (show) {
            fetchRecipients();
        }
    }, [show, note.id]);

    const handleShare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        setError(null);
        try {
            // await api.post(`/notes/${note.id}/share`, { email, permission });
            await api.post(`/notes/${note.id}/share`, {
                emails: [email],   // 👈 đổi thành array + đúng key
                permission
            });
            setEmail('');
            fetchRecipients();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to share note');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePermission = async (userId: number, newPermission: 'read-only' | 'edit') => {
        try {
            await api.patch(`/notes/${note.id}/share/${userId}`, { permission: newPermission });
            fetchRecipients();
        } catch (err) {
            alert('Failed to update permission');
        }
    };

    const handleRevoke = async (userId: number) => {
        try {
            await api.delete(`/notes/${note.id}/share/${userId}`);
            setShowConfirmRevoke(null);
            fetchRecipients();
        } catch (err) {
            setError('Failed to revoke access');
            setShowConfirmRevoke(null);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title className="fs-5">Share Note: {note.title || 'Untitled'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && (
                    <Alert variant="danger" onClose={() => setError(null)} dismissible className="py-2 small">
                        {error}
                    </Alert>
                )}
                <Form onSubmit={handleShare} className="mb-4">
                    <Form.Label className="small fw-bold text-muted">Add people</Form.Label>
                    <InputGroup>
                        <Form.Control
                            type="email"
                            placeholder="Enter email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            required
                        />
                        <Form.Select 
                            value={permission} 
                            onChange={(e) => setPermission(e.target.value as any)}
                            style={{ maxWidth: '140px' }}
                            disabled={loading}
                        >
                            <option value="read-only">Read-only</option>
                            <option value="edit">Can edit</option>
                        </Form.Select>
                        <Button variant="primary" type="submit" disabled={loading} style={{ minWidth: '45px' }}>
                            {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faUserPlus} />}
                        </Button>
                    </InputGroup>
                </Form>

                <div className="recipients-list">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <Form.Label className="small fw-bold text-muted mb-0">People with access</Form.Label>
                        <Badge bg={recipients.length > 0 ? "info" : "secondary"} pill>
                            {recipients.length > 0 ? `Shared with ${recipients.length} ${recipients.length === 1 ? 'person' : 'people'}` : 'Private'}
                        </Badge>
                    </div>
                    {recipients.length === 0 ? (
                        <div className="p-3 bg-light rounded text-center">
                            <p className="text-muted small mb-0 italic">This note hasn't been shared with anyone yet.</p>
                        </div>
                    ) : (
                        <div className="border rounded overflow-hidden">
                            <Table responsive hover size="sm" className="align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-3 py-2 small text-muted border-0">Recipient</th>
                                        <th className="py-2 small text-muted border-0">Permission</th>
                                        <th className="pe-3 py-2 text-end small text-muted border-0">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recipients.map((recipient) => (
                                        <tr key={recipient.id}>
                                            <td className="ps-3 py-3">
                                                <div className="fw-bold small">{recipient.name}</div>
                                                <div className="text-muted small">{recipient.email}</div>
                                            </td>
                                            <td className="py-3">
                                                <Form.Select 
                                                    size="sm"
                                                    value={recipient.pivot.permission}
                                                    onChange={(e) => handleUpdatePermission(recipient.id, e.target.value as any)}
                                                    className="border-0 bg-light small"
                                                    style={{ width: '120px' }}
                                                >
                                                    <option value="read-only">Read-only</option>
                                                    <option value="edit">Can edit</option>
                                                </Form.Select>
                                            </td>
                                             <td className="pe-3 py-3 text-end">
                                                <Button 
                                                    variant="outline-danger" 
                                                    size="sm" 
                                                    className="rounded-circle border-0"
                                                    onClick={() => setShowConfirmRevoke(recipient.id)}
                                                    title="Revoke access"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Close</Button>
            </Modal.Footer>

            <Modal show={showConfirmRevoke !== null} onHide={() => setShowConfirmRevoke(null)} centered size="sm">
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fs-6 fw-bold">Revoke Access?</Modal.Title>
                </Modal.Header>
                <Modal.Body className="py-0">
                    <p className="small text-muted mb-0">Are you sure you want to remove access for this user?</p>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="link" size="sm" className="text-muted text-decoration-none" onClick={() => setShowConfirmRevoke(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" size="sm" className="rounded-pill px-3" onClick={() => showConfirmRevoke && handleRevoke(showConfirmRevoke)}>
                        Revoke
                    </Button>
                </Modal.Footer>
            </Modal>
        </Modal>
    );
};

export default ShareModal;
