import { useState, useEffect, useRef } from 'react';
import { Cluster, Submission } from '../types';

interface Message {
    id: number;
    thread_id: number;
    author_type: string;
    author_name: string;
    content: string;
    message_type: string;
    created_at: string;
}

interface Thread {
    id: number;
    thread_id: string;
    messages: Message[];
    status: string;
}

interface Crew {
    id: number;
    crew_id: string;
    name: string;
    specialty: string;
    current_status: string;
}

interface ClusterDrawerProps {
    cluster: Cluster | null;
    submissions: Submission[];
    isOpen: boolean;
    onClose: () => void;
    onAssignCrew: (clusterId: string) => void;
    onMarkResolved: (clusterId: string) => void;
    onExportCSV: (clusterId: string) => void;
}

// @ts-ignore
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

export default function ClusterDrawer({
    cluster,
    submissions,
    isOpen,
    onClose,
    onAssignCrew,
    onMarkResolved,
    onExportCSV,
}: ClusterDrawerProps) {
    const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'sla'>('details');
    const [thread, setThread] = useState<Thread | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [clusterExplanation, setClusterExplanation] = useState<any>(null);
    const [crews, setCrews] = useState<Crew[]>([]);
    const [selectedCrewId, setSelectedCrewId] = useState<number | null>(null);
    const [showCrewSelect, setShowCrewSelect] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (cluster && isOpen) {
            fetchClusterDetails();
            fetchCrews();
        }
    }, [cluster, isOpen]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thread?.messages]);

    const fetchClusterDetails = async () => {
        if (!cluster) return;
        try {
            // Fetch explanation with SLA and cost
            const explainRes = await fetch(
                `${API_URL}/admin/cluster/${cluster.cluster_id}/explain?password=admin123`
            );
            if (explainRes.ok) {
                const data = await explainRes.json();
                setClusterExplanation(data);

                // Fetch thread if exists
                if (data.thread_id) {
                    const threadRes = await fetch(`${API_URL}/threads/${data.thread_id}`);
                    if (threadRes.ok) {
                        setThread(await threadRes.json());
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch cluster details:', error);
        }
    };

    const fetchCrews = async () => {
        try {
            const res = await fetch(`${API_URL}/crews?status=available`);
            if (res.ok) {
                setCrews(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch crews:', error);
        }
    };

    const startConversation = async () => {
        if (!cluster) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/threads?password=admin123`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cluster_id: cluster.id || parseInt(cluster.cluster_id) }),
            });
            if (res.ok) {
                const newThread = await res.json();
                setThread(newThread);
                setActiveTab('chat');
            }
        } catch (error) {
            console.error('Failed to start conversation:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!thread || !newMessage.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/threads/${thread.thread_id}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newMessage,
                    author_type: 'admin',
                    author_name: 'Admin',
                }),
            });
            if (res.ok) {
                const msg = await res.json();
                setThread(prev => prev ? {
                    ...prev,
                    messages: [...prev.messages, msg],
                } : null);
                setNewMessage('');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setLoading(false);
        }
    };

    const assignCrewToCluster = async () => {
        if (!cluster || !selectedCrewId) return;
        setLoading(true);
        try {
            const res = await fetch(
                `${API_URL}/admin/cluster/${cluster.cluster_id}/assign?crew_id=${selectedCrewId}&password=admin123`,
                { method: 'POST' }
            );
            if (res.ok) {
                setShowCrewSelect(false);
                fetchClusterDetails();
                onAssignCrew(cluster.cluster_id);
            }
        } catch (error) {
            console.error('Failed to assign crew:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !cluster) return null;

    const clusterSubmissions = submissions.filter((s) =>
        cluster.submission_ids?.includes(s.id)
    );

    const intentIcons: Record<string, string> = {
        water_outage: '💧',
        electricity_outage: '⚡',
        garbage: '🗑️',
        road: '🛣️',
        sewage: '🚰',
        streetlight: '💡',
        other: '📋',
    };

    const slaStatus = clusterExplanation?.sla_status;
    const costAnalysis = clusterExplanation?.cost_analysis;

    return (
        <>
            {/* Overlay */}
            <div
                className="drawer-overlay animate-fadeIn"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer */}
            <div
                className="fixed top-0 right-0 z-[1310] flex h-full w-full max-w-lg flex-col overflow-hidden border-l border-slate-700 bg-slate-900 shadow-2xl animate-slide-in-right"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-800 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-white">
                            {intentIcons[cluster.intent]} {cluster.intent.replace(/_/g, ' ')}
                        </h2>
                        <p className="text-sm text-slate-400">{cluster.ward} • {cluster.size} reports</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
                    >
                        ✕
                    </button>
                </div>

                {/* SLA Bar */}
                {slaStatus && (
                    <div className={`px-6 py-2.5 ${slaStatus.is_breached ? 'bg-rose-500/20 text-rose-300 border-y border-rose-500/30' : slaStatus.time_remaining_hours < 1 ? 'bg-amber-500/20 text-amber-300 border-y border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-y border-emerald-500/30'}`}>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-xs uppercase tracking-widest">
                                {slaStatus.is_breached ? '🚨 SLA BREACHED' : slaStatus.time_remaining_hours < 1 ? '⚠️ SLA AT RISK' : '✓ SLA On Track'}
                            </span>
                            <span className="text-xs font-mono font-bold">
                                {slaStatus.is_breached
                                    ? `${Math.abs(slaStatus.time_remaining_hours).toFixed(1)}h overdue`
                                    : `${slaStatus.time_remaining_hours.toFixed(1)}h remaining`
                                }
                            </span>
                        </div>
                    </div>
                )}

                {/* Cost Display */}
                {costAnalysis && (
                    <div className="px-6 py-2 bg-slate-800/80 text-white flex items-center justify-between text-[11px] border-b border-slate-700/50">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">💰 Cost of Delay</span>
                        <span className="font-mono font-black text-amber-400">
                            ₹{costAnalysis.total_cost.toLocaleString()} (₹{costAnalysis.hourly_rate}/hr)
                        </span>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-slate-700/50 bg-slate-800/20">
                    {['details', 'chat', 'sla'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-3 text-sm font-medium transition-all ${activeTab === tab
                                ? 'text-primary border-b-2 border-primary bg-primary/5'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                }`}
                        >
                            {tab === 'details' && '📋 Details'}
                            {tab === 'chat' && `💬 Chat ${thread?.messages?.length ? `(${thread.messages.length})` : ''}`}
                            {tab === 'sla' && '⏱️ SLA'}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scroll">
                    {activeTab === 'details' && (
                        <div className="p-6 space-y-4">
                            {/* Cluster Explanation */}
                            {clusterExplanation && (
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                    <h4 className="font-semibold text-blue-400 mb-2">🤖 AI Analysis</h4>
                                    <p className="text-sm text-blue-100/90 leading-relaxed">{clusterExplanation.clustering_reason}</p>
                                    {clusterExplanation.keywords?.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {clusterExplanation.keywords.map((kw: string) => (
                                                <span key={kw} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-md border border-blue-500/30">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Severity Reasons */}
                            {clusterExplanation?.severity_reasons?.length > 0 && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                                    <h4 className="font-semibold text-amber-400 mb-2">⚠️ Severity Factors</h4>
                                    <ul className="text-sm text-amber-100/90 space-y-1.5">
                                        {clusterExplanation.severity_reasons.map((reason: string, i: number) => (
                                            <li key={i} className="flex gap-2">
                                                <span className="text-amber-500">•</span>
                                                {reason}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Sample Texts */}
                            {clusterExplanation?.sample_texts?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-slate-200 mb-2 px-1 text-sm">📝 Sample Reports</h4>
                                    <div className="space-y-2">
                                        {clusterExplanation.sample_texts.map((text: string, i: number) => (
                                            <div key={i} className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 italic leading-relaxed">
                                                "{text}"
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Affected Submissions */}
                            <div>
                                <h4 className="font-semibold text-slate-200 mb-2 px-1 text-sm">
                                    Submissions ({clusterSubmissions.length})
                                </h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scroll pr-1">
                                    {clusterSubmissions.map((sub) => (
                                        <div key={sub.id} className="flex items-center justify-between p-2.5 bg-slate-800/40 border border-slate-700/50 rounded-lg text-sm group hover:bg-slate-800/60 transition-colors">
                                            <span className="text-slate-300 font-mono">#{sub.id}</span>
                                            <span className={`badge ${sub.status === 'resolved' ? 'badge-success' : 'badge-warning'}`}>
                                                {sub.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                    }

                    {
                        activeTab === 'chat' && (
                            <div className="flex flex-col h-full">
                                {thread ? (
                                    <>
                                        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                                            {thread.messages.map((msg) => (
                                                <div
                                                    key={msg.id}
                                                    className={`flex ${msg.author_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm border ${msg.author_type === 'admin'
                                                            ? 'bg-blue-600 text-white border-blue-500/50'
                                                            : msg.author_type === 'system'
                                                                ? 'bg-slate-800/80 text-slate-400 italic border-slate-700/50'
                                                                : msg.author_type === 'crew'
                                                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                                                    : 'bg-slate-800 text-slate-200 border-slate-700/50'
                                                            }`}
                                                    >
                                                        <div className="text-xs opacity-70 mb-1">
                                                            {msg.author_name} • {new Date(msg.created_at).toLocaleTimeString()}
                                                        </div>
                                                        <p className="text-sm">{msg.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            <div ref={chatEndRef} />
                                        </div>
                                        <div className="p-4 border-t border-slate-700/50 bg-slate-900/40">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newMessage}
                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                                    placeholder="Type a message..."
                                                    className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary/50 focus:outline-none focus:border-primary/50 transition-all"
                                                />
                                                <button
                                                    onClick={sendMessage}
                                                    disabled={loading || !newMessage.trim()}
                                                    className="btn btn-primary px-4"
                                                >
                                                    Send
                                                </button>
                                            </div>
                                            <div className="mt-2 flex gap-2">
                                                <button
                                                    onClick={() => setNewMessage('Crew has been dispatched.')}
                                                    className="text-[10px] px-2 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded hover:bg-slate-700 hover:text-white transition-colors"
                                                >
                                                    🚀 Crew dispatched
                                                </button>
                                                <button
                                                    onClick={() => setNewMessage('We are investigating the issue.')}
                                                    className="text-[10px] px-2 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded hover:bg-slate-700 hover:text-white transition-colors"
                                                >
                                                    🔍 Investigating
                                                </button>
                                                <button
                                                    onClick={() => setNewMessage('Issue has been resolved.')}
                                                    className="text-[10px] px-2 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded hover:bg-slate-700 hover:text-white transition-colors"
                                                >
                                                    ✅ Resolved
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center">
                                        <button
                                            onClick={startConversation}
                                            disabled={loading}
                                            className="btn btn-primary"
                                        >
                                            {loading ? 'Starting...' : '💬 Start Conversation'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {
                        activeTab === 'sla' && (
                            <div className="p-6 space-y-4">
                                {slaStatus && (
                                    <div className={`rounded-xl p-5 border ${slaStatus.is_breached ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                                        <h4 className={`font-bold uppercase tracking-wider text-[10px] mb-4 ${slaStatus.is_breached ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            Resolution Track
                                        </h4>
                                        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                            <div>
                                                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Target SLA</span>
                                                <p className="font-bold text-lg text-slate-100">{slaStatus.sla_target_hours}h</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Active Time</span>
                                                <p className="font-bold text-lg text-slate-100">{slaStatus.hours_open.toFixed(1)}h</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Deadline</span>
                                                <p className="font-bold text-xs text-slate-200">{new Date(slaStatus.sla_deadline).toLocaleDateString()}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Remaining</span>
                                                <p className={`font-bold text-lg ${slaStatus.time_remaining_hours < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {slaStatus.time_remaining_hours.toFixed(1)}h
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {costAnalysis && (
                                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                                        <h4 className="font-bold uppercase tracking-wider text-[10px] mb-4 text-amber-500/80">💰 Financial Impact</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Total Delay Cost</span>
                                                <p className="font-mono text-2xl font-black text-amber-400">₹{costAnalysis.total_cost.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Hourly Burn</span>
                                                <p className="font-mono text-lg font-bold text-slate-200">₹{costAnalysis.hourly_rate}/hr</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-slate-700/30">
                                            <p className="text-[10px] text-slate-500 leading-relaxed italic">
                                                * Impact is calculated using the Hackathon formula: affected citizens × severity weight × total outage duration.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Suggested Actions */}
                                {clusterExplanation?.suggested_actions?.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-slate-200 mb-2 px-1 text-sm">🎯 Suggested Actions</h4>
                                        <div className="space-y-2">
                                            {clusterExplanation.suggested_actions.map((action: any, i: number) => (
                                                <div key={i} className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                                    <p className="text-sm text-indigo-100/90 leading-relaxed mb-2">{action.description}</p>
                                                    {action.suggested_crews && (
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            {action.suggested_crews.map((crew: any) => (
                                                                <button
                                                                    key={crew.id}
                                                                    onClick={() => {
                                                                        setSelectedCrewId(crew.id);
                                                                        setShowCrewSelect(true);
                                                                    }}
                                                                    className="text-xs px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-md border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors font-medium"
                                                                >
                                                                    {crew.name} ({crew.specialty})
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    }
                </div >

                {/* Actions Footer */}
                <div className="border-t border-slate-700/60 p-4 bg-slate-900/80 backdrop-blur-md">
                    {
                        showCrewSelect ? (
                            <div className="space-y-3">
                                <select
                                    value={selectedCrewId || ''}
                                    onChange={(e) => setSelectedCrewId(parseInt(e.target.value))}
                                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-primary/50 outline-none cursor-pointer shadow-inner"
                                    style={{ colorScheme: 'dark', backgroundColor: '#0f172a' }} // Absolute dark force
                                >
                                    <option value="" style={{ backgroundColor: '#0f172a', color: '#cbd5e1' }}>Select a crew...</option>
                                    {crews.map((crew) => (
                                        <option key={crew.id} value={crew.id} style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>
                                            {crew.name} - {crew.specialty} ({crew.current_status})
                                        </option>
                                    ))}
                                </select>
                                <div className="flex gap-2">
                                    <button
                                        onClick={assignCrewToCluster}
                                        disabled={!selectedCrewId || loading}
                                        className="btn btn-primary flex-1 shadow-lg shadow-primary/20"
                                    >
                                        {loading ? 'Assigning...' : '✓ Confirm Assignment'}
                                    </button>
                                    <button
                                        onClick={() => setShowCrewSelect(false)}
                                        className="btn btn-ghost text-slate-400 hover:text-white border border-slate-700 hover:bg-slate-800"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowCrewSelect(true)}
                                        className="btn btn-primary flex-1 shadow-lg shadow-primary/20"
                                    >
                                        🚀 Assign Crew
                                    </button>
                                    <button
                                        onClick={() => onMarkResolved(cluster.cluster_id)}
                                        className="btn btn-ghost border border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800 flex-1 hover:text-white transition-all"
                                    >
                                        ✓ Resolved
                                    </button>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={() => setActiveTab('chat')}
                                        className="btn btn-ghost flex-1 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                                    >
                                        💬 Message
                                    </button>
                                    <button
                                        onClick={() => onExportCSV(cluster.cluster_id)}
                                        className="btn btn-ghost flex-1 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                                    >
                                        📄 Export
                                    </button>
                                </div>
                            </>
                        )}
                </div>
            </div >
        </>
    );
}
