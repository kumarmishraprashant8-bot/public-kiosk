import { useState, useEffect } from 'react';

interface FeaturedIssue {
    id: number;
    intent: string;
    ward: string;
    before_text: string;
    after_text: string;
    resolved_at: string;
    resolution_time_hours: number;
}

export default function FeaturedResolutions() {
    const [featured, setFeatured] = useState<FeaturedIssue[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        fetchFeatured();
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % 3); // Cycle through 3 items
        }, 3000); // Faster 3s interval
        return () => clearInterval(interval);
    }, []);

    const fetchFeatured = async () => {
        // Mock data remains safely set
        setFeatured([
            {
                id: 1,
                intent: "water_outage",
                ward: "Koramangala",
                before_text: "No water supply for 2 days",
                after_text: "Pipeline repaired, supply restored",
                resolved_at: new Date().toISOString(),
                resolution_time_hours: 4.5,
            },
            {
                id: 2,
                intent: "road",
                ward: "Indiranagar",
                before_text: "Large pothole causing accidents",
                after_text: "Pothole filled and road leveled",
                resolved_at: new Date().toISOString(),
                resolution_time_hours: 6.2,
            },
            {
                id: 3,
                intent: "streetlight",
                ward: "HSR Layout",
                before_text: "Street lights dark for a week",
                after_text: "New LED lights installed",
                resolved_at: new Date().toISOString(),
                resolution_time_hours: 2.1,
            },
        ]);
    };

    if (featured.length === 0) return null;

    const current = featured[currentIndex];

    const intentIcons: Record<string, string> = {
        water_outage: "💧",
        electricity_outage: "⚡",
        road: "🛣️",
        garbage: "🗑️",
        streetlight: "💡",
        sewage: "🚰",
    };

    return (
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6 mb-6 relative overflow-hidden">
            {/* Animated Progress Bar Background */}
            <div key={currentIndex} className="absolute bottom-0 left-0 h-1 bg-green-500/30 animate-progress w-full origin-left" style={{ animationDuration: '3000ms' }}></div>

            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white/80 font-medium flex items-center gap-2">
                    <span className="text-green-400 animate-pulse">✓</span> Recently Resolved
                </h3>
                {/* Non-clickable continuous dots */}
                <div className="flex gap-1.5 bg-black/20 p-1.5 rounded-full">
                    {featured.map((_, i) => (
                        <div
                            key={i}
                            className={`h-2 rounded-full transition-all duration-500 ease-in-out ${i === currentIndex
                                    ? 'w-6 bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]'
                                    : 'w-2 bg-white/20'
                                }`}
                        />
                    ))}
                </div>
            </div>

            <div className="flex items-start gap-4 animate-fadeIn" key={current.id}>
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl flex-shrink-0 shadow-lg shadow-green-900/20">
                    {intentIcons[current.intent] || "📋"}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{current.before_text}</div>
                    <div className="text-green-400 text-sm flex items-center gap-2 mt-1 font-medium">
                        <span>→</span>
                        <span className="truncate">{current.after_text}</span>
                    </div>
                    <div className="text-white/40 text-xs mt-2 flex items-center gap-3">
                        <span className="flex items-center gap-1">📍 {current.ward}</span>
                        <span className="flex items-center gap-1">⏱️ {current.resolution_time_hours}h</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
