import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Button, Form, Row, Col, Image, Badge, Dropdown, OverlayTrigger, Tooltip, Spinner, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faTag, faTrash, faCheck, faLock, faEye, faEyeSlash, faShareNodes, faUser } from '@fortawesome/free-solid-svg-icons';
import type { Note, Label } from '../types';
import api from '../api';
import { handleImageDelete } from '../sync';
import ShareModal from './ShareModal';
import OfflineModal from './OfflineModal';
import { useAuth } from '../AuthContext';
import { useConnectivity } from '../ConnectivityContext';
import { usePreferences } from '../PreferencesContext';

interface NoteModalProps {
    note: Note;
    onClose: () => void;
    onUpdate: (noteId: number, data: Partial<Note>) => void;
    onDelete: (noteId: number) => void;
    labels: Label[];
}

const NoteModal: React.FC<NoteModalProps> = ({
    note,
    onClose,
    onUpdate,
    onDelete,
    labels,
}) => {
    const [title, setTitle] = useState(note.title);
    const [content, setContent] = useState(note.content);
    const [selectedLabels, setSelectedLabels] = useState<number[]>(note.labels?.map(l => l.id) || []);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'content' | 'password'>('content');
    const [notePassword, setNotePassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [imageError, setImageError] = useState<string | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showOfflineModal, setShowOfflineModal] = useState(false);
    const { user: currentUser } = useAuth();
    const { isOnline } = useConnectivity();
    const { preferences } = usePreferences();
    const isDark = preferences.theme === 'dark';
    const fileInputRef = useRef<HTMLInputElement>(null);
    const timeoutRef = useRef<any>(null);
    
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [isTyping, setIsTyping] = useState<Record<number, boolean>>({});
    const isLocallyChanging = useRef(false);

    const debouncedUpdate = useCallback((id: number, data: Partial<Note>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            onUpdate(id, data);
        }, 500);
    }, [onUpdate]);

    useEffect(() => {
        setTitle(note.title);
        setContent(note.content);
        setSelectedLabels(note.labels?.map(l => l.id) || []);
    }, [note.id, note.title, note.content, note.labels]);

    useEffect(() => {
        // Real-time collaboration
        const channelName = `note.${note.id}`;
        const echo = (window as any).Echo;
        
        if (echo) {
            echo.join(channelName)
                .here((users: any[]) => {
                    setCollaborators(users.filter(u => u.id !== currentUser?.id));
                })
                .joining((user: any) => {
                    setCollaborators(prev => [...prev.filter(u => u.id !== user.id), user]);
                })
                .leaving((user: any) => {
                    setCollaborators(prev => prev.filter(u => u.id !== user.id));
                })
                .listenForWhisper('typing', (e: any) => {
                    setIsTyping(prev => ({ ...prev, [e.userId]: true }));
                    setTimeout(() => {
                        setIsTyping(prev => ({ ...prev, [e.userId]: false }));
                    }, 3000);
                })
                .listen('NoteUpdated', (e: any) => {
                    if (e.user_id !== currentUser?.id) {
                        // Only update if not locally changing to avoid cursor jumps
                        if (!isLocallyChanging.current) {
                            setTitle(e.title);
                            setContent(e.content);
                        }
                    }
                });
        }

        return () => {
            if (echo) {
                echo.leave(channelName);
            }
        };
    }, [note.id, currentUser?.id]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setImageError(null);
        const filesArray = Array.from(files);

        // Client-side validation
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        const maxSize = 2 * 1024 * 1024; // 2MB

        for (const file of filesArray) {
            if (!allowedTypes.includes(file.type)) {
                setImageError(`File "${file.name}" is not a supported format. Only JPG and PNG are allowed.`);
                return;
            }
            if (file.size > maxSize) {
                setImageError(`File "${file.name}" is too large. Max size is 2MB.`);
                return;
            }
        }

        setUploading(true);
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('images[]', files[i]);
        }

        try {
            const response = await api.post(`/notes/${note.id}/images`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onUpdate(note.id, { 
                images: [...(note.images || []), ...response.data] 
            });
        } catch (err: any) {
            console.error('Failed to upload images', err);
            setImageError(err.response?.data?.message || 'Failed to upload images');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteImage = async (imageId: number) => {
        try {
            await handleImageDelete(note.id, imageId);
            onUpdate(note.id, {
                images: note.images.filter(img => img.id !== imageId)
            });
        } catch (err) {
            console.error('Failed to delete image', err);
            alert('Failed to delete image');
        }
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        isLocallyChanging.current = true;
        setTitle(newTitle);
        
        const echo = (window as any).Echo;
        if (echo) {
            echo.join(`note.${note.id}`).whisper('typing', { userId: currentUser?.id });
        }

        debouncedUpdate(note.id, { title: newTitle });
        setTimeout(() => { isLocallyChanging.current = false; }, 1000);
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        isLocallyChanging.current = true;
        setContent(newContent);

        const echo = (window as any).Echo;
        if (echo) {
            echo.join(`note.${note.id}`).whisper('typing', { userId: currentUser?.id });
        }

        debouncedUpdate(note.id, { content: newContent });
        setTimeout(() => { isLocallyChanging.current = false; }, 1000);
    };

    const handleToggleLabel = (labelId: number) => {
        const newSelectedLabels = selectedLabels.includes(labelId)
            ? selectedLabels.filter(id => id !== labelId)
            : [...selectedLabels, labelId];
        
        setSelectedLabels(newSelectedLabels);
        onUpdate(note.id, { label_ids: newSelectedLabels } as any);
    };

    const handleSetPassword = async () => {
        if (!isOnline) {
            setShowOfflineModal(true);
            return;
        }

        setPasswordError('');

        if (note.is_locked && !notePassword) {
            // Remove password
            if (!currentPassword) {
                setPasswordError('Current password is required to remove protection.');
                return;
            }
            try {
                await api.post(`/notes/${note.id}/remove-password`, { current_password: currentPassword });
                onUpdate(note.id, { is_locked: false });
                setActiveTab('content');
                setNotePassword('');
                setCurrentPassword('');
                setConfirmPassword('');
            } catch (err: any) {
                setPasswordError(err.response?.data?.message || 'Failed to remove password.');
            }
            return;
        }

        if (!notePassword) return;

        if (notePassword !== confirmPassword) {
            setPasswordError('Passwords do not match.');
            return;
        }

        if (notePassword.length < 4) {
            setPasswordError('Password must be at least 4 characters.');
            return;
        }

        if (note.is_locked && !currentPassword) {
            setPasswordError('Current password is required to change protection.');
            return;
        }
        
        try {
            await api.post(`/notes/${note.id}/password`, { 
                password: notePassword,
                password_confirmation: confirmPassword,
                current_password: currentPassword
            });
            onUpdate(note.id, { is_locked: true });
            setActiveTab('content');
            setNotePassword('');
            setCurrentPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setPasswordError(err.response?.data?.message || 'Failed to update password.');
        }
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const isEditingDisabled = note.pivot?.permission === 'read-only';

    const modalStyle: React.CSSProperties = {
        backgroundColor: preferences.default_note_color && preferences.default_note_color !== '#ffffff' 
            ? (isDark ? `${preferences.default_note_color}33` : preferences.default_note_color) 
            : 'var(--modal-bg)',
        color: 'var(--text-main)',
        borderRadius: '12px',
        border: preferences.default_note_color && preferences.default_note_color !== '#ffffff' ? `1px solid ${preferences.default_note_color}` : 'none'
    };

    return (
        <Modal show={true} onHide={onClose} centered size="lg" className="note-edit-modal">
            <div style={modalStyle}>
                <Modal.Header closeButton className="border-0 pb-0 px-4">
                    <div className="d-flex align-items-center flex-grow-1">
                        <Form.Control
                            type="text"
                            placeholder="Title"
                            value={title}
                            onChange={handleTitleChange}
                            className="fw-bold fs-4 border-0 shadow-none px-0 py-2"
                            style={{ background: 'transparent', color: 'inherit' }}
                            readOnly={isEditingDisabled}
                        />
                        {collaborators.length > 0 && (
                            <div className="d-flex align-items-center gap-2 ms-2">
                                {collaborators.map(c => (
                                    <OverlayTrigger key={c.id} placement="bottom" overlay={<Tooltip>{c.name} {isTyping[c.id] ? '(typing...)' : '(viewing)'}</Tooltip>}>
                                        <div className={`rounded-circle bg-info d-flex align-items-center justify-content-center text-white position-relative ${isTyping[c.id] ? 'pulse-animation' : ''}`} style={{ width: '32px', height: '32px', fontSize: '12px', border: '2px solid white' }}>
                                            {c.avatar ? <Image src={`${apiBaseUrl}/storage/${c.avatar}`} roundedCircle style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FontAwesomeIcon icon={faUser} />}
                                            {isTyping[c.id] && (
                                                <Badge pill bg="success" className="position-absolute bottom-0 end-0 border border-white" style={{ width: '10px', height: '10px', padding: 0 }}> </Badge>
                                            )}
                                        </div>
                                    </OverlayTrigger>
                                ))}
                            </div>
                        )}
                    </div>
                </Modal.Header>
                <Modal.Body className="pt-2 px-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    {activeTab === 'content' ? (
                        <>
                            {selectedLabels.length > 0 && (
                                <div className="d-flex flex-wrap gap-2 mb-3">
                                    {labels.filter(l => selectedLabels.includes(l.id)).map(label => (
                                        <Badge key={label.id} pill bg="light" className="d-flex align-items-center border px-3 py-2"
                                        style={{color:'var(--text-label)'}}>
                                            {label.name}
                                            <span 
                                                className="ms-2 cursor-pointer text-muted hover-text-dark" 
                                                style={{ fontSize: '1.2rem', lineHeight: '1' }}
                                                onClick={() => !isEditingDisabled && handleToggleLabel(label.id)}
                                            >
                                                &times;
                                            </span>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            {imageError && (
                                <div className="alert alert-danger py-2 px-3 small mb-3 d-flex justify-content-between align-items-center">
                                    <span>{imageError}</span>
                                    <button type="button" className="btn-close" style={{ fontSize: '0.65rem' }} onClick={() => setImageError(null)}></button>
                                </div>
                            )}
                            {note.images && note.images.length > 0 && (
                                <Row className="g-2 mb-4">
                                    {note.images.map((img) => (
                                        <Col key={img.id} xs={6} md={4} lg={3} className="position-relative">
                                            <div className="rounded-3 overflow-hidden shadow-sm border" style={{ height: '120px' }}>
                                                <Image 
                                                    src={`${apiBaseUrl}/storage/${img.image_path}`} 
                                                    style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                                                />
                                                {!isEditingDisabled && (
                                                    <Button
                                                        variant="dark"
                                                        size="sm"
                                                        className="position-absolute top-0 end-0 m-2 p-0 rounded-circle opacity-75"
                                                        style={{ width: '24px', height: '24px', fontSize: '14px', lineHeight: '1' }}
                                                        onClick={() => handleDeleteImage(img.id)}
                                                    >
                                                        &times;
                                                    </Button>
                                                )}
                                            </div>
                                        </Col>
                                    ))}
                                </Row>
                            )}
                            <Form.Control
                                as="textarea"
                                placeholder="Take a note..."
                                value={content}
                                onChange={handleContentChange}
                                className="border-0 shadow-none px-0 py-2"
                                style={{ 
                                    background: 'transparent', 
                                    color: 'inherit',
                                    minHeight: '300px',
                                    resize: 'none',
                                    fontSize: '1.1rem'
                                }}
                                readOnly={isEditingDisabled}
                            />
                        </>
                    ) : (
                        <div className="py-3 px-2">
                            <h5 className="mb-4 d-flex align-items-center fw-bold">
                                <FontAwesomeIcon icon={faLock} className="me-2 text-warning" />
                                {note.is_locked ? 'Security Settings' : 'Protect this Note'}
                            </h5>
                            
                            {passwordError && <div className="alert alert-danger py-2 small mb-3">{passwordError}</div>}
                            
                            <div style={{ maxWidth: '400px' }}>
                                {note.is_locked && (
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small opacity-75 fw-bold">Current Password</Form.Label>
                                        <Form.Control
                                            type="password"
                                            placeholder="Enter current password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="bg-light border-0 shadow-none py-2"
                                            autoFocus
                                        />
                                    </Form.Group>
                                )}

                                <Form.Group className="mb-3">
                                    <Form.Label className="small opacity-75 fw-bold">
                                        {note.is_locked ? 'New Password (leave blank to remove)' : 'New Password'}
                                    </Form.Label>
                                    <InputGroup>
                                        <Form.Control
                                            type={showPasswordInput ? "text" : "password"}
                                            placeholder={note.is_locked ? "New password (optional)" : "Enter a secure password"}
                                            value={notePassword}
                                            onChange={(e) => setNotePassword(e.target.value)}
                                            className="bg-light border-0 shadow-none py-2"
                                        />
                                        <Button variant="outline-light" className="border-0 text-muted" 
                                                onClick={() => setShowPasswordInput(!showPasswordInput)}
                                                style={{backgroundColor: 'var(--bg-color)'}}>
                                            <FontAwesomeIcon icon={showPasswordInput ? faEyeSlash : faEye} />
                                        </Button>
                                    </InputGroup>
                                </Form.Group>

                                {(notePassword || !note.is_locked) && (
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small opacity-75 fw-bold">Confirm Password</Form.Label>
                                        <Form.Control
                                            type={showPasswordInput ? "text" : "password"}
                                            placeholder="Confirm password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="bg-light border-0 shadow-none py-2"
                                        />
                                    </Form.Group>
                                )}

                                <div className="d-flex gap-2 mt-4">
                                    <Button variant="primary" className="rounded-pill px-4" onClick={handleSetPassword}>
                                        {note.is_locked && !notePassword ? 'Remove Protection' : 'Save Changes'}
                                    </Button>
                                    <Button variant="light" className="rounded-pill px-4" onClick={() => setActiveTab('content')}>
                                        Back to Note
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0 px-4 pb-4">
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="d-none"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                    />
                    
                    <div className="d-flex gap-2 me-auto">
                        <OverlayTrigger placement="top" overlay={<Tooltip>Add images</Tooltip>}>
                            <Button 
                                variant="light" 
                                className="rounded-circle p-2"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading || isEditingDisabled || activeTab === 'password'}
                            >
                                {uploading ? <Spinner animation="border" size="sm" /> : <FontAwesomeIcon icon={faImage} />}
                            </Button>
                        </OverlayTrigger>

                        <Dropdown drop="up">
                            <OverlayTrigger placement="top" overlay={<Tooltip>Change labels</Tooltip>}>
                                <Dropdown.Toggle variant="light" className="rounded-circle p-2 no-caret" disabled={isEditingDisabled || activeTab === 'password'}>
                                    <FontAwesomeIcon icon={faTag} />
                                </Dropdown.Toggle>
                            </OverlayTrigger>
                            <Dropdown.Menu className="shadow border-0 py-2" style={{ maxHeight: '250px', overflowY: 'auto', minWidth: '200px' }}>
                                <div className="px-3 py-1 mb-1 small fw-bold text-muted">Labels</div>
                                {labels.length === 0 && <Dropdown.Item disabled className="small text-muted">No labels created</Dropdown.Item>}
                                {labels.map(label => (
                                    <Dropdown.Item 
                                        key={label.id} 
                                        onClick={() => handleToggleLabel(label.id)}
                                        className="d-flex justify-content-between align-items-center py-2"
                                    >
                                        <span className="small">{label.name}</span>
                                        {selectedLabels.includes(label.id) && <FontAwesomeIcon icon={faCheck} className="text-primary" />}
                                    </Dropdown.Item>
                                ))}
                            </Dropdown.Menu>
                        </Dropdown>

                        <OverlayTrigger placement="top" overlay={<Tooltip>Delete note</Tooltip>}>
                            <Button 
                                variant="light" 
                                className="rounded-circle p-2 hover-bg-danger"
                                onClick={() => onDelete(note.id)}
                                disabled={note.user_id !== currentUser?.id}
                            >
                                <FontAwesomeIcon icon={faTrash} />
                            </Button>
                        </OverlayTrigger>

                        <OverlayTrigger placement="top" overlay={<Tooltip>{note.is_locked ? 'Security Settings' : 'Lock note'}</Tooltip>}>
                            <Button 
                                variant={activeTab === 'password' ? 'primary' : 'light'} 
                                className={`rounded-circle p-2 ${note.is_locked ? "text-warning" : "text-muted"}`}
                                onClick={() => setActiveTab(activeTab === 'password' ? 'content' : 'password')}
                                disabled={isEditingDisabled}
                            >
                                <FontAwesomeIcon icon={faLock} />
                            </Button>
                        </OverlayTrigger>

                        {note.user_id === currentUser?.id && (
                            <OverlayTrigger placement="top" overlay={<Tooltip>Share note</Tooltip>}>
                                <Button 
                                    variant="light" 
                                    className={`rounded-circle p-2 ${note.is_shared ? "text-info" : "text-muted"} ${!isOnline ? 'opacity-50' : ''}`}
                                    onClick={() => {
                                        if (!isOnline) {
                                            setShowOfflineModal(true);
                                        } else {
                                            setShowShareModal(true);
                                        }
                                    }}
                                    disabled={activeTab === 'password'}
                                >
                                    <FontAwesomeIcon icon={faShareNodes} />
                                </Button>
                            </OverlayTrigger>
                        )}
                    </div>

                    <Button variant="primary" className="rounded-pill px-4" onClick={onClose}>
                        Close
                    </Button>
                </Modal.Footer>
            </div>

            {showShareModal && (
                <ShareModal 
                    show={showShareModal}
                    onHide={() => setShowShareModal(false)}
                    note={note}
                />
            )}

            <OfflineModal show={showOfflineModal} onHide={() => setShowOfflineModal(false)} />
        </Modal>
    );
};

export default NoteModal;
