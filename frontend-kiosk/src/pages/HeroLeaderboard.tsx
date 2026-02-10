import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';

interface Hero {
    user_id: number;
    display_name: string;
    points: number;
    top_badge: {
        name: string;
        icon: string;
    } | null;
    resolved: number;
    submissions: number;
}

export default function HeroLeaderboard() {
    const [heroes, setHeroes] = useState<Hero[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                // Determine ward from URL or storage if needed, defaulting to city-wide
                const res = await api.get('/gamification/leaderboard?limit=10');
                setHeroes(res.data.leaderboard);
            } catch (err) {
                console.error("Failed to fetch leaderboard", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
        // Refresh every 30 seconds for "Live" feel
        const interval = setInterval(fetchLeaderboard, 30000);
        return () => clearInterval(interval);
    }, []);

    const getAvatar = (id: number) => {
        const avatars = ["👨🏽", "👩🏽", "👨🏻", "👩🏻", "🧔🏽", "👵🏽", "👴🏽", "🧕🏽"];
        return avatars[id % avatars.length];
    };

    return (
        <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center overflow-hidden relative">

            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-black z-0" />

            <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                className="z-10 text-center mb-12"
            >
                <h1 className="text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">
                    🏆 CITY HEROES
                </h1>
                <p className="text-2xl text-blue-200">Top Citizens Making a Difference</p>
                <p className="text-sm text-blue-400/60 mt-2 animate-pulse">● LIVE UPDATES</p>
            </motion.div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin text-4xl">⏳</div>
                </div>
            ) : (
                <div className="w-full max-w-4xl z-10 grid gap-4">
                    {heroes.map((hero, index) => (
                        <motion.div
                            key={hero.user_id}
                            initial={{ opacity: 0, x: -100 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-gray-800/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center justify-between transform hover:scale-[1.02] transition-all shadow-lg hover:shadow-yellow-500/10 hover:border-yellow-500/30"
                        >
                            <div className="flex items-center gap-6">
                                <div className={`text-3xl font-bold w-12 ${index < 3 ? 'text-yellow-400' : 'text-slate-500'}`}>
                                    #{index + 1}
                                </div>
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-3xl shadow-lg ring-2 ring-white/10">
                                    {getAvatar(hero.user_id)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        {hero.display_name}
                                        {index === 0 && <span className="ml-2 text-yellow-400">👑</span>}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm mt-1">
                                        {hero.top_badge && (
                                            <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-500/30 flex items-center gap-1">
                                                {hero.top_badge.icon} {hero.top_badge.name}
                                            </span>
                                        )}
                                        <span className="text-slate-400">
                                            {hero.submissions} reports
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-2xl font-bold text-green-400">{hero.points.toLocaleString()} pts</div>
                                <p className="text-gray-400 text-xs">{hero.resolved} issues resolved</p>
                            </div>
                        </motion.div>
                    ))}

                    {heroes.length === 0 && (
                        <div className="text-center p-8 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-xl text-slate-400">No heroes yet. Be the first!</p>
                        </div>
                    )}
                </div>
            )}

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2, repeat: Infinity, repeatType: "reverse", duration: 2 }}
                className="mt-12 text-center text-white/50 z-10"
            >
                <p>Submit a complaint to join the leaderboard!</p>
            </motion.div>
        </div>
    );
}
