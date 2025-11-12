import React from 'react';
import ReactDOM from 'react-dom';
import { ToastMessage } from '../types';
import { Icon, ICONS } from './Icon';

const Toast: React.FC<ToastMessage & { onDismiss: () => void }> = ({ message, type, onDismiss }) => {
    const colors = {
        success: 'bg-emerald-500',
        error: 'bg-rose-500',
        info: 'bg-sky-500',
    };
    return (
        <div className={`flex items-center justify-between w-full p-4 rounded-lg shadow-lg text-white ${colors[type]} animate-toast-in`}>
            <span className="font-medium">{message}</span>
            <button onClick={onDismiss} className="ml-4 p-1 rounded-full hover:bg-white/20 transition-colors">
                <Icon path={ICONS.close} className="w-4 h-4" />
            </button>
        </div>
    );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; setToasts: React.Dispatch<React.SetStateAction<ToastMessage[]>> }> = ({ toasts, setToasts }) => {
    const toastRoot = document.getElementById('toast-container');
    if (!toastRoot) return null;

    const handleDismiss = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return ReactDOM.createPortal(
        toasts.map(toast => <Toast key={toast.id} {...toast} onDismiss={() => handleDismiss(toast.id)} />),
        toastRoot
    );
};
