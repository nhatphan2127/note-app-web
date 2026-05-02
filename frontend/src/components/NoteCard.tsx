import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { usePreferences } from '../PreferencesContext';
import { useConnectivity } from '../ConnectivityContext';
import OfflineModal from './OfflineModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbtack, faLock, faShareNodes, faUser, faEdit, faEye } from '@fortawesome/free-solid-svg-icons';
import type { Note } from '../types';

interface NoteCardProps {
    note: Note;
    onSelect: (note: Note) => void;
    onTogglePin: (e: React.MouseEvent, note: Note) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onSelect, onTogglePin }) => {
    const { preferences } = usePreferences();
    const { isOnline } = useConnectivity();
    const [showOfflineModal, setShowOfflineModal] = React.useState(false);
    const isDark = preferences.theme === 'dark';

    // Cải thiện logic màu sắc thẻ ghi chú
    const getNoteColors = () => {
        if (!preferences.default_note_color || preferences.default_note_color === '#ffffff') {
            return {
                bg: 'var(--card-bg)',
                text: 'var(--text-main)',
                border: 'var(--border-color)'
            };
        }

        // Xử lý đặc biệt cho màu vàng (#ffff00 hoặc tương tự) để tránh chói
        const isYellow = preferences.default_note_color.toLowerCase().startsWith('#ffff') || 
                        preferences.default_note_color.toLowerCase() === 'yellow';
        
        if (isYellow) {
            return {
                bg: 'var(--note-yellow)',
                text: 'var(--note-yellow-text)',
                border: isDark ? 'var(--note-yellow-text)' : 'var(--note-yellow)'
            };
        }

        return {
            bg: isDark ? `${preferences.default_note_color}33` : preferences.default_note_color,
            text: 'var(--text-main)',
            border: preferences.default_note_color
        };
    };

    const colors = getNoteColors();

    const cardStyle: React.CSSProperties = {
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
        borderRadius: '12px'
    };

    return (
        <Card 
            className={`h-100 shadow-sm note-card-hover ${note.is_pinned ? 'border-primary' : ''} ${note.pivot ? 'border-info' : ''}`}
            onClick={() => onSelect(note)}
            style={cardStyle}
        >
            <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex flex-column gap-1 overflow-hidden" style={{ maxWidth: '75%' }}>
                        {note.pivot && (
                            <div className="d-flex align-items-center gap-2 mb-1">
                                <span className="badge bg-info text-white extra-small" title="Shared with me">
                                    <FontAwesomeIcon icon={faShareNodes} />
                                </span>
                                <span className="badge bg-light text-muted border extra-small">
                                    <FontAwesomeIcon icon={note.pivot.permission === 'edit' ? faEdit : faEye} />
                                </span>
                            </div>
                        )}
                        <Card.Title className="mb-0 text-truncate fw-bold" style={{ fontSize: '1.1rem' }}>
                            {note.title || <span className="text-muted opacity-50 fst-italic">Untitled Note</span>}
                        </Card.Title>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <div className={note.is_locked ? "text-warning" : "text-muted"} title={note.is_locked ? "Password Protected" : "Not Protected"}>
                            <FontAwesomeIcon icon={faLock} />
                        </div>
                        <div 
                            className={`${note.is_shared ? "text-info" : "text-muted"} cursor-pointer`} 
                            title={note.is_shared ? "Note is shared" : "Note is not shared"}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isOnline) setShowOfflineModal(true);
                                else onSelect(note); // Open modal which has share options
                            }}
                        >
                            <FontAwesomeIcon icon={faShareNodes} />
                        </div>
                        {!note.pivot && (
                            <Button 
                                variant="link"
                                className="p-0 text-decoration-none shadow-none"
                                onClick={(e) => onTogglePin(e, note)}
                                title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                            >
                                <FontAwesomeIcon 
                                    icon={faThumbtack} 
                                    className={note.is_pinned ? 'text-primary' : 'text-muted'} 
                                    style={{ transform: note.is_pinned ? 'none' : 'rotate(45deg)' }}
                                />
                            </Button>
                        )}
                    </div>
                </div>
                <Card.Text className="text-muted" style={{ 
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                }}>
                    {note.is_locked ? (
                        <span className="text-muted fst-italic opacity-75">
                            <FontAwesomeIcon icon={faLock} className="me-2" />
                            This note is protected with a password.
                        </span>
                    ) : (
                        note.content || <span className="text-muted opacity-50 fst-italic">No content provided...</span>
                    )}
                </Card.Text>
                {!note.is_locked && note.images && note.images.length > 0 && (
                    <div className="mt-2 mb-2">
                        <div className="position-relative" style={{ height: '120px', overflow: 'hidden', borderRadius: '4px' }}>
                            <Card.Img 
                                src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/storage/${note.images[0].image_path}`}
                                style={{ height: '100%', objectFit: 'cover' }}
                            />
                            {note.images.length > 1 && (
                                <div className="position-absolute bottom-0 end-0 bg-dark bg-opacity-50 text-white px-2 py-1 small rounded-start">
                                    +{note.images.length - 1} more
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Card.Body>
            <Card.Footer className="bg-transparent border-0 pt-0 pb-2">
                {note.pivot && note.user && (
                    <div className="small text-muted mb-2 d-flex align-items-center gap-1">
                        <FontAwesomeIcon icon={faUser} size="xs" />
                        <span>From: <strong>{note.user.name}</strong></span>
                        <span className="mx-1">•</span>
                        <span>{new Date(note.pivot.shared_at).toLocaleDateString()}</span>
                    </div>
                )}
                <div className="d-flex flex-column align-items-end gap-2">
                    <div className="d-flex flex-wrap gap-1 w-100">
                        {note.labels?.map(label => (
                            <span key={label.id} className="badge bg-light text-primary border">
                                {label.name}
                            </span>
                        ))}
                    </div>
                    <div className="text-muted extra-small opacity-75">
                        {new Date(note.updated_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                </div>
            </Card.Footer>
            <OfflineModal show={showOfflineModal} onHide={() => setShowOfflineModal(false)} />
        </Card>
    );
};

export default NoteCard;
