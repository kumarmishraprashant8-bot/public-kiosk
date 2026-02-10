import { useEffect, useState } from 'react';

export interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message?: string;
}

interface ToastProps {
    toast: ToastMessage;
    onDismiss: (id: string) => void;
}

function Toast({ toast, onDismiss }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, 4000);
        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠',
    };

    const colors = {
        success: 'bg-success text-white',
        error: 'bg-danger text-white',
        info: 'bg-primary text-white',
        warning: 'bg-warning text-white',
    };

    return (
        <div
            className={`${colors[toast.type]} rounded-card shadow-drawer px-4 py-3 min-w-[280px] max-w-[400px] animate-slide-in-up flex items-start gap-3`}
            role="alert"
            aria-live="polite"
        >
            <span className="text-lg font-bold">{icons[toast.type]}</span>
            <div className="flex-1">
                <div className="font-semibold">{toast.title}</div>
                {toast.message && (
                    <div className="text-sm opacity-90 mt-1">{toast.message}</div>
                )}
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="text-white/70 hover:text-white text-lg"
                aria-label="Dismiss"
            >
                ✕
            </button>
        </div>
    );
}

interface ToastContainerProps {
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
}

// Hook for managing toasts
export function useToasts() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = (toast: Omit<ToastMessage, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setToasts((prev) => [...prev, { ...toast, id }]);
    };

    const dismissToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const success = (title: string, message?: string) => {
        addToast({ type: 'success', title, message });
    };

    const error = (title: string, message?: string) => {
        addToast({ type: 'error', title, message });
    };

    const info = (title: string, message?: string) => {
        addToast({ type: 'info', title, message });
    };

    const warning = (title: string, message?: string) => {
        addToast({ type: 'warning', title, message });
    };

    return {
        toasts,
        addToast,
        dismissToast,
        success,
        error,
        info,
        warning,
    };
}

export default Toast;
