import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col, Navbar, Nav, Form, Button, InputGroup, Modal, Badge, ListGroup, Image, Offcanvas } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPlus, faTag, faNoteSticky, faBars, faList, faTableCells, faFilter, faTimes, faLock, faEye, faEyeSlash, faShareNodes, faUserGear, faWifi, faSignal, faGear, faBell, faCheckDouble, faUser, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../AuthContext';
// import { usePreferences } from '../PreferencesContext';
import api from '../api';
import { db } from '../db';
import { syncData, handleNoteCreate, handleNoteUpdate, handleNoteDelete, handleLabelCreate, handleLabelUpdate, handleLabelDelete } from '../sync';
import { useConnectivity } from '../ConnectivityContext';
import '../../public/css/home.css';
import type { Note, Label } from '../types';
import NoteCard from '../components/NoteCard';
import NoteModal from '../components/NoteModal';
import LabelsPage from './LabelsPage';
import PreferencesPage from './PreferencesPage';
import ProfilePage from './ProfilePage';

const Home: React.FC = () => {
    const { logout, user } = useAuth();
    // const { updatePreferences } = usePreferences();
    const [notes, setNotes] = useState<Note[]>([]);
    const [labels, setLabels] = useState<Label[]>([]);
    const [search, setSearch] = useState('');
    const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [verifyingNote, setVerifyingNote] = useState<Note | null>(null);
    const [verifyPassword, setVerifyPassword] = useState('');
    const [showVerifyPasswordInput, setShowVerifyPasswordInput] = useState(false);
    const [isResettingNotePassword, setIsResettingNotePassword] = useState(false);
    const [accountPassword, setAccountPassword] = useState('');
    const [newNotePassword, setNewNotePassword] = useState('');
    const [newNotePasswordConfirm, setNewNotePasswordConfirm] = useState('');
    const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
    const [activeSection, setActiveSection] = useState<'all' | 'shared' | 'labels' | 'preferences' | 'profile'>('all');
    const [pendingAction, setPendingAction] = useState<{ type: 'select' | 'delete' | 'pin', note: Note, event?: React.MouseEvent } | null>(null);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const { isOnline } = useConnectivity();

    const fetchLabels = useCallback(async () => {

        try {
            if (navigator.onLine) {
                const response = await api.get('/labels');
                setLabels(response.data);
                await db.labels.bulkPut(response.data);
            } else {
                const localLabels = await db.labels.toArray();
                setLabels(localLabels);
            }
        } catch (err) {
            console.error('Failed to fetch labels', err);
            const localLabels = await db.labels.toArray();
            setLabels(localLabels);
        }
    }, []);

    const fetchNotifications = useCallback(async () => {
        if (!isOnline) return;
        try {
            const response = await api.get('/notifications');
            setNotifications(response.data);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        }
    }, [isOnline]);

    const markNotificationsAsRead = async () => {
        try {
            await api.post('/notifications/mark-as-read');
            setNotifications([]);
        } catch (err) {
            console.error('Failed to mark notifications as read', err);
        }
    };

    const fetchNotes = useCallback(async () => {
        try {
            if (navigator.onLine && activeSection !== 'shared') {
                const params: any = {};
                if (search) params.search = search;
                if (selectedLabelIds.length > 0) {
                    params.label_ids = selectedLabelIds.join(',');
                }

                const response = await api.get('/notes', { params });
                setNotes(response.data);
                // Sync local DB with what we got (only if not filtering)
                if (!search && selectedLabelIds.length === 0) {
                    await db.notes.clear();
                    await db.notes.bulkPut(response.data);
                }
            } else if (activeSection === 'shared') {
                if (navigator.onLine) {
                    const response = await api.get('/shared-notes');
                    let filteredData = response.data;
                    await db.shared_notes.clear();
                    await db.shared_notes.bulkPut(filteredData);
                    if (search) {
                        filteredData = filteredData.filter((n: Note) =>
                            n.title?.toLowerCase().includes(search.toLowerCase()) ||
                            n.content?.toLowerCase().includes(search.toLowerCase())
                        );
                    }
                    setNotes(filteredData);
                } else {
                    let localShared = await db.shared_notes.toArray();
                    if (search) {
                        localShared = localShared.filter((n: Note) =>
                            n.title?.toLowerCase().includes(search.toLowerCase()) ||
                            n.content?.toLowerCase().includes(search.toLowerCase())
                        );
                    }
                    setNotes(localShared);
                }
            } else {
                // Offline or failed online fetch
                let localNotes = await db.notes.toArray();
                if (search) {
                    localNotes = localNotes.filter(n =>
                        n.title?.toLowerCase().includes(search.toLowerCase()) ||
                        n.content?.toLowerCase().includes(search.toLowerCase())
                    );
                }
                if (selectedLabelIds.length > 0) {
                    localNotes = localNotes.filter(n =>
                        n.labels.some(l => selectedLabelIds.includes(l.id))
                    );
                }
                setNotes(sortNotes(localNotes));
            }
        } catch (err) {
            console.error('Failed to fetch notes', err);
            const localNotes = await db.notes.toArray();
            setNotes(localNotes);
        }
    }, [search, selectedLabelIds, activeSection]);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        console.log('Fetching labels and notes...');
        fetchLabels();
        if (isOnline) {
            syncData().then(() => {
                fetchNotes();
                fetchNotifications();
            });
        } else {
            fetchNotes();
        }
    }, [fetchLabels, fetchNotes, fetchNotifications, isOnline]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchNotes();
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [search, selectedLabelIds, activeSection, fetchNotes]);

    useEffect(() => {
        const echo = (window as any).Echo;
        if (!echo || notes.length === 0) return;

        const channels: any[] = [];

        notes.forEach(note => {
            const channelName = `note.${note.id}`;
            const channel = echo.private(channelName)
                .listen('NoteUpdated', (e: any) => {
                    console.log("Đã nhận dữ liệu socket:", e)
                    if (e.user_id !== user?.id) {
                        handleUpdateNote(e.id, {
                            title: e.title,
                            content: e.content
                        }, true);
                    }
                });
            channels.push({ name: channelName, channel });
        });

        return () => {
            channels.forEach(c => {
                echo.leave(c.name);
            });
        };
    }, [notes.length, user?.id]); // Listen when notes list changes

    const sortNotes = (notesList: Note[]) => {
        return [...notesList].sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) {
                return a.is_pinned ? -1 : 1;
            }
            // If both are pinned or both are unpinned, sort by pinned_at or updated_at
            const aTime = a.is_pinned && a.pinned_at ? new Date(a.pinned_at).getTime() : new Date(a.updated_at).getTime();
            const bTime = b.is_pinned && b.pinned_at ? new Date(b.pinned_at).getTime() : new Date(b.updated_at).getTime();
            return bTime - aTime;
        });
    };

    const handleCreateNote = async () => {
        try {
            const newNote = await handleNoteCreate({ title: '', content: '' });
            setNotes(prev => [newNote, ...prev]);
            setSelectedNote(newNote);
            setIsEditing(true);
        } catch (err) {
            alert('Failed to create note');
        }
    };

    const handleUpdateNote = async (noteId: number, data: Partial<Note>, skipSync = false) => {
        try {
            if (!skipSync) {
                await handleNoteUpdate(noteId, data);
            }
            setNotes(prevNotes => {
                const existing = prevNotes.find(n => n.id === noteId);
                if (existing) {
                    const updated = { ...existing, ...data };
                    // If pinning status changed, update pinned_at locally for immediate sorting
                    if (data.is_pinned !== undefined && data.is_pinned !== existing.is_pinned) {
                        updated.pinned_at = data.is_pinned ? new Date().toISOString() : undefined;
                    }
                    const updatedNotes = prevNotes.map(n => n.id === noteId ? updated : n);
                    
                    if (selectedNote?.id === noteId) {
                        setSelectedNote(updated);
                    }
                    
                    return sortNotes(updatedNotes);
                }
                return prevNotes;
            });
        } catch (err) {
            console.error('Failed to update note', err);
        }
    };

    const handleDeleteNote = async (noteId: number) => {
        const note = notes.find(n => n.id === noteId);
        if (note?.is_locked && !verifyingNote) {
            setPendingAction({ type: 'delete', note });
            setVerifyingNote(note);
            return;
        }

        setNoteToDelete(noteId);
    };

    const confirmDeleteNote = async () => {
        if (!noteToDelete) return;
        try {
            await handleNoteDelete(noteToDelete);
            setNotes(notes.filter(n => n.id !== noteToDelete));
            if (selectedNote?.id === noteToDelete) {
                setSelectedNote(null);
                setIsEditing(false);
            }
            setNoteToDelete(null);
        } catch (err) {
            alert('Failed to delete note');
            setNoteToDelete(null);
        }
    };

    const handleTogglePin = async (e: React.MouseEvent, note: Note) => {
        e.stopPropagation();
        if (note.is_locked && !verifyingNote) {
            setPendingAction({ type: 'pin', note, event: e });
            setVerifyingNote(note);
            return;
        }

        await handleUpdateNote(note.id, { is_pinned: !note.is_pinned });
    };

    const handleVerifyPassword = async () => {
        if (!verifyingNote) return;
        if (!isOnline) {
            alert('You must be online to verify note password');
            return;
        }
        try {
            await api.post(`/notes/${verifyingNote.id}/verify-password`, { password: verifyPassword });

            const action = pendingAction;
            setVerifyingNote(null);
            setVerifyPassword('');
            setPendingAction(null);

            if (action) {
                if (action.type === 'select') {
                    setSelectedNote(action.note);
                    setIsEditing(true);
                } else if (action.type === 'delete') {
                    handleDeleteNote(action.note.id);
                } else if (action.type === 'pin') {
                    handleTogglePin(action.event!, action.note);
                }
            }
        } catch (err) {
            alert('Invalid password');
        }
    };

    const handleResetNotePassword = async () => {
        if (!verifyingNote) return;
        if (!accountPassword || !newNotePassword || !newNotePasswordConfirm) {
            alert('Please fill in all fields');
            return;
        }
        if (newNotePassword !== newNotePasswordConfirm) {
            alert('New passwords do not match');
            return;
        }
        try {
            await api.post(`/notes/${verifyingNote.id}/reset-password`, {
                account_password: accountPassword,
                new_note_password: newNotePassword,
                new_note_password_confirmation: newNotePasswordConfirm
            });

            alert('Note password reset successfully. You can now use your new password.');
            setIsResettingNotePassword(false);
            setAccountPassword('');
            setNewNotePassword('');
            setNewNotePasswordConfirm('');
            // Switch back to verification mode with the new password potentially pre-filled or just empty
            setVerifyPassword('');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to reset password');
        }
    };

    const handleNoteSelect = (note: Note) => {
        if (note.is_locked) {
            setPendingAction({ type: 'select', note });
            setVerifyingNote(note);
        } else {
            setSelectedNote(note);
            setIsEditing(true);
        }
    };

    const handleAddLabel = async (name: string) => {
        try {

            const newLabel = await handleLabelCreate({ name });
            setLabels([...labels, newLabel]);
        } catch (err) {
            alert('Failed to add label');
        }
    };

    const handleRenameLabel = async (labelId: number, name: string) => {
        try {
            const updatedLabel = await handleLabelUpdate(labelId, { name });
            setLabels(labels.map(l => l.id === labelId ? updatedLabel : l));
            fetchNotes();
        } catch (err) {
            alert('Failed to rename label');
        }
    };

    const [labelToDelete, setLabelToDelete] = useState<number | null>(null);

    const handleDeleteLabel = async (labelId: number) => {
        setLabelToDelete(labelId);
    };

    const confirmDeleteLabel = async () => {
        if (!labelToDelete) return;
        try {
            await handleLabelDelete(labelToDelete);
            setLabels(labels.filter(l => l.id !== labelToDelete));
            setSelectedLabelIds(prev => prev.filter(id => id !== labelToDelete));
            fetchNotes();
            setLabelToDelete(null);
        } catch (err) {
            alert('Failed to delete label');
            setLabelToDelete(null);
        }
    };

    const toggleLabelFilter = (labelId: number) => {
        setSelectedLabelIds(prev =>
            prev.includes(labelId)
                ? prev.filter(id => id !== labelId)
                : [...prev, labelId]
        );
    };

    return (
        <div className="home-wrapper" style={{ minHeight: '100vh' }}>
            {user && !user.email_verified_at && (
                <div className="bg-warning text-center py-2 px-4 shadow-sm">
                    <FontAwesomeIcon icon={faLock} className="me-2" />
                    Your account is unverified. Please check your email (<strong>{user.email}</strong>) to complete the activation process.
                </div>
            )}
            <Navbar expand="lg" className="shadow-sm sticky-top mb-4 py-2" style={{ backgroundColor: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
                <Container fluid className="px-4 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                        <Button 
                            variant="light" 
                            className="d-lg-none border-0 bg-transparent p-0" 
                            onClick={() => setShowMobileMenu(true)}
                        >
                            <FontAwesomeIcon icon={faBars} className="fs-4 text-dark" />
                        </Button>
                        <Navbar.Brand href="/" className="fw-bold text-primary fs-3 m-0" style={{ letterSpacing: '-0.5px' }}>
                            Notes<span className="text-dark">App</span>
                        </Navbar.Brand>
                    </div>

                    <div className="d-flex align-items-center gap-3">

                        <div className="position-relative" style={{ cursor: 'pointer' }} onClick={() => setShowNotifications(!showNotifications)}>
                            <FontAwesomeIcon icon={faBell} className="text-muted fs-5" />
                            {notifications.length > 0 && (
                                <Badge pill bg="danger" className="position-absolute top-0 start-100 translate-middle" style={{ fontSize: '0.6rem', padding: '0.25em 0.5em' }}>
                                    {notifications.length}
                                </Badge>
                            )}
                        </div>

                        <div className="d-none d-lg-flex align-items-center gap-2 border-start ps-3 ms-2" style={{ cursor: 'pointer' }} onClick={() => setActiveSection('profile')}>
                            {user?.avatar ? (
                                <Image 
                                    src={`http://localhost:8000/storage/${user.avatar}`} 
                                    roundedCircle 
                                    width="32" 
                                    height="32" 
                                    className="object-fit-cover shadow-sm border border-2 border-white"
                                />
                            ) : (
                                <div className="bg-light rounded-circle d-flex align-items-center justify-content-center shadow-sm border border-2 border-white" style={{ width: '32px', height: '32px' }}>
                                    <FontAwesomeIcon icon={faUser} className="text-secondary small" />
                                </div>
                            )}
                            <div className="fw-bold text-dark small">{user?.name}</div>
                        </div>

                        <Badge bg={isOnline ? 'success' : 'secondary'} className="d-none d-sm-inline-block px-3 py-2 rounded-pill shadow-sm small">
                            <FontAwesomeIcon icon={isOnline ? faWifi : faSignal} className="me-1" />
                            {isOnline ? 'Online' : 'Offline'}
                        </Badge>
                    </div>
                </Container>
            </Navbar>

            {/* Mobile Sidebar (Offcanvas) */}
            <Offcanvas show={showMobileMenu} onHide={() => setShowMobileMenu(false)} placement="start" style={{ width: '280px' }}>
                <Offcanvas.Header closeButton className="border-bottom px-4">
                    <Offcanvas.Title className="fw-bold text-primary">
                        Notes<span className="text-dark">App</span>
                    </Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body className="p-0">
                    <div className="p-4 border-bottom bg-light">
                        <div className="d-flex align-items-center gap-3">
                            {user?.avatar ? (
                                <Image 
                                    src={`http://localhost:8000/storage/${user.avatar}`} 
                                    roundedCircle 
                                    width="35" 
                                    height="35" 
                                    className="object-fit-cover shadow-sm border border-2 border-white"
                                />
                            ) : (
                                <div className="bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm border border-2 border-white" style={{ width: '35px', height: '35px' }}>
                                    <FontAwesomeIcon icon={faUser} className="text-secondary fs-4" />
                                </div>
                            )}
                            <div>
                                <div className="fw-bold text-dark">{user?.name}</div>
                                <div className="text-muted small">{user?.email}</div>
                            </div>
                        </div>
                    </div>

                    <Nav className="flex-column p-3">
                        <Nav.Link
                            active={activeSection === 'all'}
                            className={`rounded-3 mb-2 px-3 py-2 d-flex align-items-center gap-3 ${activeSection === 'all' ? 'bg-primary text-white' : 'text-dark'}`}
                            onClick={() => { setActiveSection('all'); setShowMobileMenu(false); }}
                        >
                            <FontAwesomeIcon icon={faNoteSticky} /> All Notes
                        </Nav.Link>
                        <Nav.Link
                            active={activeSection === 'shared'}
                            className={`rounded-3 mb-2 px-3 py-2 d-flex align-items-center gap-3 ${activeSection === 'shared' ? 'bg-primary text-white' : 'text-dark'}`}
                            onClick={() => { setActiveSection('shared'); setShowMobileMenu(false); }}
                        >
                            <FontAwesomeIcon icon={faShareNodes} /> Shared with me
                        </Nav.Link>
                        <Nav.Link
                            active={activeSection === 'labels'}
                            className={`rounded-3 mb-2 px-3 py-2 d-flex align-items-center gap-3 ${activeSection === 'labels' ? 'bg-primary text-white' : 'text-dark'}`}
                            onClick={() => { setActiveSection('labels'); setShowMobileMenu(false); }}
                        >
                            <FontAwesomeIcon icon={faTag} /> Labels
                        </Nav.Link>
                        <hr className="my-3 mx-3" />
                        <Nav.Link
                            active={activeSection === 'preferences'}
                            className={`rounded-3 mb-2 px-3 py-2 d-flex align-items-center gap-3 ${activeSection === 'preferences' ? 'bg-primary text-white' : 'text-dark'}`}
                            onClick={() => { setActiveSection('preferences'); setShowMobileMenu(false); }}
                        >
                            <FontAwesomeIcon icon={faGear} /> Settings
                        </Nav.Link>
                        <Nav.Link
                            active={activeSection === 'profile'}
                            className={`rounded-3 mb-2 px-3 py-2 d-flex align-items-center gap-3 ${activeSection === 'profile' ? 'bg-primary text-white' : 'text-dark'}`}
                            onClick={() => { setActiveSection('profile'); setShowMobileMenu(false); }}
                        >
                            <FontAwesomeIcon icon={faUserGear} /> Profile
                        </Nav.Link>
                        <Button 
                            variant="outline-danger" 
                            className="mt-4 mx-3 rounded-pill" 
                            onClick={logout}
                        >
                            Logout
                        </Button>
                    </Nav>
                    
                    <div className="position-absolute bottom-0 w-100 p-4 border-top bg-light">
                        <div className={`d-flex align-items-center gap-2 ${isOnline ? 'text-success' : 'text-secondary'} small fw-bold`}>
                            <FontAwesomeIcon icon={isOnline ? faWifi : faSignal} />
                            {isOnline ? 'System Online' : 'System Offline'}
                        </div>
                    </div>
                </Offcanvas.Body>
            </Offcanvas>

            <Container fluid className="px-4">
                <Row>
                    <Col lg={2} className="mb-4 d-none d-lg-flex flex-column" style={{ minHeight: 'calc(100vh - 100px)' }}>
                        <div className="d-grid">
                            <Button variant="primary" size="lg" className="shadow-sm py-3 fw-bold d-flex align-items-center justify-content-center gap-2" onClick={handleCreateNote}>
                                <FontAwesomeIcon icon={faPlus} /> New Note
                            </Button>
                        </div>
                        <Nav className="flex-column mt-4">
                            <Nav.Link
                                href="#"
                                active={activeSection === 'all' && selectedLabelIds.length === 0}
                                className={`rounded mb-1 ${activeSection === 'all' && selectedLabelIds.length === 0 ? 'bg-primary text-white' : 'text-main'}`}
                                onClick={() => { setActiveSection('all'); setSelectedLabelIds([]); }}
                            >
                                <FontAwesomeIcon icon={faNoteSticky} className="me-2" /> All Notes
                            </Nav.Link>
                            <Nav.Link
                                href="#"
                                active={activeSection === 'shared'}
                                className={`rounded mb-1 ${activeSection === 'shared' ? 'bg-primary text-white' : 'text-main'}`}
                                onClick={() => { setActiveSection('shared'); setSelectedLabelIds([]); }}
                            >
                                <FontAwesomeIcon icon={faShareNodes} className="me-2" /> Shared with me
                            </Nav.Link>
                            <Nav.Link
                                href="#"
                                active={activeSection === 'labels'}
                                className={`rounded mb-1 mt-1 ${activeSection === 'labels' ? 'bg-primary text-white' : 'text-main'}`}
                                onClick={() => setActiveSection('labels')}
                            >
                                <FontAwesomeIcon icon={faTag} className="me-2" /> Label Management
                            </Nav.Link>
                            <Nav.Link
                                href="#"
                                active={activeSection === 'preferences'}
                                className={`rounded mb-1 ${activeSection === 'preferences' ? 'bg-primary text-white' : 'text-main'}`}
                                onClick={() => { setActiveSection('preferences'); }}
                            >
                                <FontAwesomeIcon icon={faGear} className="me-2" /> User Preferences
                            </Nav.Link>
                            <Nav.Link
                                href="#"
                                active={activeSection === 'profile'}
                                className={`rounded mb-1 ${activeSection === 'profile' ? 'bg-primary text-white' : 'text-main'}`}
                                onClick={() => { setActiveSection('profile'); }}
                            >
                                <FontAwesomeIcon icon={faUser} className="me-2" /> Profile Settings
                            </Nav.Link>
                        </Nav>

                        <div className="mt-auto pt-4 border-top">
                            <Button 
                                variant="outline-danger" 
                                className="w-100 rounded-pill d-flex align-items-center justify-content-center gap-2" 
                                onClick={logout}
                            >
                                <FontAwesomeIcon icon={faSignOutAlt} /> Logout
                            </Button>
                        </div>
                        
                    </Col >
                    <Col xs={12} lg={10}>
                        {activeSection === 'labels' ? (
                            <div className="p-3 rounded shadow-sm" style={{ backgroundColor: 'var(--card-bg)', marginBottom: '1.4em' }}>
                                <LabelsPage
                                    labels={labels}
                                    onAddLabel={handleAddLabel}
                                    onRenameLabel={handleRenameLabel}
                                    onDeleteLabel={handleDeleteLabel}
                                />
                            </div>
                        ) : activeSection === 'preferences' ? (
                            <PreferencesPage onBack={() => setActiveSection('all')} />
                        ) : activeSection === 'profile' ? (
                            <ProfilePage onBack={() => setActiveSection('all')} />
                        ) : (
                            <>
                                <div className="mb-2 d-flex flex-wrap align-items-center justify-content-between gap-3 p-3 rounded shadow-sm" style={{ backgroundColor: 'var(--card-bg)' }}>
                                    <div className="d-flex flex-wrap align-items-center gap-2">
                                        <span className="text-muted me-2"><FontAwesomeIcon icon={faFilter} /> Filter:</span>
                                        {labels.map(label => (
                                            <Button
                                                key={label.id}
                                                variant={selectedLabelIds.includes(label.id) ? "primary" : "outline-secondary"}
                                                size="sm"
                                                className="rounded-pill px-3"
                                                onClick={() => toggleLabelFilter(label.id)}
                                            >
                                                <FontAwesomeIcon icon={faTag} className="me-1" size="xs" />
                                                {label.name}
                                                {selectedLabelIds.includes(label.id) && (
                                                    <FontAwesomeIcon icon={faTimes} className="ms-2" size="xs" />
                                                )}
                                            </Button>
                                        ))}
                                        {selectedLabelIds.length > 0 && (
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="text-muted text-decoration-none"
                                                onClick={() => setSelectedLabelIds([])}
                                            >
                                                Clear All
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div
                                    className="d-flex justify-content-between align-items-center "
                                    style={{ minHeight: '60px', marginBottom: '0.6rem' }}
                                >
                                    {/* Nút chuyển đổi View - Nằm bên trái */}
                                    <Button
                                        variant="light"
                                        size="sm"
                                        className="d-flex align-items-center gap-2 shadow-sm border"
                                        onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                                        style={{ borderRadius: '8px', padding: '6px 12px' }}
                                    >
                                        <FontAwesomeIcon icon={viewMode === 'grid' ? faList : faTableCells} />
                                        <span style={{ fontWeight: '500' }}>
                                            {viewMode === 'grid' ? 'List View' : 'Grid View'}
                                        </span>
                                    </Button>

                                    {/* Form Tìm kiếm - Nằm bên phải */}
                                    <Form style={{ width: '40%', maxWidth: '400px', border: '1px solid var(--border-color)', borderRadius: '8px' }} onSubmit={(e) => e.preventDefault()}>
                                        <InputGroup className="shadow-sm" style={{ borderRadius: '10px', overflow: 'hidden' }}>
                                            <Form.Control
                                                type="search"
                                                placeholder="Search notes..."
                                                className="border-0 ps-3"
                                                aria-label="Search"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                style={{
                                                    backgroundColor: 'var(--bg-color)',
                                                    boxShadow: 'none',
                                                    height: '40px'
                                                }}
                                            />
                                            <Button
                                                variant="white"
                                                className="border-0 text-muted"
                                                style={{ backgroundColor: 'var(--bg-color)' }}
                                            >
                                                <FontAwesomeIcon icon={faSearch} />
                                            </Button>
                                        </InputGroup>
                                    </Form>
                                </div>

                                <div className={`notes-container ${viewMode === 'grid' ? 'row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4' : 'd-flex flex-column gap-3'}`}
                                    style={{ paddingBottom: '1.4em' }}
                                >
                                    {notes.map(note => (
                                        <div key={note.id} className={viewMode === 'grid' ? 'col' : 'w-100'}>
                                            <NoteCard
                                                note={note}
                                                onSelect={handleNoteSelect}
                                                onTogglePin={handleTogglePin}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {notes.length === 0 && (
                                    <div className="text-center mt-5 py-5">
                                        <h3 className="text-muted">No notes found</h3>
                                        <p className="text-muted">Create your first note to get started!</p>
                                    </div>
                                )}
                            </>
                        )}
                    </Col>
                </Row>
            </Container>

            <Modal show={showNotifications} onHide={() => setShowNotifications(false)} centered scrollable className="notification-modal">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fs-5 fw-bold d-flex align-items-center">
                        <FontAwesomeIcon icon={faBell} className="me-2 text-primary" />
                        Notifications
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-3">
                    {notifications.length === 0 ? (
                        <div className="text-center py-5">
                            <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                                <FontAwesomeIcon icon={faBell} className="text-muted fs-4" />
                            </div>
                            <p className="text-muted mb-0">No new notifications</p>
                        </div>
                    ) : (
                        <ListGroup variant="flush">
                            {notifications.map((notification) => (
                                <ListGroup.Item
                                    key={notification.id}
                                    className="px-0 py-3 border-0 border-bottom"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                        if (notification.data.note_id) {
                                            setActiveSection('shared');
                                            setShowNotifications(false);
                                        }
                                    }}
                                >
                                    <div className="d-flex align-items-start gap-3">
                                        <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '40px', height: '40px' }}>
                                            <FontAwesomeIcon icon={faShareNodes} />
                                        </div>
                                        <div className="flex-grow-1">
                                            <p className="mb-1 small fw-medium text-dark">{notification.data.message}</p>
                                            <div className="text-muted extra-small d-flex align-items-center">
                                                <span className="me-2">{new Date(notification.created_at).toLocaleDateString()}</span>
                                                <span>{new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    {notifications.length > 0 && (
                        <Button variant="outline-primary" size="sm" className="rounded-pill px-3" onClick={markNotificationsAsRead}>
                            <FontAwesomeIcon icon={faCheckDouble} className="me-2" />
                            Mark all as read
                        </Button>
                    )}
                    <Button variant="light" size="sm" className="rounded-pill px-3" onClick={() => setShowNotifications(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            {isEditing && selectedNote && (
                <NoteModal
                    note={selectedNote}
                    onClose={() => {
                        setIsEditing(false);
                        fetchNotes();
                    }}
                    onUpdate={(id, data) => handleUpdateNote(id, data)}
                    onDelete={handleDeleteNote}
                    labels={labels}
                />
            )}

            <Modal 
                show={!!verifyingNote} 
                onHide={() => { setVerifyingNote(null); setVerifyPassword(''); setPendingAction(null); setIsResettingNotePassword(false); }} 
                centered 
                size={isResettingNotePassword ? undefined : "sm"}
                className="password-modal"
            >
                <Modal.Body className="p-4 text-center">
                    <div className="mb-3">
                        <div className="bg-warning bg-opacity-10 text-warning rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '64px', height: '64px' }}>
                            <FontAwesomeIcon icon={faLock} className="fs-3" />
                        </div>
                        <h4 className="fw-bold mb-1">{isResettingNotePassword ? 'Security Recovery' : 'Note Protected'}</h4>
                        <p className="text-muted small">
                            {isResettingNotePassword 
                                ? 'Verify your identity to set a new password' 
                                : 'Please enter the password to access this note'}
                        </p>
                    </div>

                    {!isResettingNotePassword ? (
                        <div className="mt-4">
                            <Form.Group className="mb-3">
                                <InputGroup className="shadow-sm rounded-3 overflow-hidden border">
                                    <Form.Control
                                        type={showVerifyPasswordInput ? "text" : "password"}
                                        placeholder="Password"
                                        value={verifyPassword}
                                        onChange={(e) => setVerifyPassword(e.target.value)}
                                        autoFocus
                                        className="border-0 py-2 ps-3"
                                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                                        style={{ backgroundColor: 'var(--bg-color)' }}
                                    />
                                    <Button 
                                        variant="white" 
                                        className="border-0 text-muted" 
                                        onClick={() => setShowVerifyPasswordInput(!showVerifyPasswordInput)}
                                        style={{ backgroundColor: 'var(--bg-color)' }}
                                    >
                                        <FontAwesomeIcon icon={showVerifyPasswordInput ? faEyeSlash : faEye} />
                                    </Button>
                                </InputGroup>
                            </Form.Group>
                            
                            <div className="d-grid gap-2 mb-3">
                                <Button variant="primary" className="rounded-pill py-2 fw-bold" onClick={handleVerifyPassword}>
                                    Unlock Note
                                </Button>
                                <Button 
                                    variant="link" 
                                    size="sm" 
                                    className="text-muted text-decoration-none small"
                                    onClick={() => setIsResettingNotePassword(true)}
                                >
                                    Forgot password?
                                </Button>
                            </div>
                            
                            <Button 
                                variant="link" 
                                size="sm" 
                                className="text-muted text-decoration-none" 
                                onClick={() => { setVerifyingNote(null); setVerifyPassword(''); setPendingAction(null); }}
                            >
                                Cancel
                            </Button>
                        </div>
                    ) : (
                        <div className="mt-4 text-start">
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold opacity-75">Account Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Enter login password"
                                    value={accountPassword}
                                    onChange={(e) => setAccountPassword(e.target.value)}
                                    className="bg-light border-0 py-2"
                                />
                            </Form.Group>
                            <hr className="my-4 opacity-10" />
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold opacity-75">New Note Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Min 4 characters"
                                    value={newNotePassword}
                                    onChange={(e) => setNewNotePassword(e.target.value)}
                                    className="bg-light border-0 py-2"
                                />
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label className="small fw-bold opacity-75">Confirm New Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Repeat new password"
                                    value={newNotePasswordConfirm}
                                    onChange={(e) => setNewNotePasswordConfirm(e.target.value)}
                                    className="bg-light border-0 py-2"
                                />
                            </Form.Group>

                            <div className="d-grid gap-2">
                                <Button variant="primary" className="rounded-pill py-2 fw-bold" onClick={handleResetNotePassword}>
                                    Reset & Save
                                </Button>
                                <Button 
                                    variant="light" 
                                    className="rounded-pill py-2 fw-bold" 
                                    onClick={() => setIsResettingNotePassword(false)}
                                >
                                    Back
                                </Button>
                            </div>
                        </div>
                    )}
                </Modal.Body>
            </Modal>

            {/* Custom Delete Confirmation Modal for Notes */}
            <Modal show={noteToDelete !== null} onHide={() => setNoteToDelete(null)} centered size="sm">
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fs-5 fw-bold text-danger">Delete Note?</Modal.Title>
                </Modal.Header>
                <Modal.Body className="py-0">
                    <p className="small text-muted mb-0">Are you sure you want to delete this note? This action cannot be undone.</p>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="link" size="sm" className="text-muted text-decoration-none" onClick={() => setNoteToDelete(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" size="sm" className="rounded-pill px-3" onClick={confirmDeleteNote}>
                        Delete
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Custom Delete Confirmation Modal for Labels */}
            <Modal show={labelToDelete !== null} onHide={() => setLabelToDelete(null)} centered size="sm">
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fs-5 fw-bold text-danger">Delete Label?</Modal.Title>
                </Modal.Header>
                <Modal.Body className="py-0">
                    <p className="small text-muted mb-0">Are you sure you want to delete this label? This will not delete the notes.</p>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="link" size="sm" className="text-muted text-decoration-none" onClick={() => setLabelToDelete(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" size="sm" className="rounded-pill px-3" onClick={confirmDeleteLabel}>
                        Delete
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Floating Action Button for Mobile */}
            <button 
                className="fab d-lg-none" 
                onClick={handleCreateNote}
                title="New Note"
            >
                <FontAwesomeIcon icon={faPlus} />
            </button>

        </div>
    );
};

export default Home;
