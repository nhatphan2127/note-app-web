import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './api';
import { useAuth } from './AuthContext';
import { db } from './db';
import { addToSyncQueue } from './sync';

export interface UserPreferences {
    font_size: 'small' | 'medium' | 'large';
    theme: 'light' | 'dark';
    default_note_color: string;
}

interface PreferencesContextType {
    preferences: UserPreferences;
    updatePreferences: (newPrefs: Partial<UserPreferences>) => Promise<void>;
    loading: boolean;
}

const defaultPreferences: UserPreferences = {
    font_size: 'medium',
    theme: 'light',
    default_note_color: '#ffffff',
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token } = useAuth();
    const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            fetchPreferences();
        } else {
            setPreferences(defaultPreferences);
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        applyPreferences(preferences);
    }, [preferences]);

    const fetchPreferences = async () => {
        try {
            setLoading(true);
            if (navigator.onLine) {
                const response = await api.get('/preferences');
                setPreferences(response.data);
                await db.preferences.put({ id: 1, ...response.data });
            } else {
                const cached = await db.preferences.get(1);
                if (cached) {
                    const { id, ...prefs } = cached;
                    setPreferences(prefs as UserPreferences);
                }
            }
        } catch (error) {
            console.error('Failed to fetch preferences', error);
            const cached = await db.preferences.get(1);
            if (cached) {
                const { id, ...prefs } = cached;
                setPreferences(prefs as UserPreferences);
            }
        } finally {
            setLoading(false);
        }
    };

    const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
        const updated = { ...preferences, ...newPrefs };
        setPreferences(updated);
        await db.preferences.put({ id: 1, ...updated });

        if (navigator.onLine) {
            try {
                const response = await api.put('/preferences', newPrefs);
                setPreferences(response.data);
                await db.preferences.put({ id: 1, ...response.data });
            } catch (error) {
                await addToSyncQueue('update', 'image', newPrefs, 'preferences');
            }
        } else {
            await addToSyncQueue('update', 'image', newPrefs, 'preferences');
        }
    };

    const applyPreferences = (prefs: UserPreferences) => {
        // Apply theme
        if (prefs.theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-bs-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-bs-theme', 'light');
        }

        // Apply font size
        const root = document.documentElement;
        switch (prefs.font_size) {
            case 'small':
                root.style.fontSize = '14px';
                break;
            case 'medium':
                root.style.fontSize = '16px';
                break;
            case 'large':
                root.style.fontSize = '18px';
                break;
        }
    };

    return (
        <PreferencesContext.Provider value={{ preferences, updatePreferences, loading }}>
            {children}
        </PreferencesContext.Provider>
    );
};

export const usePreferences = () => {
    const context = useContext(PreferencesContext);
    if (context === undefined) {
        throw new Error('usePreferences must be used within a PreferencesProvider');
    }
    return context;
};
