import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';

interface Hero {
    user_id: number;
    display_name: string;
    points: number;
    top_badge: {
        name: string;
        icon: string;
    } | null;
}

export default function CityHeroesTicker() {
    const [heroes, setHeroes] = useState<Hero[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const fetchHeroes = async () => {
            try {
                const res = await api.get('/gamification/leaderboard?limit=5');
                setHeroes(res.data.leaderboard);
            } catch (err) {
                console.error("Failed to load heroes", err);
            }
        };
        fetchHeroes();
    }, []);

    useEffect(() => {
        if (heroes.length === 0) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % heroes.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [heroes]);

    if (heroes.length === 0) return null;

    return (
        <div className="w-full max-w-2xl mx-auto mb-6">
            <div className="bg-gradient-to-r from-yellow-900/40 to-amber-900/40 border border-yellow-500/30 rounded-xl p-3 flex items-center gap-4 relative overflow-hidden">
                <div className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded uppercase tracking-wider animate-pulse">
                    🏆 Top Hero
                </div>

                <div className="flex-1 h-8 relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-xl">
                                    {["🥇", "🥈", "🥉", "🏅", "🏅"][currentIndex]}
                                </span>
                                <span className="font-bold text-yellow-100">
                                    {heroes[currentIndex].display_name}
                                </span>
                                {heroes[currentIndex].top_badge && (
                                    <span className="text-xs text-yellow-500/80 border border-yellow-500/30 px-1.5 rounded-full">
                                        {heroes[currentIndex].top_badge.icon} {heroes[currentIndex].top_badge.name}
                                    </span>
                                )}
                            </div>
                            <span className="font-mono text-yellow-400 font-bold">
                                {heroes[currentIndex].points} pts
                            </span>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
