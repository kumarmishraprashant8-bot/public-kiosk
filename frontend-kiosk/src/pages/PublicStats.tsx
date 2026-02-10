import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface CityStats {
    total_submissions: number;
    total_resolved: number;
    resolution_rate: number;
    week_resolved: number;
    total_citizens: number;
    active_citizens_30d: number;
    avg_resolution_hours: number;
    estimated_cost_saved: number;
}

interface LeaderEntry {
    rank: number;
    display_name: string;
    points: number;
    submissions: number;
    top_badge: { icon: string; name: string } | null;
}

export default function PublicStats() {
    const [stats, setStats] = useState<CityStats | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const [statsRes, leaderRes] = await Promise.all([
                api.get('/gamification/stats/city'),
                api.get('/gamification/leaderboard?limit=5')
            ]);
            setStats(statsRes.data);
            setLeaderboard(leaderRes.data.leaderboard);
        } catch (err) {
            console.error('Failed to load stats', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
            {/* Header */}
            <header className="max-w-4xl mx-auto mb-8">
                <button onClick={() => navigate('/')} className="text-white/60 mb-4 flex items-center gap-2">
                    ← Back to Home
                </button>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                    🏙️ City Pulse
                </h1>
                <p className="text-white/60 text-lg">Real-time transparency dashboard for our city</p>
            </header>

            {stats && (
                <div className="max-w-4xl mx-auto">
                    {/* Hero Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <StatCard
                            label="Total Reports"
                            value={stats.total_submissions.toLocaleString()}
                            icon="📋"
                            color="blue"
                        />
                        <StatCard
                            label="Resolved"
                            value={stats.total_resolved.toLocaleString()}
                            icon="✅"
                            color="green"
                        />
                        <StatCard
                            label="This Week"
                            value={stats.week_resolved.toLocaleString()}
                            icon="📈"
                            color="purple"
                        />
                        <StatCard
                            label="Resolution Rate"
                            value={`${stats.resolution_rate}%`}
                            icon="🎯"
                            color="yellow"
                        />
                    </div>

                    {/* Impact Section */}
                    <div className="glass-card p-8 mb-8 text-center bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
                        <h2 className="text-2xl font-bold text-white mb-2">💸 Taxpayer Impact</h2>
                        <div className="text-5xl font-bold text-green-400 mb-2">
                            ₹{stats.estimated_cost_saved.toLocaleString()}
                        </div>
                        <p className="text-white/60">
                            Estimated savings this week through quick resolution
                        </p>
                        <p className="text-sm text-white/40 mt-2">
                            Based on ₹500 average cost reduction per issue resolved within SLA
                        </p>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-bold text-white mb-4">⏱️ Response Time</h3>
                            <div className="flex items-end gap-4">
                                <div className="text-4xl font-bold text-blue-400">
                                    {stats.avg_resolution_hours}h
                                </div>
                                <div className="text-white/60 pb-1">
                                    average resolution time
                                </div>
                            </div>
                            <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                                    style={{ width: `${Math.min(100, (24 - stats.avg_resolution_hours) / 24 * 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-white/40 mt-2">Target: Under 24 hours</p>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="text-lg font-bold text-white mb-4">👥 Citizen Engagement</h3>
                            <div className="flex items-end gap-4">
                                <div className="text-4xl font-bold text-purple-400">
                                    {stats.active_citizens_30d}
                                </div>
                                <div className="text-white/60 pb-1">
                                    active citizens this month
                                </div>
                            </div>
                            <p className="text-sm text-white/40 mt-4">
                                Out of {stats.total_citizens} registered citizens
                            </p>
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div className="glass-card p-6 mb-8">
                        <h3 className="text-lg font-bold text-white mb-4">🏆 Top Citizens</h3>
                        <div className="space-y-3">
                            {leaderboard.map((entry, i) => (
                                <div
                                    key={entry.rank}
                                    className={`flex items-center gap-4 p-3 rounded-lg ${i === 0 ? 'bg-yellow-500/20' :
                                            i === 1 ? 'bg-gray-400/20' :
                                                i === 2 ? 'bg-orange-600/20' : 'bg-white/5'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${i === 0 ? 'bg-yellow-500 text-black' :
                                            i === 1 ? 'bg-gray-400 text-black' :
                                                i === 2 ? 'bg-orange-600 text-white' : 'bg-white/10 text-white'
                                        }`}>
                                        {entry.rank}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-white">{entry.display_name}</div>
                                        <div className="text-sm text-white/50">{entry.submissions} reports</div>
                                    </div>
                                    {entry.top_badge && (
                                        <div className="text-2xl">{entry.top_badge.icon}</div>
                                    )}
                                    <div className="text-yellow-400 font-bold">{entry.points} pts</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="text-center">
                        <button
                            onClick={() => navigate('/submit')}
                            className="btn-primary px-12 py-6 text-xl"
                        >
                            🎤 Report an Issue
                        </button>
                        <p className="text-white/40 mt-4 text-sm">
                            Every report helps make our city better
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
    const colorClasses: Record<string, string> = {
        blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
        green: 'from-green-500/20 to-green-600/20 border-green-500/30',
        purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
        yellow: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
    };
    const textColors: Record<string, string> = {
        blue: 'text-blue-400',
        green: 'text-green-400',
        purple: 'text-purple-400',
        yellow: 'text-yellow-400',
    };

    return (
        <div className={`glass-card p-4 bg-gradient-to-br ${colorClasses[color]} border`}>
            <div className="text-2xl mb-2">{icon}</div>
            <div className={`text-2xl md:text-3xl font-bold ${textColors[color]}`}>{value}</div>
            <div className="text-white/50 text-sm">{label}</div>
        </div>
    );
}
