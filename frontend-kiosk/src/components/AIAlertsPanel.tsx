import { useState, useEffect } from 'react';
import api from '../utils/api';

interface Alert {
    cluster_id: string;
    ward: string;
    intent: string;
    severity: 'critical' | 'warning' | 'normal';
    growth_rate: number;
    current_count: number;
    hours_to_critical: number;
    recommendation: string;
}

export default function AIAlertsPanel() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const fetchAlerts = async () => {
        try {
            const res = await api.get('/ai-alerts/outbreaks');
            setAlerts(res.data.alerts);
        } catch (err) {
            console.error('Failed to fetch alerts', err);
        } finally {
            setLoading(false);
        }
    };

    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount = alerts.filter(a => a.severity === 'warning').length;

    if (loading) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-4 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-20 bg-gray-700 rounded"></div>
            </div>
        );
    }

    return (
        <div className={`rounded-xl overflow-hidden transition-all ${criticalCount > 0 ? 'bg-red-500/10 border border-red-500/30' :
                warningCount > 0 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                    'bg-gray-800/50 border border-gray-700'
            }`}>
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setCollapsed(!collapsed)}
            >
                <div className="flex items-center gap-3">
                    <span className="text-xl">🤖</span>
                    <h3 className="font-bold text-white">AI Alerts</h3>
                    {criticalCount > 0 && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                            {criticalCount} CRITICAL
                        </span>
                    )}
                    {warningCount > 0 && (
                        <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full">
                            {warningCount} WARNING
                        </span>
                    )}
                </div>
                <button className="text-white/50 hover:text-white">
                    {collapsed ? '▼' : '▲'}
                </button>
            </div>

            {/* Content */}
            {!collapsed && (
                <div className="p-4 pt-0 space-y-3">
                    {alerts.length === 0 ? (
                        <div className="text-center py-4">
                            <span className="text-3xl block mb-2">✅</span>
                            <p className="text-white/60">All systems normal. No outbreaks detected.</p>
                        </div>
                    ) : (
                        alerts.map(alert => (
                            <div
                                key={alert.cluster_id}
                                className={`p-4 rounded-lg ${alert.severity === 'critical' ? 'bg-red-500/20' :
                                        alert.severity === 'warning' ? 'bg-yellow-500/20' :
                                            'bg-gray-700/50'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${alert.severity === 'critical' ? 'bg-red-500 text-white' :
                                                'bg-yellow-500 text-black'
                                            }`}>
                                            {alert.severity.toUpperCase()}
                                        </span>
                                        <h4 className="font-medium text-white mt-2">
                                            {alert.intent.replace('_', ' ').toUpperCase()} Outbreak
                                        </h4>
                                        <p className="text-white/50 text-sm">📍 {alert.ward}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-white">{alert.current_count}</div>
                                        <div className="text-xs text-white/40">reports</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-white/60 mb-3">
                                    <span>📈 +{alert.growth_rate}% growth</span>
                                    <span>⏱️ {alert.hours_to_critical}h to critical</span>
                                </div>

                                <div className={`p-3 rounded text-sm ${alert.severity === 'critical' ? 'bg-red-500/30 text-red-200' :
                                        'bg-yellow-500/20 text-yellow-200'
                                    }`}>
                                    💡 {alert.recommendation}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
