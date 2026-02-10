import { useState, useEffect } from 'react';

interface AuditLog {
    id: number;
    action: string;
    actor_type: string;
    actor_id: string | null;
    resource_type: string;
    resource_id: string;
    details: Record<string, any> | null;
    timestamp: string;
}

interface AuditViewerProps {
    limit?: number;
}

const API_URL = 'http://localhost:8000';

export default function AuditViewer({ limit = 50 }: AuditViewerProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ action: '', resource_type: '' });

    useEffect(() => {
        fetchLogs();
    }, [filter]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ password: 'admin123', limit: limit.toString() });
            if (filter.action) params.append('action', filter.action);
            if (filter.resource_type) params.append('resource_type', filter.resource_type);

            const res = await fetch(`${API_URL}/admin/audit?${params}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
            }
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const actionColors: Record<string, string> = {
        assign_crew: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        create_thread: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        close_thread: 'bg-slate-700 text-slate-300 border-slate-600',
        status_update: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        dispatch: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        resolve: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    };

    const actionIcons: Record<string, string> = {
        assign_crew: '🚀',
        create_thread: '💬',
        close_thread: '🔒',
        status_update: '📍',
        dispatch: '🚗',
        resolve: '✅',
    };

    return (
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/60 shadow-xl overflow-hidden backdrop-blur-sm">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold">📋 Audit Trail</h3>
                        <p className="text-sm text-slate-300/80">
                            Transparency & accountability log
                        </p>
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="px-4 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition-all text-sm font-medium"
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/40 flex gap-4">
                <select
                    value={filter.action}
                    onChange={(e) => setFilter({ ...filter, action: e.target.value })}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-primary/50 outline-none"
                >
                    <option value="">All Actions</option>
                    <option value="assign_crew">Assign Crew</option>
                    <option value="create_thread">Create Thread</option>
                    <option value="status_update">Status Update</option>
                    <option value="close_thread">Close Thread</option>
                </select>
                <select
                    value={filter.resource_type}
                    onChange={(e) => setFilter({ ...filter, resource_type: e.target.value })}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-primary/50 outline-none"
                >
                    <option value="">All Resources</option>
                    <option value="cluster">Cluster</option>
                    <option value="thread">Thread</option>
                    <option value="crew">Crew</option>
                    <option value="submission">Submission</option>
                </select>
            </div>

            {/* Logs List */}
            <div className="max-h-96 overflow-y-auto custom-scroll">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">
                        <div className="animate-spin inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-2"></div>
                        <p>Loading audit logs...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        <span className="text-4xl mb-2 block">📭</span>
                        <p>No audit logs found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-700/50">
                        {logs.map((log) => (
                            <div key={log.id} className="p-4 hover:bg-slate-700/30 transition-colors group">
                                <div className="flex items-start gap-4">
                                    <div className="text-2xl pt-1 group-hover:scale-110 transition-transform">
                                        {actionIcons[log.action] || '📝'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className={`px-2 py-0.5 rounded border text-[10px] uppercase font-bold tracking-wider ${actionColors[log.action] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-xs font-mono text-slate-500">
                                                {log.resource_type} #{log.resource_id}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-300 leading-relaxed">
                                            <span className="font-bold text-slate-100">{log.actor_type}</span>
                                            {log.actor_id && <span className="text-slate-500 ml-1">({log.actor_id})</span>}
                                            {' '}performed {log.action.replace(/_/g, ' ')} on {log.resource_type}
                                        </p>
                                        {log.details && Object.keys(log.details).length > 0 && (
                                            <div className="mt-3 text-xs text-slate-400 bg-slate-900/50 border border-slate-700/30 rounded-lg p-3 font-mono overflow-x-auto">
                                                <pre>{JSON.stringify(log.details, null, 2)}</pre>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-[10px] uppercase tracking-tighter text-slate-600 font-bold whitespace-nowrap pt-1">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
