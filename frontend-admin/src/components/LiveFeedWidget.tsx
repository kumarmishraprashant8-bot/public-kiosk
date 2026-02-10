import { useState, useEffect } from 'react';

export default function LiveFeedWidget() {
    const [scanData, setScanData] = useState({ sector: 4, objects: 12, anomaly: 'None' });

    useEffect(() => {
        const interval = setInterval(() => {
            setScanData(prev => ({
                sector: (prev.sector % 8) + 1,
                objects: Math.floor(Math.random() * 20) + 5,
                anomaly: Math.random() > 0.8 ? 'Illegal Dumping' : 'None'
            }));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-4 shadow-xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    GOD'S EYE - DRONE FEED
                </h2>
                <span className="text-xs font-mono text-cyan-400 border border-cyan-400/30 px-2 py-0.5 rounded">
                    LIVE: DRONE-ALPHA-1
                </span>
            </div>

            <div className="relative flex-1 bg-black rounded-lg overflow-hidden border border-slate-700 group">
                {/* Simulated Drone Feed (Abstract CSS Animation) */}
                <div className="absolute inset-0 opacity-40">
                    <div className="w-full h-full bg-[radial-gradient(circle_at_50%_50%,_#1e293b_0%,_#000000_100%)] animate-pulse" />
                    <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 gap-1 opacity-20">
                        {Array.from({ length: 144 }).map((_, i) => (
                            <div key={i} className="border border-green-500/30" />
                        ))}
                    </div>
                </div>

                {/* Scanning Overlay */}
                <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-[scan_4s_linear_infinite]" />

                {/* HUD Overlay */}
                <div className="absolute inset-0 p-4 font-mono text-xs text-green-400/80 pointer-events-none">
                    <div className="flex justify-between">
                        <div>
                            <p>ALT: 120m</p>
                            <p>SPD: 45km/h</p>
                            <p>BAT: 78%</p>
                        </div>
                        <div className="text-right">
                            <p>LOC: 12.9716° N</p>
                            <p>     77.5946° E</p>
                            <p>SEC: {scanData.sector}</p>
                        </div>
                    </div>

                    {/* Target Reticle */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white/30 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <div className="absolute top-0 w-full h-full border-t border-b border-transparent border-l border-r border-green-500/50 animate-spin" />
                    </div>

                    {/* Detected Objects */}
                    <div className="absolute bottom-4 left-4 bg-black/50 p-2 rounded border border-green-500/30">
                        <p className="text-white font-bold">AI ANALYSIS:</p>
                        <p>Objects: {scanData.objects}</p>
                        <p className={scanData.anomaly !== 'None' ? 'text-red-500 animate-pulse font-bold' : 'text-green-500'}>
                            Anomaly: {scanData.anomaly}
                        </p>
                    </div>
                </div>

                {/* City Image/Fallback */}
                <img
                    src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2613&auto=format&fit=crop"
                    alt="City View"
                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30 grayscale"
                />
            </div>
            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
}
