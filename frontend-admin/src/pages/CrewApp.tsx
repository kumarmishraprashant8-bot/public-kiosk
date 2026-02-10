import { useState, useEffect } from 'react';

interface Assignment {
    cluster_id: string;
    intent: string;
    ward: string;
    size: number;
    priority: string;
    latitude: number;
    longitude: number;
    assigned_at: string;
    sla_deadline: string | null;
}

interface CrewInfo {
    crew_id: string;
    crew_name: string;
    current_status: string;
    assignments: Assignment[];
    assignment_count: number;
}

const API_URL = 'http://localhost:8000';

export default function CrewApp() {
    const [crewId, setCrewId] = useState<string>(() => localStorage.getItem('crew_id') || '');
    const [crewInfo, setCrewInfo] = useState<CrewInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [notes, setNotes] = useState('');
    const [message, setMessage] = useState('');
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingUpdates, setPendingUpdates] = useState<any[]>(() => {
        const saved = localStorage.getItem('pending_updates');
        return saved ? JSON.parse(saved) : [];
    });
    const [notification, setNotification] = useState<string | null>(null);

    // Monitor online status
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncPendingUpdates();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Polling for new assignments (mock push notification)
    useEffect(() => {
        if (!crewId || !isOnline) return;

        const interval = setInterval(async () => {
            // specific lightweight check or full refetch
            // For simplicity, refetch
            try {
                const res = await fetch(`${API_URL}/crews/${crewId}/assignments`);
                if (res.ok) {
                    const data: CrewInfo = await res.json();

                    // Check for new assignments
                    if (crewInfo && data.assignments.length > crewInfo.assignments.length) {
                        setNotification(`🔔 You have ${data.assignments.length - crewInfo.assignments.length} new assignment(s)!`);
                        setTimeout(() => setNotification(null), 5000);

                        // Play sound? (Optional, browser might block)
                    }

                    setCrewInfo(data);
                    // Cache for offline
                    localStorage.setItem('cached_crew_info', JSON.stringify(data));
                }
            } catch (e) {
                // ignore polling errors
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [crewId, crewInfo, isOnline]);

    // Initial load from cache or fetch
    useEffect(() => {
        if (crewId) {
            const cached = localStorage.getItem('cached_crew_info');
            if (cached) {
                setCrewInfo(JSON.parse(cached));
            }
            if (isOnline) {
                fetchCrewAssignments(crewId);
            }
        }
    }, [crewId]);

    const syncPendingUpdates = async () => {
        if (pendingUpdates.length === 0) return;

        setMessage('Syncing offline updates...');
        const remaining = [];

        for (const update of pendingUpdates) {
            try {
                await fetch(`${API_URL}/crews/${crewId}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(update),
                });
            } catch (e) {
                remaining.push(update);
            }
        }

        setPendingUpdates(remaining);
        localStorage.setItem('pending_updates', JSON.stringify(remaining));

        if (remaining.length === 0) {
            setMessage('All updates synced!');
            setTimeout(() => setMessage(''), 3000);
            fetchCrewAssignments(crewId);
        } else {
            setMessage(`Synced some updates. ${remaining.length} pending.`);
        }
    };

    const fetchCrewAssignments = async (id: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/crews/${id}/assignments`);
            if (res.ok) {
                const data = await res.json();
                setCrewInfo(data);
                localStorage.setItem('cached_crew_info', JSON.stringify(data));
                localStorage.setItem('crew_id', id);
                setMessage('');
            } else {
                setMessage('Crew not found');
            }
        } catch (error) {
            console.error(error);
            setMessage('Offline Mode: Showing cached data');
            setIsOnline(false); // Assume offline if fetch fails
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (status: string) => {
        if (!crewId) return;
        setUpdating(true);

        const payload = {
            status,
            notes,
            latitude: 12.9352 + Math.random() * 0.01,
            longitude: 77.6245 + Math.random() * 0.01,
            timestamp: new Date().toISOString()
        };

        if (!isOnline) {
            // Queue for offline
            const newPending = [...pendingUpdates, payload];
            setPendingUpdates(newPending);
            localStorage.setItem('pending_updates', JSON.stringify(newPending));

            // Optimistic update
            if (crewInfo) {
                setCrewInfo({ ...crewInfo, current_status: status });
            }
            setMessage('Offline: Update queued for sync');
            setNotes('');
            setUpdating(false);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/crews/${crewId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setMessage(`Status updated to ${status}`);
                setNotes('');
                fetchCrewAssignments(crewId);
            }
        } catch (error) {
            setMessage('Failed to update status. Queued for sync.');
            const newPending = [...pendingUpdates, payload];
            setPendingUpdates(newPending);
            localStorage.setItem('pending_updates', JSON.stringify(newPending));
        } finally {
            setUpdating(false);
        }
    };

    const intentIcons: Record<string, string> = {
        water_outage: '💧',
        electricity_outage: '⚡',
        garbage: '🗑️',
        road: '🛣️',
        sewage: '🚰',
        streetlight: '💡',
    };

    const priorityColors: Record<string, string> = {
        urgent: 'bg-red-500',
        high: 'bg-amber-500',
        normal: 'bg-blue-500',
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Notification Banner */}
            {notification && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 px-4 py-3 text-white shadow-lg animate-bounce">
                    <p className="font-bold text-center">{notification}</p>
                </div>
            )}

            {/* Header */}
            <div className={`px-6 py-4 ${isOnline ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gray-700'}`}>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold">🚀 CivicPulse Crew App</h1>
                        <p className="text-sm text-white/70">Field Operations Dashboard</p>
                    </div>
                    <div>
                        {!isOnline && (
                            <span className="bg-gray-900 text-gray-300 text-xs px-2 py-1 rounded">
                                OFFLINE MODE
                            </span>
                        )}
                        {pendingUpdates.length > 0 && (
                            <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-1 rounded">
                                {pendingUpdates.length} Pending Sync
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {!crewInfo ? (
                /* Login Screen */
                <div className="p-6">
                    <div className="max-w-md mx-auto">
                        <label className="block text-sm text-gray-400 mb-2">
                            Enter your Crew ID
                        </label>
                        <input
                            type="text"
                            value={crewId}
                            onChange={(e) => setCrewId(e.target.value.toUpperCase())}
                            placeholder="e.g., ABC123"
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-lg font-mono"
                        />
                        <button
                            onClick={() => fetchCrewAssignments(crewId)}
                            disabled={loading || !crewId}
                            className="w-full mt-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Login'}
                        </button>
                        {message && (
                            <p className="mt-4 text-center text-red-400">{message}</p>
                        )}

                        {/* Demo Crews */}
                        <div className="mt-8 p-4 bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-400 mb-2">Demo Crews (click to login):</p>
                            <div className="flex flex-wrap gap-2">
                                {['1', '2', '3', '4'].map((id) => (
                                    <button
                                        key={id}
                                        onClick={() => {
                                            setCrewId(id);
                                            fetchCrewAssignments(id);
                                        }}
                                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                                    >
                                        Crew #{id}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Dashboard */
                <div className="p-4 max-w-lg mx-auto">
                    {/* Offline Banner */}
                    {!isOnline && (
                        <div className="mb-4 bg-gray-800 border-l-4 border-yellow-500 p-4">
                            <p className="font-bold text-yellow-500">You are offline</p>
                            <p className="text-sm text-gray-400">Updates will be synced when you reconnect.</p>
                        </div>
                    )}

                    {/* Status Bar */}
                    <div className="bg-gray-800 rounded-lg p-4 mb-4 shadow-lg border border-gray-700/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Logged in as</p>
                                <p className="text-lg font-bold text-white">{crewInfo.crew_name}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-400">Status</p>
                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${crewInfo.current_status === 'available' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                    crewInfo.current_status === 'enroute' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                        crewInfo.current_status === 'onsite' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                            'bg-gray-500/20 text-gray-400'
                                    }`}>
                                    {crewInfo.current_status.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Status Update Buttons */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <button
                            onClick={() => updateStatus('enroute')}
                            disabled={updating}
                            className="py-3 bg-blue-600/90 hover:bg-blue-600 rounded-xl font-medium text-sm transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-900/20"
                        >
                            🚗 En Route
                        </button>
                        <button
                            onClick={() => updateStatus('onsite')}
                            disabled={updating}
                            className="py-3 bg-amber-600/90 hover:bg-amber-600 rounded-xl font-medium text-sm transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-amber-900/20"
                        >
                            📍 On Site
                        </button>
                        <button
                            onClick={() => updateStatus('resolved')}
                            disabled={updating}
                            className="py-3 bg-green-600/90 hover:bg-green-600 rounded-xl font-medium text-sm transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-green-900/20"
                        >
                            ✅ Resolved
                        </button>
                    </div>

                    {/* Notes Input */}
                    <div className="mb-4">
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add notes (optional)..."
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {message && (
                        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm animate-fade-in">
                            {message}
                        </div>
                    )}

                    {/* Assignments */}
                    <div>
                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            📋 Active Assignments
                            <span className="bg-gray-700 text-sm px-2 py-0.5 rounded-full text-gray-300">
                                {crewInfo.assignment_count}
                            </span>
                        </h2>

                        {crewInfo.assignments.length === 0 ? (
                            <div className="bg-gray-800/50 border border-dashed border-gray-700 rounded-xl p-8 text-center text-gray-400">
                                <span className="text-4xl block mb-2">🎉</span>
                                <p>No active assignments</p>
                                <p className="text-xs mt-1 text-gray-500">Enjoy your break!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {crewInfo.assignments.map((task) => (
                                    <div key={task.cluster_id} className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-xl transition-transform hover:-translate-y-1">
                                        <div className="flex items-start gap-4">
                                            <div className="text-4xl p-2 bg-gray-700/50 rounded-lg">
                                                {intentIcons[task.intent] || '📋'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold text-white uppercase tracking-wider ${priorityColors[task.priority]}`}>
                                                        {task.priority}
                                                    </span>
                                                    <span className="text-xs text-gray-400 border border-gray-600 px-1.5 rounded">
                                                        {task.size} reports
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-lg capitalize truncate text-white">
                                                    {task.intent.replace(/_/g, ' ')}
                                                </h3>
                                                <p className="text-sm text-gray-400 mb-3">{task.ward}</p>

                                                {task.sla_deadline && (
                                                    <div className="flex items-center gap-1 text-xs text-amber-400 bg-amber-900/20 px-2 py-1 rounded w-fit mb-3">
                                                        <span>⏱️ Due:</span>
                                                        <span className="font-mono">
                                                            {new Date(task.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <a
                                                        href={`https://www.google.com/maps?q=${task.latitude},${task.longitude}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white transition-colors"
                                                    >
                                                        <span>🗺️ Navigate</span>
                                                    </a>
                                                    {/* Call Logic? */}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Logout */}
                    <button
                        onClick={() => {
                            setCrewInfo(null);
                            setCrewId('');
                            setMessage('');
                            localStorage.removeItem('crew_id');
                        }}
                        className="w-full mt-8 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-400 text-sm font-medium border border-gray-700"
                    >
                        Log out
                    </button>
                </div>
            )}
        </div>
    );
}
