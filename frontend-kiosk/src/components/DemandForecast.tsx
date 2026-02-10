import { useState, useEffect } from 'react';
import api from '../utils/api';

interface ForecastDay {
    date: string;
    day_name: string;
    by_intent: Record<string, number>;
    total_expected: number;
    crew_needed: number;
}

export default function DemandForecast() {
    const [forecast, setForecast] = useState<ForecastDay[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchForecast();
    }, []);

    const fetchForecast = async () => {
        try {
            const res = await api.get('/ai-alerts/forecast');
            setForecast(res.data.forecast);
        } catch (err) {
            console.error('Failed to fetch forecast', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-4 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-32 bg-gray-700 rounded"></div>
            </div>
        );
    }

    const maxTotal = Math.max(...forecast.map(f => f.total_expected), 1);

    return (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                    📊 7-Day Demand Forecast
                </h3>
                <span className="text-xs text-white/40">AI-Powered</span>
            </div>

            <div className="grid grid-cols-7 gap-2">
                {forecast.map(day => (
                    <div key={day.date} className="text-center">
                        <div className="text-xs text-white/50 mb-2">
                            {day.day_name.slice(0, 3)}
                        </div>
                        <div
                            className="bg-gradient-to-t from-blue-500/50 to-purple-500/50 rounded-lg mx-auto mb-2"
                            style={{
                                height: '80px',
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            <div
                                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-purple-500 rounded-lg transition-all"
                                style={{
                                    height: `${(day.total_expected / maxTotal) * 100}%`,
                                    minHeight: '10px',
                                }}
                            ></div>
                        </div>
                        <div className="text-lg font-bold text-white">{day.total_expected}</div>
                        <div className="text-xs text-white/40">expected</div>
                        <div className="mt-1 px-2 py-1 bg-green-500/20 rounded text-xs text-green-300">
                            👷 {day.crew_needed} crews
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 p-3 bg-blue-500/10 rounded-lg">
                <p className="text-sm text-blue-200">
                    💡 <strong>Tip:</strong> Schedule {forecast.reduce((sum, d) => sum + d.crew_needed, 0)} total crew-days for optimal coverage this week.
                </p>
            </div>
        </div>
    );
}
