import React, { createContext, useState, useCallback, useContext, ReactNode } from 'react';
import { ToastMessage } from '../types';
import { ToastContainer } from '../components/Toast';

type ToastContextType = {
    addToast: (message: string, type?: ToastMessage['type']) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// FIX: Update component signature to use React.FC for better type compatibility.
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <ToastContainer toasts={toasts} setToasts={setToasts} />
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};