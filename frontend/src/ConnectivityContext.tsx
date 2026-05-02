import React, { createContext, useContext, useEffect, useState } from 'react';
import { syncData } from './sync';

interface ConnectivityContextType {
    isOnline: boolean;
}

const ConnectivityContext = createContext<ConnectivityContextType>({ isOnline: navigator.onLine });

export const ConnectivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncData(); // Trigger sync when coming back online
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <ConnectivityContext.Provider value={{ isOnline }}>
            {children}
        </ConnectivityContext.Provider>
    );
};

export const useConnectivity = () => useContext(ConnectivityContext);
