import { useState, useEffect } from 'react';
import api from '../utils/api';

interface LiveStats {
    week_resolved: number;
    total_submissions: number;
    active_citizens_30d: number;
    avg_resolution_hours: number;
}

export default function LiveStatsBar() {
    const [stats, setStats] = useState<LiveStats | null>(null);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/gamification/stats/city');
            setStats(res.data);
        } catch (err) {
            console.error('Stats fetch failed', err);
        }
    };

    if (!stats || !visible) return null;

    return (
        <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 backdrop-blur-sm border border-white/10 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 overflow-x-auto">
                    <StatPill icon="✅" value={stats.week_resolved} label="Resolved this week" color="green" />
                    <StatPill icon="📋" value={stats.total_submissions} label="Total reports" color="blue" />
                    <StatPill icon="👥" value={stats.active_citizens_30d} label="Active citizens" color="purple" />
                    <StatPill icon="⚡" value={`${stats.avg_resolution_hours}h`} label="Avg resolution" color="yellow" />
                </div>
                <button
                    onClick={() => setVisible(false)}
                    className="text-white/40 hover:text-white/60 text-sm ml-4"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}

function StatPill({ icon, value, label, color }: { icon: string; value: number | string; label: string; color: string }) {
    const colorClasses: Record<string, string> = {
        green: 'text-green-400',
        blue: 'text-blue-400',
        purple: 'text-purple-400',
        yellow: 'text-yellow-400',
    };

    return (
        <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-lg">{icon}</span>
            <span className={`font-bold ${colorClasses[color]}`}>{value}</span>
            <span className="text-white/50 text-sm hidden md:inline">{label}</span>
        </div>
    );
}
