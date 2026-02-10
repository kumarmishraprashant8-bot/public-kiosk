import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

interface LevelUpOverlayProps {
    points: number;
    onClose: () => void;
}

export default function LevelUpOverlay({ points, onClose }: LevelUpOverlayProps) {
    const [show, setShow] = useState(true);

    useEffect(() => {
        // Trigger confetti
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#FFD700', '#FFA500', '#FF4500']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#00BFFF', '#1E90FF', '#4169E1']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();

        // Auto close after 4 seconds
        const timer = setTimeout(() => {
            setShow(false);
            setTimeout(onClose, 500); // Wait for exit animation
        }, 4000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none"
                >
                    <div className="bg-black/80 backdrop-blur-xl p-8 rounded-3xl border-2 border-yellow-500/50 text-center shadow-[0_0_100px_rgba(255,215,0,0.3)] pointer-events-auto max-w-sm w-full relative overflow-hidden">

                        {/* Shining effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent skew-x-12 animate-shimmer" />

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <span className="text-6xl mb-4 block animate-bounce">⭐</span>
                            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 mb-2">
                                LEVEL UP!
                            </h2>
                            <p className="text-blue-200 text-lg mb-6">Citizen Status Updated</p>
                        </motion.div>

                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
                            className="bg-white/10 rounded-xl p-4 mb-6 border border-white/20"
                        >
                            <div className="text-5xl font-bold text-green-400">+{points}</div>
                            <div className="text-xs uppercase tracking-widest text-green-200/60 mt-1">Experience Points</div>
                        </motion.div>

                        <button
                            onClick={() => setShow(false)}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:scale-105 transition-transform"
                        >
                            AWESOME!
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
