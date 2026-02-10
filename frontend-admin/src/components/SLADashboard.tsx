import { useState, useEffect } from 'react';

interface SLASummary {
    total_clusters: number;
    breached: number;
    at_risk: number;
    on_track: number;
    resolved: number;
    breach_rate: number;
    total_cost_incurred: number;
    active_hourly_rate: number;
}

interface ClusterSLA {
    cluster_id: string;
    intent: string;
    ward: string;
    size: number;
    priority: string;
    sla_status: {
        is_breached: boolean;
        time_remaining_hours: number;
        hours_open: number;
    };
    cost: {
        total_cost: number;
        hourly_rate: number;
    };
}

interface SLADashboardProps {
    onClusterSelect?: (clusterId: string) => void;
}

const API_URL = 'http://localhost:8000';

export default function SLADashboard({ onClusterSelect }: SLADashboardProps) {
    const [summary, setSummary] = useState<SLASummary | null>(null);
    const [breachedClusters, setBreachedClusters] = useState<ClusterSLA[]>([]);
    const [atRiskClusters, setAtRiskClusters] = useState<ClusterSLA[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        fetchSLAData();
        const interval = setInterval(fetchSLAData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchSLAData = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/sla?password=admin123`);
            if (res.ok) {
                const data = await res.json();
                setSummary(data.summary);
                setBreachedClusters(data.breached_clusters || []);
                setAtRiskClusters(data.at_risk_clusters || []);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error('Failed to fetch SLA data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-card p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/60 shadow-xl overflow-hidden backdrop-blur-sm">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold">⏱️ SLA Dashboard</h3>
                        <p className="text-sm text-white/70">
                            Last updated: {lastUpdated?.toLocaleTimeString()}
                        </p>
                    </div>
                    <button
                        onClick={fetchSLAData}
                        className="px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-sm"
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {/* Breached */}
                        <div className={`rounded-xl p-4 border transition-all ${summary.breached > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">🚨</span>
                                <span className={`text-xs uppercase tracking-wider font-bold ${summary.breached > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                    Breached
                                </span>
                            </div>
                            <p className={`text-3xl font-bold ${summary.breached > 0 ? 'text-white' : 'text-slate-600'}`}>
                                {summary.breached}
                            </p>
                        </div>

                        {/* At Risk */}
                        <div className={`rounded-xl p-4 border transition-all ${summary.at_risk > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">⚠️</span>
                                <span className={`text-xs uppercase tracking-wider font-bold ${summary.at_risk > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                    At Risk
                                </span>
                            </div>
                            <p className={`text-3xl font-bold ${summary.at_risk > 0 ? 'text-white' : 'text-slate-600'}`}>
                                {summary.at_risk}
                            </p>
                        </div>

                        {/* On Track */}
                        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/30">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">✅</span>
                                <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">On Track</span>
                            </div>
                            <p className="text-3xl font-bold text-white">{summary.on_track}</p>
                        </div>

                        {/* Resolved */}
                        <div className="rounded-xl p-4 bg-blue-500/10 border border-blue-500/30">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">🎉</span>
                                <span className="text-xs uppercase tracking-wider font-bold text-blue-400">Resolved</span>
                            </div>
                            <p className="text-3xl font-bold text-white">{summary.resolved}</p>
                        </div>
                    </div>

                    {/* Cost Summary */}
                    <div className="bg-gray-900 text-white rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Total Cost Incurred</p>
                                <p className="text-2xl font-mono font-bold text-amber-400">
                                    ₹{summary.total_cost_incurred.toLocaleString()}
                                </p>
                            </div>
                            <div className="border-l border-gray-700 pl-4">
                                <p className="text-sm text-gray-400">Active Burn Rate</p>
                                <p className="text-xl font-mono text-red-400">
                                    ₹{summary.active_hourly_rate.toLocaleString()}/hr
                                </p>
                            </div>
                            <div className="border-l border-gray-700 pl-4">
                                <p className="text-sm text-gray-400">SLA Breach Rate</p>
                                <p className={`text-xl font-bold ${summary.breach_rate > 20 ? 'text-red-400' : summary.breach_rate > 10 ? 'text-amber-400' : 'text-green-400'}`}>
                                    {summary.breach_rate}%
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Breached Clusters Alert */}
                    {breachedClusters.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-xs uppercase tracking-widest font-bold text-rose-400 mb-3 flex items-center gap-2">
                                <span className="animate-pulse">🚨</span>
                                SLA Breached - Immediate Action Required
                            </h4>
                            <div className="space-y-2">
                                {breachedClusters.slice(0, 3).map((cluster) => (
                                    <div
                                        key={cluster.cluster_id}
                                        onClick={() => onClusterSelect?.(cluster.cluster_id)}
                                        className="flex items-center justify-between p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg cursor-pointer hover:bg-rose-500/10 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl transition-transform group-hover:scale-110">{getIntentIcon(cluster.intent)}</span>
                                            <div>
                                                <p className="font-semibold text-slate-100">{cluster.ward}</p>
                                                <p className="text-xs text-slate-400">{cluster.size} reports</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-rose-400">
                                                {Math.abs(cluster.sla_status.time_remaining_hours).toFixed(1)}h overdue
                                            </p>
                                            <p className="text-xs text-slate-500 font-mono">
                                                ₹{cluster.cost.total_cost.toLocaleString()} cost
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* At Risk Clusters */}
                    {atRiskClusters.length > 0 && (
                        <div>
                            <h4 className="text-xs uppercase tracking-widest font-bold text-amber-400 mb-3 flex items-center gap-2">
                                ⚠️ At Risk - Priority Response Required
                            </h4>
                            <div className="space-y-2">
                                {atRiskClusters.slice(0, 3).map((cluster) => (
                                    <div
                                        key={cluster.cluster_id}
                                        onClick={() => onClusterSelect?.(cluster.cluster_id)}
                                        className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg cursor-pointer hover:bg-amber-500/10 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl transition-transform group-hover:scale-110">{getIntentIcon(cluster.intent)}</span>
                                            <div>
                                                <p className="font-semibold text-slate-100">{cluster.ward}</p>
                                                <p className="text-xs text-slate-400">{cluster.size} reports</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-amber-400">
                                                {cluster.sla_status.time_remaining_hours.toFixed(1)}h left
                                            </p>
                                            <p className="text-xs text-slate-500 font-mono">
                                                ₹{cluster.cost.hourly_rate}/hr
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {breachedClusters.length === 0 && atRiskClusters.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <span className="text-4xl">🎉</span>
                            <p className="mt-2">All clusters are within SLA targets!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function getIntentIcon(intent: string): string {
    const icons: Record<string, string> = {
        water_outage: '💧',
        electricity_outage: '⚡',
        garbage: '🗑️',
        road: '🛣️',
        sewage: '🚰',
        streetlight: '💡',
    };
    return icons[intent] || '📋';
}
