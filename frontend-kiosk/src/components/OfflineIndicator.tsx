import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showSyncing, setShowSyncing] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowSyncing(true);
            setTimeout(() => setShowSyncing(false), 3000);
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
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white text-center py-2 font-bold shadow-lg flex items-center justify-center gap-2"
                >
                    <span className="animate-pulse">⚠️</span>
                    OFFLINE MODE - Reports will be queued
                </motion.div>
            )}

            {showSyncing && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[9999] bg-green-600 text-white text-center py-2 font-bold shadow-lg flex items-center justify-center gap-2"
                >
                    <span className="animate-spin">🔄</span>
                    Back Online! Syncing data...
                </motion.div>
            )}
        </AnimatePresence>
    );
}
