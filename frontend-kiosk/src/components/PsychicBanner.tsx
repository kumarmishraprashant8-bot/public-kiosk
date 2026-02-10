import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

interface PredictedEvent {
    id: number;
    intent: string;
    status: string;
    confidence: number;
}

export default function PsychicBanner() {
    const [event, setEvent] = useState<PredictedEvent | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Poll for predicted events
        const checkEvents = async () => {
            try {
                const res = await api.get<PredictedEvent[]>('/api/predicted_events');
                // Find the highest confidence predicted event
                const highest = res.data
                    .filter(e => e.status === 'predicted')
                    .sort((a, b) => b.confidence - a.confidence)[0];
                setEvent(highest || null);
            } catch (err) {
                console.error("Psychic check failed", err);
            }
        };

        checkEvents();
        const interval = setInterval(checkEvents, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    const handleConfirm = async () => {
        if (!event) return;
        setLoading(true);
        try {
            const res = await api.post(`/api/predicted_events/${event.id}/confirm`);
            // Navigate to receipt using the receipt_id
            navigate(`/receipt/${res.data.receipt_id}`, {
                state: { message: "Confirmed! You have been added to the report." }
            });
        } catch (err) {
            alert("Failed to confirm. Please try again.");
            setLoading(false);
        }
    };

    if (!event) return null;

    const labels: Record<string, string> = {
        water_outage: "Major Water Outage Detected",
        electricity_outage: "Power Outage Detected",
        road: "Major Road Blockage",
        garbage: "Garbage Pileup Alert"
    };

    return (
        <div className="w-full max-w-4xl mx-auto mb-8 animate-slide-up">
            <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-2xl p-6 shadow-2xl border-2 border-red-400/50 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">

                {/* Pulse Effect */}
                <div className="absolute top-0 left-0 w-full h-full bg-red-500/10 animate-pulse"></div>

                <div className="flex items-center gap-5 z-10">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <span className="text-4xl">⚠️</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">
                            {labels[event.intent] || "Incident Detected"}
                        </h2>
                        <p className="text-red-100 text-lg">
                            Confidence: {(event.confidence * 100).toFixed(0)}% • ETA: 2 Hours
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="z-10 bg-white text-red-700 font-bold py-4 px-8 rounded-xl text-xl hover:bg-red-50 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
                >
                    {loading ? "Confirming..." : "✋ I'm Affected Too"}
                </button>
            </div>
        </div>
    );
}
