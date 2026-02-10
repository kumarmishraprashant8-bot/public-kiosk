import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import AIAlertsPanel from '../components/AIAlertsPanel';
import DemandForecast from '../components/DemandForecast';

export default function AdminDashboard() {
    const [metrics, setMetrics] = useState<any>(null);
    const [clusters, setClusters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCluster, setSelectedCluster] = useState<any>(null);
    const navigate = useNavigate();
    const [disasterMode, setDisasterMode] = useState(false);

    // Fake Disaster Data
    const disasterClusters = [
        {
            cluster_id: 999,
            intent: "FLASH_FLOOD",
            ward: "Koramangala Block 4",
            priority: "critical",
            created_at: new Date().toISOString(),
            size: 142,
            assigned_crew_id: null,
            severity_reasons: ["Life Threatening", "Grid Failure Imminent", "Mass Evacuation Needed"],
            clustering_reason: "High volume of distress calls (142) in 10 mins. Water levels rising > 3ft.",
            cost_analysis: { total_cost: 5000000, hourly_rate: 100000 },
            suggested_actions: [
                { suggested_crews: [{ id: 99, name: "NDRF Team A", specialty: "Rescue" }] }
            ]
        },
        {
            cluster_id: 998,
            intent: "BUILDING_COLLAPSE",
            ward: "Indiranagar",
            priority: "critical",
            created_at: new Date().toISOString(),
            size: 45,
            assigned_crew_id: null,
            severity_reasons: ["Casualties Reported", "Gas Leak Detected"],
            clustering_reason: "Multiple reports of structural failure.",
            cost_analysis: { total_cost: 20000000, hourly_rate: 500000 },
            suggested_actions: [
                { suggested_crews: [{ id: 98, name: "Fire Brigade Unit 1", specialty: "Fire/Rescue" }] }
            ]
        }
    ];

    const displayClusters = disasterMode ? disasterClusters : clusters;
    const bgClass = disasterMode ? "bg-red-950" : "bg-gray-900";

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // 10s polling
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [mRes, cRes] = await Promise.all([
                api.get('/api/admin/metrics?password=admin123'),
                api.get('/api/admin/clusters?password=admin123')
            ]);
            setMetrics(mRes.data);
            setClusters(cRes.data.clusters);
            setLoading(false);
        } catch (err) {
            console.error("Admin fetch failed", err);
            setLoading(false); // Stop loading on error
            // Optional: Set an error state to display to the user
        }
    };

    const handleExplain = async (clusterId: number) => {
        try {
            const res = await api.get(`/api/admin/cluster/${clusterId}/explain?password=admin123`);
            setSelectedCluster(res.data);
        } catch (err) {
            alert("Failed to load details");
        }
    };

    const handleAssign = async (crewId: number) => {
        if (!selectedCluster) return;
        try {
            await api.post(`/api/admin/cluster/${selectedCluster.cluster_id}/assign?crew_id=${crewId}&password=admin123`);
            alert("Crew Assigned!");
            setSelectedCluster(null);
            fetchData();
        } catch (err) {
            alert("Assignment failed");
        }
    };

    const handleSeatDemo = async () => {
        if (!confirm("Create demo data?")) return;
        await api.post('/api/admin/seed-demo?password=admin123&count=20');
        fetchData();
    }

    if (loading) return <div className="p-10 text-white text-center">Loading Command Center...</div>;

    // Fallback if metrics failed to load
    if (!metrics) return (
        <div className="p-10 text-white text-center">
            <h2 className="text-xl text-red-400">Connection Failed</h2>
            <p>Could not connect to the backend server.</p>
            <p className="text-sm text-gray-400 mt-2">Make sure the backend is running on port 8000.</p>
            <button onClick={fetchData} className="mt-4 bg-blue-600 px-4 py-2 rounded">Retry</button>
        </div>
    );

    return (
        <div className={`min-h-screen ${bgClass} text-white p-6 transition-colors duration-500`}>
            {disasterMode && (
                <div className="fixed inset-0 pointer-events-none border-8 border-red-600 animate-pulse z-50 opacity-50"></div>
            )}
            <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4 relative z-10">
                <div>
                    <h1 className={`text-3xl font-bold bg-clip-text text-transparent ${disasterMode ? "bg-gradient-to-r from-red-500 to-orange-500" : "bg-gradient-to-r from-blue-400 to-purple-400"
                        }`}>
                        {disasterMode ? "🚨 NATIONAL EMERGENCY RESPONSE" : "CivicPulse Command Center"}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {disasterMode ? "Activating Protocols: NDRF, Fire, Police" : "Real-time City Operations Monitoring"}
                    </p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setDisasterMode(!disasterMode)}
                        className={`px-4 py-2 rounded shadow font-bold transition-all ${disasterMode ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-gray-700 hover:bg-gray-600"
                            }`}
                    >
                        {disasterMode ? "⚠ DEACTIVATE EMERGENCY" : "☢ DISASTER MODE"}
                    </button>
                    <button onClick={handleSeatDemo} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded shadow text-xs">
                        🌱 Seed Data
                    </button>
                    <button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded shadow">
                        Exit to Kiosk
                    </button>
                </div>
            </header>

            {/* Metrics Row */}
            {metrics && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <MetricCard title="Active Issues" value={metrics.active_clusters} color="text-red-400" />
                    <MetricCard title="24h Submissions" value={metrics.submissions_24h} color="text-blue-400" />
                    <MetricCard title="Resolved" value={metrics.resolved_24h} color="text-green-400" />
                    <MetricCard title="Avg Resolution" value={metrics.avg_resolution_time} color="text-yellow-400" />
                    <MetricCard title="Cost/Hour" value={`₹${metrics.throughput_per_hour * 500}`} color="text-orange-400" />
                </div>
            )}

            {/* AI Insights Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <AIAlertsPanel />
                <DemandForecast />
            </div>

            {/* Main Content Area */}
            <div className="flex gap-6">
                {/* Cluster Feed */}
                <div className="w-full lg:w-2/3">
                    <h2 className="text-xl font-bold mb-4 pl-2 border-l-4 border-blue-500">Live Incident Clusters</h2>
                    <div className="grid gap-4">
                        {displayClusters.map(cluster => (
                            <div
                                key={cluster.cluster_id}
                                onClick={() => handleExplain(cluster.cluster_id)}
                                className={`bg-gray-800 p-4 rounded-lg shadow-lg cursor-pointer hover:bg-gray-750 border-l-4 transition-all
                                    ${cluster.priority === 'urgent' ? 'border-red-500' : 'border-blue-500'}
                                    ${selectedCluster?.cluster_id === cluster.cluster_id ? 'ring-2 ring-blue-400' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg">{cluster.intent.replace('_', ' ').toUpperCase()}</h3>
                                        <p className="text-gray-400 text-sm">📍 {cluster.ward || "Unknown Ward"}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${cluster.priority === 'urgent' ? 'bg-red-900 text-red-100' : 'bg-blue-900 text-blue-100'}`}>
                                            {cluster.priority.toUpperCase()}
                                        </span>
                                        <p className="text-xs mt-1 text-gray-500">{new Date(cluster.created_at).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                                <div className="mt-3 flex justify-between items-end">
                                    <div className="text-sm text-gray-300">
                                        <span className="font-bold">{cluster.size || 1}</span> citizen reports
                                    </div>
                                    {cluster.assigned_crew_id ? (
                                        <span className="text-green-400 text-xs">✓ Crew Assigned</span>
                                    ) : (
                                        <span className="text-orange-400 text-xs">⚠ Unassigned</span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {clusters.length === 0 && <p className="text-gray-500 items-center">No active clusters.</p>}
                    </div>
                </div>

                {/* Details Panel */}
                <div className="w-full lg:w-1/3">
                    {selectedCluster ? (
                        <div className="bg-gray-800 p-6 rounded-lg shadow-xl sticky top-6 border border-gray-700">
                            <h2 className="text-2xl font-bold mb-1">{selectedCluster.intent.replace('_', ' ')}</h2>
                            <p className="text-gray-400 mb-4">Cluster #{selectedCluster.cluster_id}</p>

                            <div className="space-y-4">
                                <div className="bg-gray-900 p-3 rounded">
                                    <p className="text-sm font-bold text-gray-500 uppercase">Analysis</p>
                                    <p className="text-sm mt-1">{selectedCluster.clustering_reason}</p>
                                </div>

                                <div>
                                    <p className="text-sm font-bold text-gray-500 uppercase mb-2">Severity Factors</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedCluster.severity_reasons.map((r: string, i: number) => (
                                            <span key={i} className="px-2 py-1 bg-red-900/40 text-red-200 text-xs rounded border border-red-900">
                                                {r}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-bold text-gray-500 uppercase mb-2">Cost Impact</p>
                                    <p className="text-xl font-mono text-orange-400">
                                        ₹{Math.round(selectedCluster.cost_analysis?.total_cost || 0).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-500">Increasing by ₹{Math.round(selectedCluster.cost_analysis?.hourly_rate || 0)}/hr</p>
                                </div>

                                <div className="pt-4 border-t border-gray-700">
                                    <p className="text-sm font-bold text-gray-500 uppercase mb-3">Recommended Actions</p>
                                    {selectedCluster.assigned_crew_id ? (
                                        <div className="bg-green-900/30 p-3 rounded text-green-300 text-center">
                                            Currently handled by Crew
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {selectedCluster.suggested_actions?.map((action: any, i: number) => (
                                                <div key={i}>
                                                    {action.suggested_crews?.map((crew: any) => (
                                                        <button
                                                            key={crew.id}
                                                            onClick={() => handleAssign(crew.id)}
                                                            className="w-full text-left p-3 rounded bg-blue-600 hover:bg-blue-500 transition-colors flex justify-between items-center mb-2"
                                                        >
                                                            <span>Assign <strong>{crew.name}</strong></span>
                                                            <span className="text-xs bg-blue-800 px-2 py-1 rounded">{crew.specialty}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            ))}
                                            {(!selectedCluster.suggested_actions || selectedCluster.suggested_actions.length === 0) && (
                                                <button onClick={() => handleAssign(1)} className="w-full p-3 bg-gray-600 rounded">
                                                    Manual Assign (Default Crew)
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-800/50 p-10 rounded-lg text-center border border-gray-700 border-dashed">
                            <span className="text-4xl block mb-2">👈</span>
                            <p className="text-gray-400">Select an incident to view AI analysis and Dispatch options.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, color }: { title: string, value: any, color: string }) {
    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow border-b-2 border-gray-700">
            <p className="text-gray-500 text-xs uppercase font-bold">{title}</p>
            <p className={`text-2xl font-mono font-bold mt-1 ${color}`}>{value}</p>
        </div>
    );
}
