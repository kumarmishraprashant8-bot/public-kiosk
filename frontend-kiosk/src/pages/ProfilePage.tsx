import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    points: number;
    earned: boolean;
}

interface ProfileData {
    user_id: number;
    phone_masked: string;
    total_points: number;
    level: number;
    level_name: string;
    points_to_next_level: number;
    badges: Badge[];
    all_badges: Badge[];
    stats: {
        total_submissions: number;
        resolved_count: number;
        streak_days: number;
    };
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            // Get user ID from token or use demo user
            const res = await api.get('/gamification/profile/1');
            setProfile(res.data);
        } catch (err) {
            console.error('Failed to load profile', err);
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

    if (!profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6">
                <span className="text-6xl mb-4">👤</span>
                <h2 className="text-2xl font-bold text-white mb-2">No Profile Found</h2>
                <p className="text-white/60 mb-6">Submit your first complaint to start earning badges!</p>
                <button onClick={() => navigate('/submit')} className="btn-primary px-8 py-4">
                    Submit Complaint →
                </button>
            </div>
        );
    }

    const progressPercent = profile.points_to_next_level > 0
        ? ((profile.total_points % 500) / 500) * 100
        : 100;

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <button onClick={() => navigate('/')} className="text-white/60 mb-6 flex items-center gap-2">
                ← Back to Home
            </button>

            {/* Profile Card */}
            <div className="glass-card p-8 mb-8 text-center">
                <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-4xl">
                    👤
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">{profile.phone_masked}</h1>
                <p className="text-blue-400 font-medium text-lg mb-4">{profile.level_name}</p>

                {/* Points Display */}
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl p-6 mb-6">
                    <div className="text-5xl font-bold text-yellow-400 mb-2">
                        {profile.total_points.toLocaleString()}
                    </div>
                    <p className="text-white/60">Total Points</p>
                </div>

                {/* Level Progress */}
                <div className="mb-6">
                    <div className="flex justify-between text-sm text-white/60 mb-2">
                        <span>Level {profile.level}</span>
                        <span>{profile.points_to_next_level} pts to Level {profile.level + 1}</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-xl p-4">
                        <div className="text-2xl font-bold text-white">{profile.stats.total_submissions}</div>
                        <div className="text-xs text-white/50">Reports</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                        <div className="text-2xl font-bold text-green-400">{profile.stats.resolved_count}</div>
                        <div className="text-xs text-white/50">Resolved</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                        <div className="text-2xl font-bold text-orange-400">{profile.stats.streak_days}🔥</div>
                        <div className="text-xs text-white/50">Day Streak</div>
                    </div>
                </div>
            </div>

            {/* Earned Badges */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    🏆 Earned Badges ({profile.badges.length})
                </h2>
                {profile.badges.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {profile.badges.map(badge => (
                            <div key={badge.id} className="glass-card p-4 text-center transform hover:scale-105 transition-transform">
                                <div className="text-4xl mb-2">{badge.icon}</div>
                                <h3 className="font-bold text-white text-sm">{badge.name}</h3>
                                <p className="text-xs text-white/50 mt-1">{badge.description}</p>
                                <div className="mt-2 text-yellow-400 text-xs font-bold">+{badge.points} pts</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="glass-card p-8 text-center">
                        <span className="text-4xl block mb-2">🎯</span>
                        <p className="text-white/60">No badges yet. Keep reporting to earn your first badge!</p>
                    </div>
                )}
            </div>

            {/* All Badges (unearned shown grayed) */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4">🎖️ All Badges</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {profile.all_badges.map(badge => (
                        <div
                            key={badge.id}
                            className={`glass-card p-4 text-center transition-all ${badge.earned
                                    ? 'border-2 border-yellow-400/50'
                                    : 'opacity-40 grayscale'
                                }`}
                        >
                            <div className="text-3xl mb-2">{badge.icon}</div>
                            <h3 className="font-bold text-white text-sm">{badge.name}</h3>
                            <p className="text-xs text-white/50 mt-1">{badge.description}</p>
                            {badge.earned && (
                                <div className="mt-2 text-green-400 text-xs">✓ Earned</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
