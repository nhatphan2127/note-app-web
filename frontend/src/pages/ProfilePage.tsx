import React, { useState, useRef } from 'react';
import { Form, Button, Alert, Image, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSave, faArrowLeft, faUpload, faCheck, faKey } from '@fortawesome/free-solid-svg-icons';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useAuth } from '../AuthContext';
import api from '../api';

interface ProfilePageProps {
    onBack: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
    const { user, updateUser } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [message, setMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);
    const [loading, setLoading] = useState(false);

    // Password change states
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);

    // Avatar related states
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const imgRef = useRef<HTMLImageElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setCrop(undefined); // Reset crop when new image is selected
            const file = e.target.files[0];
            setSelectedFile(file);
            const reader = new FileReader();
            reader.addEventListener('load', () => setPreviewUrl(reader.result?.toString() || null));
            reader.readAsDataURL(file);
        }
    };

    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        const { width, height } = e.currentTarget;
        const newCrop = centerCrop(
            makeAspectCrop(
                {
                    unit: '%',
                    width: 90,
                },
                1,
                width,
                height
            ),
            width,
            height
        );

        setCrop(newCrop);
        
        // Also set completedCrop so the button is enabled immediately
        setCompletedCrop({
            unit: 'px',
            x: (newCrop.x * width) / 100,
            y: (newCrop.y * height) / 100,
            width: (newCrop.width * width) / 100,
            height: (newCrop.height * height) / 100,
        });
    }

    const getCroppedImg = async (image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('No 2d context');
        }

        ctx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            crop.width * scaleX,
            crop.height * scaleY,
            0,
            0,
            crop.width,
            crop.height
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Canvas is empty'));
                    return;
                }
                resolve(blob);
            }, 'image/jpeg');
        });
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const response = await api.put('/user/profile', { name, bio });
            updateUser(response.data.user);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err: any) {
            setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateAvatar = async () => {
        if (!imgRef.current || !completedCrop) return;

        setLoading(true);
        setMessage(null);

        try {
            const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
            const formData = new FormData();
            formData.append('avatar', croppedBlob, 'avatar.jpg');

            const response = await api.post('/user/avatar', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            updateUser(response.data.user);
            setMessage({ type: 'success', text: 'Avatar updated successfully!' });
            setPreviewUrl(null);
            setSelectedFile(null);
        } catch (err: any) {
            setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to update avatar' });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'danger', text: 'New passwords do not match.' });
            return;
        }

        if (newPassword.length < 8) {
            setMessage({ type: 'danger', text: 'New password must be at least 8 characters.' });
            return;
        }

        setPasswordSubmitting(true);
        try {
            await api.post('/change-password', {
                current_password: currentPassword,
                password: newPassword,
                password_confirmation: confirmPassword
            });
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordModal(false);
        } catch (err: any) {
            setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to change password. Please check your current password.' });
        } finally {
            setPasswordSubmitting(false);
        }
    };

    const avatarUrl = user?.avatar 
        ? `${import.meta.env.VITE_API_BASE_URL}/storage/${user.avatar}` 
        : null;

    return (
        <div className="profile-page">
            <div className="d-flex align-items-center mb-4">
                <Button variant="link" className="p-0 me-3 text-main" onClick={onBack}>
                    <FontAwesomeIcon icon={faArrowLeft} size="lg" />
                </Button>
                <h2 className="mb-0">Profile Settings</h2>
            </div>

            {message && <Alert variant={message.type} dismissible onClose={() => setMessage(null)}>{message.text}</Alert>}

            <div className="row">
                <div className="col-md-4 text-center mb-4">
                    <div className="position-relative d-inline-block">
                        <div 
                            className="rounded-circle overflow-hidden bg-light d-flex align-items-center justify-content-center shadow-sm"
                            style={{ width: '150px', height: '150px', border: '4px solid white' }}
                        >
                            {avatarUrl ? (
                                <Image src={avatarUrl} alt="Avatar" fluid style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <FontAwesomeIcon icon={faUser} size="4x" className="text-secondary" />
                            )}
                        </div>
                        <Button 
                            variant="primary" 
                            size="sm" 
                            className="position-absolute bottom-0 end-0 rounded-circle shadow"
                            style={{ width: '40px', height: '40px' }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FontAwesomeIcon icon={faUpload} />
                        </Button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            accept="image/*"
                            onChange={onSelectFile}
                        />
                    </div>
                    <p className="mt-3 text-muted small">JPG, PNG or GIF. Max size 2MB.</p>
                </div>

                <div className="col-md-8">
                    <Form onSubmit={handleUpdateProfile}>
                        <Form.Group className="mb-3">
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control type="email" value={user?.email || ''} disabled />
                            <Form.Text className="text-muted">Email cannot be changed.</Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Full Name</Form.Label>
                            <Form.Control 
                                type="text" 
                                value={name || ""} 
                                onChange={(e) => setName(e.target.value)} 
                                required 
                                maxLength={255}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Bio</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={3} 
                                value={bio || ""} 
                                onChange={(e) => setBio(e.target.value)} 
                                maxLength={1000}
                                placeholder="Tell us about yourself..."
                            />
                        </Form.Group>

                        <div className="d-grid d-md-flex justify-content-md-end">
                            <Button variant="primary" type="submit" disabled={loading} className="px-4">
                                <FontAwesomeIcon icon={faSave} className="me-2" />
                                {loading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </Form>

                    
                </div>
                <hr className="my-4" />

                    <div className="security-section" style={{paddingBottom: '2em'}}>
                        <h4>Security</h4>
                        <p className="text-muted small">Change your account password to keep it secure.</p>
                        <Button
                            variant="outline-danger"
                            onClick={() => setShowPasswordModal(true)}
                            className="px-4"
                        >
                            <FontAwesomeIcon icon={faKey} className="me-2" />
                            Change Password
                        </Button>
                    </div>
            </div>

            {/* Password Modal */}
            <Modal show={showPasswordModal} onHide={() => !passwordSubmitting && setShowPasswordModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fs-5">Change Account Password</Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-0">
                    <Form onSubmit={handlePasswordChange}>
                        <Form.Group className="mb-3">
                            <Form.Label className="small text-muted">Current Password</Form.Label>
                            <Form.Control
                                type={showPasswords ? "text" : "password"}
                                placeholder="Enter current password"
                                value={currentPassword || ""}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                disabled={passwordSubmitting}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="small text-muted">New Password</Form.Label>
                            <Form.Control
                                type={showPasswords ? "text" : "password"}
                                placeholder="Min 8 characters"
                                value={newPassword || ""}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                disabled={passwordSubmitting}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="small text-muted">Confirm New Password</Form.Label>
                            <Form.Control
                                type={showPasswords ? "text" : "password"}
                                placeholder="Repeat new password"
                                value={confirmPassword || ""}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={passwordSubmitting}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Check 
                                type="checkbox"
                                label="Show passwords"
                                checked={showPasswords}
                                onChange={(e) => setShowPasswords(e.target.checked)}
                                className="small text-muted"
                            />
                        </Form.Group>

                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <Button variant="link" className="text-muted text-decoration-none" onClick={() => setShowPasswordModal(false)} disabled={passwordSubmitting}>
                                Cancel
                            </Button>
                            <Button variant="danger" type="submit" disabled={passwordSubmitting}>
                                {passwordSubmitting ? 'Updating...' : 'Update Password'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Avatar Crop Modal */}
            <Modal 
                show={!!previewUrl} 
                onHide={() => { setPreviewUrl(null); setSelectedFile(null); }}
                centered
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Crop New Avatar</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="d-flex flex-column align-items-center">
                        <div style={{ maxWidth: '100%', overflow: 'auto' }}>
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={1}
                                circularCrop
                            >
                                <img 
                                    ref={imgRef}
                                    alt="Crop me" 
                                    src={previewUrl || ''} 
                                    style={{ maxWidth: '100%', maxHeight: '60vh' }}
                                    onLoad={onImageLoad}
                                />
                            </ReactCrop>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => { setPreviewUrl(null); setSelectedFile(null); }}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={handleUpdateAvatar} disabled={loading || !completedCrop}>
                        {loading ? (
                            <>Updating...</>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faCheck} className="me-2" />
                                Apply & Save Avatar
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ProfilePage;
