import React, { useState } from 'react';
import { Button, Form, Modal} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFont, faSun, faMoon, faPalette, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import '../../public/css/PreferencePage.css'; // Import file CSS trên
import { usePreferences } from '../PreferencesContext';
import { useConnectivity } from '../ConnectivityContext';
import OfflineModal from '../components/OfflineModal';

import api from '../api';

interface PreferencesPageProps {
    onBack: () => void;
}

const PreferencesPage: React.FC<PreferencesPageProps> = ({ onBack }) => {
    const { preferences, updatePreferences } = usePreferences();
    const { isOnline } = useConnectivity();
    const [showOfflineModal, setShowOfflineModal] = useState(false);

    const handleProtectedAction = (action: () => void) => {
        if (!isOnline) {
            setShowOfflineModal(true);
        } else {
            action();
        }
    };

    const handleFontSizeChange = (size: 'small' | 'medium' | 'large') => {
        updatePreferences({ font_size: size });
    };

    const handleThemeToggle = () => {
        updatePreferences({ theme: preferences.theme === 'light' ? 'dark' : 'light' });
    };

    const handleColorSelect = (color: string) => {
        updatePreferences({ default_note_color: color });
    };

    const noteColors = [
        '#ffffff', // White
        '#f28b82', // Red
        '#fbbc04', // Orange
        '#fff475', // Yellow
        '#ccff90', // Green
        '#a7ffeb', // Teal
        '#cbf0f8', // Blue
        '#aecbfa', // Dark Blue
        '#d7aefb', // Purple
        '#fdcfe8'  // Pink
    ];

    return (
        <div className="preferences-container p-3 p-md-4 rounded shadow-sm" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', marginBottom: '1.4em' }}>
            {/* Header: Responsive cho mobile */}
            <div className="d-flex align-items-center mb-3 mb-md-4">
                <Button variant="link" className="text-main p-0 me-2" onClick={onBack}>
                    <FontAwesomeIcon icon={faArrowLeft} size="lg" />
                </Button>
                <h2 className="mb-0 fs-3 fs-md-2">User Preferences</h2>
            </div>

            <hr className="my-4" />

            {/* Font Size Settings */}
            <section className="mb-5">
                <div className="d-flex align-items-center mb-3">
                    <FontAwesomeIcon icon={faFont} className="me-2 text-primary" />
                    <h4 className="mb-0">Font Size</h4>
                </div>
                <p className="text-muted small mb-3">Adjust how text appears across the application.</p>
                <div className="font-size-group">
                    {(['small', 'medium', 'large'] as const).map((size) => (
                        <Button
                            key={size}
                            variant={preferences.font_size === size ? 'primary' : 'outline-primary'}
                            onClick={() => handleFontSizeChange(size)}
                            className="text-capitalize py-2 px-4 me-sm-2"
                        >
                            {size}
                        </Button>
                    ))}
                </div>
            </section>

            {/* Appearance Section */}
            <section className="mb-5">
                <div className="d-flex align-items-center mb-3">
                    <FontAwesomeIcon icon={preferences.theme === 'light' ? faSun : faMoon} className="me-2 text-primary" />
                    <h4 className="mb-0">Appearance</h4>
                </div>
                <div className="d-flex align-items-center justify-content-between justify-content-sm-start bg-light-subtle p-3 rounded">
                    <div className="me-3">
                        <p className="mb-0 fw-bold">{preferences.theme === 'light' ? 'Light Mode' : 'Dark Mode'}</p>
                        <small className="text-muted">Current theme</small>
                    </div>
                    <Form.Check
                        type="switch"
                        id="theme-switch"
                        checked={preferences.theme === 'dark'}
                        onChange={handleThemeToggle}
                        className="custom-switch-lg"
                        style={{ transform: 'scale(1.3)' }}
                    />
                </div>
            </section>

            {/* Default Note Color */}
            <section className="mb-4">
                <div className="d-flex align-items-center mb-3">
                    <FontAwesomeIcon icon={faPalette} className="me-2 text-primary" />
                    <h4 className="mb-0">Default Note Color</h4>
                </div>
                <p className="text-muted small mb-3">Choose the default starting color for your notes.</p>
                <div className="d-flex flex-wrap gap-2 gap-md-3 color-grid">
                    {noteColors.map((color) => (
                        <Button
                            key={color}
                            onClick={() => handleColorSelect(color)}
                            className="color-option p-0 border-2"
                            style={{
                                width: '38px',
                                height: '38px',
                                backgroundColor: color,
                                borderRadius: '50%',
                                border: preferences.default_note_color === color
                                    ? '3px solid #007bff'
                                    : '2px solid rgba(0,0,0,0.1)',
                                boxShadow: preferences.default_note_color === color
                                    ? '0 0 10px rgba(0,123,255,0.4)'
                                    : 'none',
                            }}
                        />
                    ))}
                </div>
            </section>

            <OfflineModal show={showOfflineModal} onHide={() => setShowOfflineModal(false)} />
        </div>
    );
};

export default PreferencesPage;
