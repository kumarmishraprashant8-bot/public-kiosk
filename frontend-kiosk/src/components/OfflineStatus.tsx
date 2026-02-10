import { useState, useEffect, useCallback } from "react";
import { getQueuedSubmissions, syncOfflineQueue } from "../utils/offlineQueue";
import { Language } from "../types";

interface OfflineStatusProps {
    lang: Language;
}

export default function OfflineStatus({ lang }: OfflineStatusProps) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [queuedCount, setQueuedCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    const checkQueue = useCallback(async () => {
        try {
            const queued = await getQueuedSubmissions();
            setQueuedCount(queued.length);
        } catch (error) {
            console.error("Error checking queue:", error);
        }
    }, []);

    const handleSync = useCallback(async () => {
        if (!isOnline || isSyncing) return;

        setIsSyncing(true);
        try {
            await syncOfflineQueue();
            await checkQueue();
            setLastSyncTime(new Date());
        } catch (error) {
            console.error("Sync error:", error);
        } finally {
            setIsSyncing(false);
        }
    }, [isOnline, isSyncing, checkQueue]);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Check queue on mount
        checkQueue();

        // Auto-sync when coming online
        if (isOnline && queuedCount > 0) {
            handleSync();
        }

        // Periodic queue check
        const interval = setInterval(checkQueue, 10000);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            clearInterval(interval);
        };
    }, [isOnline, queuedCount, checkQueue, handleSync]);

    const getStatusText = () => {
        if (!isOnline) return lang === "hi" ? "ऑफलाइन" : "Offline";
        if (isSyncing) return lang === "hi" ? "सिंक हो रहा है..." : "Syncing...";
        if (queuedCount > 0) return lang === "hi" ? `${queuedCount} कतार में` : `${queuedCount} queued`;
        return lang === "hi" ? "सिंक्ड" : "All synced";
    };

    const getStatusColor = () => {
        if (!isOnline) return "bg-red-500/20 border-red-500/50 text-red-400";
        if (isSyncing) return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400";
        if (queuedCount > 0) return "bg-orange-500/20 border-orange-500/50 text-orange-400";
        return "bg-green-500/20 border-green-500/50 text-green-400";
    };

    const getStatusIcon = () => {
        if (!isOnline) return "📵";
        if (isSyncing) return "🔄";
        if (queuedCount > 0) return "⏳";
        return "✅";
    };

    return (
        <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-72 z-50`}>
            <div className={`p-4 rounded-xl border-2 backdrop-blur-md ${getStatusColor()} transition-all duration-300`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className={`text-2xl ${isSyncing ? 'animate-spin' : ''}`}>
                            {getStatusIcon()}
                        </span>
                        <div>
                            <p className="font-medium text-sm">{getStatusText()}</p>
                            {lastSyncTime && isOnline && queuedCount === 0 && (
                                <p className="text-xs opacity-70">
                                    {lang === "hi" ? "अंतिम सिंक:" : "Last sync:"} {lastSyncTime.toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                    </div>

                    {isOnline && queuedCount > 0 && !isSyncing && (
                        <button
                            onClick={handleSync}
                            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                        >
                            {lang === "hi" ? "अभी सिंक करें" : "Sync Now"}
                        </button>
                    )}
                </div>

                {/* Queue progress bar */}
                {queuedCount > 0 && (
                    <div className="mt-3 h-1.5 bg-black/20 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${isSyncing ? 'bg-yellow-400 animate-pulse' : 'bg-orange-400'
                                }`}
                            style={{ width: isSyncing ? '100%' : `${Math.min(queuedCount * 20, 100)}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
