import React, { useState } from 'react';
import { Container, Form, Button, ListGroup, InputGroup, Card, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faPen, faCheck, faTimes, faTag } from '@fortawesome/free-solid-svg-icons';
import type { Label } from '../types';

interface LabelsPageProps {
    labels: Label[];
    onAddLabel: (name: string) => Promise<void>;
    onRenameLabel: (labelId: number, newName: string) => Promise<void>;
    onDeleteLabel: (labelId: number) => Promise<void>;
}

const LabelsPage: React.FC<LabelsPageProps> = ({
    labels,
    onAddLabel,
    onRenameLabel,
    onDeleteLabel
}) => {
    const [newLabelName, setNewLabelName] = useState('');
    const [editingLabelId, setEditingLabelId] = useState<number | null>(null);
    const [editingLabelName, setEditingLabelName] = useState('');

    const handleAddLabel = async () => {
        if (!newLabelName.trim()) return;
        await onAddLabel(newLabelName);
        setNewLabelName('');
    };

    const handleRenameLabel = async (labelId: number) => {
        if (!editingLabelName.trim()) return;
        await onRenameLabel(labelId, editingLabelName);
        setEditingLabelId(null);
    };

    return (
        <Container 
            fluid className="p-0" style={{ backgroundColor: 'var(--modal-bg)' }}> {/* Thay px-4 thành px-0 hoặc px-2 */}
            <Row className="m-0"> {/* Sử dụng m-0 để không bị lề âm */}
                <Col xs={12} className="m-0"> {/* Thay đổi từ lg={10} xl={8} thành xs={12} để chiếm trọn không gian */}
                    <Card className="bg-dark text-white border-0 " style={{ backgroundColor: 'var(--modal-bg)' }}>
                        <Card.Body className="p-3 p-md-4" style={{ backgroundColor: 'var(--modal-bg)' }}>
                            <h3 className="mb-4 d-flex align-items-center gap-2 fs-4 fs-md-2 text-primary">
                                <FontAwesomeIcon icon={faTag} />
                                <span>Label Management</span>
                            </h3>

                            <div className="mb-4">
                                <Form.Label
                                    className="small text-uppercase fw-bold mb-2"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    Create new label
                                </Form.Label>
                                <InputGroup size="lg">
                                    <Form.Control
                                        placeholder="Enter label name..."
                                        value={newLabelName || ""}
                                        onChange={(e) => setNewLabelName(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddLabel()}
                                        className="fs-6 shadow-none"
                                        style={{
                                            backgroundColor: 'var(--input-bg)',
                                            color: 'var(--text-main)',
                                            borderColor: 'var(--border-color)'
                                        }}
                                    />
                                    <Button
                                        onClick={handleAddLabel}
                                        disabled={!newLabelName.trim()}
                                        className="px-3 px-md-4 border-0"
                                        style={{
                                            backgroundColor: 'var(--primary-color)',
                                            color: '#ffffff'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-color)'}
                                    >
                                        <FontAwesomeIcon icon={faPlus} />
                                        <span className="d-none d-sm-inline ms-2">Add Label</span>
                                    </Button>
                                </InputGroup>
                            </div>

                            <div className="label-list-container" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                <ListGroup variant="flush">
                                    {labels.length === 0 ? (
                                        <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                                            <p>No labels created yet.</p>
                                        </div>
                                    ) : (
                                        labels.map((label) => (
                                            <ListGroup.Item key={label.id}
                                                className="bg-transparent px-0 py-3"
                                                style={{ borderBottom: '1px solid var(--border-color)' }}
                                            >
                                                {editingLabelId === label.id ? (
                                                    <InputGroup size="sm">
                                                        <Form.Control
                                                            value={editingLabelName || ""}
                                                            onChange={(e) => setEditingLabelName(e.target.value)}
                                                            className="shadow-none"
                                                            autoFocus
                                                            style={{
                                                                backgroundColor: 'var(--input-bg)',
                                                                color: 'var(--text-main)',
                                                                borderColor: 'var(--border-color)'
                                                            }}
                                                        />
                                                        <Button
                                                            variant="success"
                                                            style={{ backgroundColor: 'var(--success-color)', border: 'none' }}
                                                            onClick={() => handleRenameLabel(label.id)}
                                                        >
                                                            <FontAwesomeIcon icon={faCheck} />
                                                        </Button>
                                                        <Button
                                                            variant="outline-secondary"
                                                            style={{ color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                                                            onClick={() => setEditingLabelId(null)}
                                                        >
                                                            <FontAwesomeIcon icon={faTimes} />
                                                        </Button>
                                                    </InputGroup>
                                                ) : (
                                                    <div className="d-flex align-items-center justify-content-between gap-2">
                                                        <div className="d-flex align-items-center gap-3 overflow-hidden">
                                                            <FontAwesomeIcon
                                                                icon={faTag}
                                                                style={{ color: 'var(--primary-color)' }}
                                                                className="flex-shrink-0"
                                                            />
                                                            <span className="text-truncate fs-6" style={{ color: 'var(--text-main)' }}>
                                                                {label.name}
                                                            </span>
                                                        </div>
                                                        <div className="d-flex gap-1 flex-shrink-0">
                                                            <Button
                                                                variant="link"
                                                                size="sm"
                                                                className="text-decoration-none"
                                                                style={{ color: 'var(--text-muted)' }}
                                                                onClick={() => {
                                                                    setEditingLabelId(label.id);
                                                                    setEditingLabelName(label.name);
                                                                }}
                                                            >
                                                                <FontAwesomeIcon icon={faPen} />
                                                            </Button>
                                                            <Button
                                                                variant="link"
                                                                size="sm"
                                                                className="text-decoration-none"
                                                                style={{ color: 'var(--error-color)' }}
                                                                onClick={() => onDeleteLabel(label.id)}
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </ListGroup.Item>
                                        ))
                                    )}
                                </ListGroup>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default LabelsPage;