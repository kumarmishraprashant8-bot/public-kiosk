import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const PREDICTIONS = [
    { id: 1, type: 'Pipe Burst', location: 'Sector 4 Main Line', probability: 85, time: '48h', severity: 'Critical' },
    { id: 2, type: 'Transformer Overload', location: 'Indiranagar Phase 1', probability: 72, time: '72h', severity: 'High' },
    { id: 3, type: 'Road Collapse', location: 'MG Road Junction', probability: 45, time: '5d', severity: 'Medium' },
];

const GRAPH_DATA = [
    { name: 'Mon', failures: 2, cost: 12000 },
    { name: 'Tue', failures: 3, cost: 18000 },
    { name: 'Wed', failures: 1, cost: 8000 },
    { name: 'Thu', failures: 5, cost: 45000 },
    { name: 'Fri', failures: 4, cost: 32000 },
    { name: 'Sat', failures: 7, cost: 68000 },
    { name: 'Sun', failures: 6, cost: 55000 },
];

export default function PredictivePanel() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleDownloadReport = () => {
        const headers = ["ID", "Type", "Location", "Probability", "Time", "Severity"];
        const rows = PREDICTIONS.map(p => [p.id, p.type, p.location, `${p.probability}%`, p.time, p.severity]);

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "predictive_maintenance_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-6 shadow-xl h-full flex flex-col">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-purple-400">🔮</span> AI PREDICTIVE MAINTENANCE
                </h2>

                <div className="space-y-4 flex-1 overflow-auto">
                    {PREDICTIONS.map((pred) => (
                        <div key={pred.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <h3 className="text-white font-bold">{pred.type}</h3>
                                    <p className="text-slate-400 text-sm">{pred.location}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${pred.severity === 'Critical' ? 'bg-red-500/20 text-red-400' :
                                        pred.severity === 'High' ? 'bg-orange-500/20 text-orange-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {pred.severity}
                                    </span>
                                    <p className="text-xs text-slate-500 mt-1">ETA: {pred.time}</p>
                                </div>
                            </div>

                            <div className="mt-3">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-400">Risk Probability</span>
                                    <span className="text-purple-400 font-bold">{pred.probability}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${pred.probability}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full mt-4 py-2 text-sm text-purple-300 border border-purple-500/30 rounded hover:bg-purple-500/10 transition-colors"
                >
                    View Full Forecast Analysis
                </button>
            </div>

            {/* Full Forecast Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="text-2xl">🔮</span> Predictive Analytics Report
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-8">
                            {/* Section 1: Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                                    <p className="text-slate-400 text-sm">Predicted Failures (7 Days)</p>
                                    <p className="text-3xl font-bold text-white mt-1">14</p>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                                    <p className="text-slate-400 text-sm">Est. Cost Savings</p>
                                    <p className="text-3xl font-bold text-emerald-400 mt-1">₹4.2L</p>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                                    <p className="text-slate-400 text-sm">AI Confidence Score</p>
                                    <p className="text-3xl font-bold text-purple-400 mt-1">94%</p>
                                </div>
                            </div>

                            {/* Section 2: Detailed Table */}
                            <div>
                                <h3 className="text-lg font-bold text-white mb-4">Upcoming Risks</h3>
                                <div className="overflow-x-auto rounded-lg border border-slate-700">
                                    <table className="w-full text-left text-sm text-slate-300">
                                        <thead className="bg-slate-800 text-xs uppercase text-slate-400">
                                            <tr>
                                                <th className="px-4 py-3">Infrastructure</th>
                                                <th className="px-4 py-3">Issue Type</th>
                                                <th className="px-4 py-3">Location</th>
                                                <th className="px-4 py-3">Probability</th>
                                                <th className="px-4 py-3">Est. Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                                            {PREDICTIONS.map(p => (
                                                <tr key={p.id} className="hover:bg-slate-800/50">
                                                    <td className="px-4 py-3 font-medium text-white">{p.type.split(' ')[0]}</td>
                                                    <td className="px-4 py-3">{p.type}</td>
                                                    <td className="px-4 py-3">{p.location}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`font-bold ${p.probability > 80 ? 'text-red-400' : 'text-orange-400'}`}>{p.probability}%</span>
                                                    </td>
                                                    <td className="px-4 py-3">{p.time}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Section 3: Visuals */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 h-64">
                                    <p className="text-slate-400 text-sm mb-4">Failure Probability Trend</p>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={GRAPH_DATA}>
                                            <defs>
                                                <linearGradient id="colorFailures" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                                itemStyle={{ color: '#e2e8f0' }}
                                            />
                                            <Area type="monotone" dataKey="failures" stroke="#8884d8" fillOpacity={1} fill="url(#colorFailures)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 h-64">
                                    <p className="text-slate-400 text-sm mb-4">Est. Cost Impact (₹)</p>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={GRAPH_DATA}>
                                            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                                itemStyle={{ color: '#e2e8f0' }}
                                            />
                                            <Bar dataKey="cost" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-800 bg-slate-800/50 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">Close</button>
                            <button
                                onClick={handleDownloadReport}
                                className="px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-500 transition-colors shadow-lg shadow-purple-900/20"
                            >
                                Download Full Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
