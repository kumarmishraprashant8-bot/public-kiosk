import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface LeaderEntry {
    rank: number;
    display_name: string;
    phone_masked: string;
    points: number;
    submissions: number;
    resolved: number;
    top_badge: { icon: string; name: string } | null;
}

export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
    const [selectedWard, setSelectedWard] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const WARDS = [
        'Koramangala', 'Indiranagar', 'Whitefield', 'Jayanagar',
        'BTM Layout', 'HSR Layout', 'Electronic City', 'Malleshwaram'
    ];

    useEffect(() => {
        fetchLeaderboard();
    }, [selectedWard]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const url = selectedWard
                ? `/gamification/leaderboard?ward=${encodeURIComponent(selectedWard)}&limit=20`
                : `/gamification/leaderboard?limit=20`;
            const res = await api.get(url);
            setLeaderboard(res.data.leaderboard);
        } catch (err) {
            console.error('Failed to load leaderboard', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 p-6">
            {/* Header */}
            <header className="max-w-2xl mx-auto mb-8">
                <button onClick={() => navigate('/')} className="text-white/60 mb-4 flex items-center gap-2">
                    ← Back to Home
                </button>
                <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                    🏆 Citizen Leaderboard
                </h1>
                <p className="text-white/60">Top contributors making our city better</p>
            </header>

            {/* Ward Filter */}
            <div className="max-w-2xl mx-auto mb-6">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedWard('')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedWard === ''
                                ? 'bg-purple-500 text-white'
                                : 'bg-white/10 text-white/60 hover:bg-white/20'
                            }`}
                    >
                        🌆 City-wide
                    </button>
                    {WARDS.map(ward => (
                        <button
                            key={ward}
                            onClick={() => setSelectedWard(ward)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedWard === ward
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                                }`}
                        >
                            {ward}
                        </button>
                    ))}
                </div>
            </div>

            {/* Leaderboard List */}
            <div className="max-w-2xl mx-auto">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="text-center py-12 glass-card">
                        <span className="text-4xl block mb-4">🏆</span>
                        <p className="text-white/60">No data yet. Be the first contributor!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {leaderboard.map((entry, i) => (
                            <div
                                key={entry.rank}
                                className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${i === 0 ? 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border border-yellow-500/30' :
                                        i === 1 ? 'bg-gradient-to-r from-gray-400/30 to-gray-500/30 border border-gray-400/30' :
                                            i === 2 ? 'bg-gradient-to-r from-orange-600/30 to-orange-700/30 border border-orange-600/30' :
                                                'glass-card'
                                    }`}
                            >
                                {/* Rank */}
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl ${i === 0 ? 'bg-yellow-500 text-black' :
                                        i === 1 ? 'bg-gray-400 text-black' :
                                            i === 2 ? 'bg-orange-600 text-white' :
                                                'bg-white/10 text-white'
                                    }`}>
                                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : entry.rank}
                                </div>

                                {/* User Info */}
                                <div className="flex-1">
                                    <div className="font-bold text-white text-lg">{entry.display_name}</div>
                                    <div className="text-white/50 text-sm flex items-center gap-3">
                                        <span>📋 {entry.submissions} reports</span>
                                        <span>✅ {entry.resolved} resolved</span>
                                    </div>
                                </div>

                                {/* Badge */}
                                {entry.top_badge && (
                                    <div className="text-3xl" title={entry.top_badge.name}>
                                        {entry.top_badge.icon}
                                    </div>
                                )}

                                {/* Points */}
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-yellow-400">{entry.points}</div>
                                    <div className="text-xs text-white/40">points</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* CTA */}
                <div className="text-center mt-10">
                    <button
                        onClick={() => navigate('/submit')}
                        className="btn-primary px-10 py-5 text-lg"
                    >
                        🎤 Report an Issue & Earn Points
                    </button>
                </div>
            </div>
        </div>
    );
}
