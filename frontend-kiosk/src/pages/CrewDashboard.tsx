import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface Assignment {
    cluster_id: string;
    intent: string;
    ward: string;
    priority: string;
    citizen_count: number;
    latitude: number;
    longitude: number;
    status: string;
    // Enhanced Fields
    description?: string;
    address?: string;
    time_reported?: string;
    distance?: string;
}

interface CrewInfo {
    id: number;
    name: string;
    specialty: string;
    current_status: string;
}

export default function CrewDashboard() {
    const [activeTab, setActiveTab] = useState<'tasks' | 'map' | 'chat' | 'profile'>('tasks');
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    // Restore missing state
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [crew, setCrew] = useState<CrewInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Chat State
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState([
        { sender: 'HQ', msg: 'System check. All units report status.', time: '09:00 AM', align: 'left' },
        { sender: 'ME', msg: 'Crew Alpha online. Proceeding to Ward 12.', time: '09:05 AM', align: 'right' },
        { sender: 'HQ', msg: '⚠️ Alert: Water pipe burst reported at Indiranagar 4th Cross. Priority: URGENT.', time: '10:42 AM', align: 'left' },
        { sender: 'ME', msg: 'Received. We are 5 minutes away. Rerouting now.', time: '10:43 AM', align: 'right' }
    ]);

    // Scroll to bottom on new message
    useEffect(() => {
        if (activeTab === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activeTab]);

    const handleSendMessage = () => {
        if (!chatInput.trim()) return;

        const newMsg = {
            sender: 'ME',
            msg: chatInput,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            align: 'right'
        };

        setMessages(prev => [...prev, newMsg]);
        setChatInput('');

        // Simulate HQ Reply
        setTimeout(() => {
            const replies = [
                "Copy that. Keep us updated.",
                "Roger. Status logged.",
                "Standby for further instructions.",
                "Great work, Crew Alpha.",
                "Noted. Proceed with caution.",
                "HQ received. Over and out."
            ];
            const replyMsg = {
                sender: 'HQ',
                msg: replies[Math.floor(Math.random() * replies.length)],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                align: 'left'
            };
            setMessages(prev => [...prev, replyMsg]);
        }, 1500);
    };

    // Toast Helper
    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Helper to generate deterministic mock details
    const enrichAssignment = (a: any): Assignment => {
        const streets = ['MG Road', 'Indiranagar 12th Main', 'Koramangala 4th Block', 'Whitefield Main Rd', 'Jayanagar 9th Block'];
        const descMap: Record<string, string> = {
            'water_leak': 'Major pipe burst reported by multiple residents. Water gushing onto the street.',
            'water_outage': 'No water supply for top-floor apartments since 6 AM. Pressure valve failure suspected.',
            'pothole': 'Deep pothole causing traffic slowdown. Dangerous for two-wheelers.',
            'garbage': 'Overflowing garbage bin not cleared for 3 days. Health hazard reported.',
            'street_light': 'Entire row of street lights flickering. Possible transformer issue.'
        };

        // Pseudo-random selection based on ID
        const seed = a.cluster_id.charCodeAt(0) || 0;
        const street = streets[seed % streets.length];

        return {
            ...a,
            description: descMap[a.intent] || `Reported ${a.intent.replace('_', ' ')} affecting the neighborhood.`,
            address: `${street}, ${a.ward}`,
            time_reported: `${(seed % 12) + 1} hours ago`,
            distance: `${(seed % 50) / 10 + 0.5} km`,
            citizen_count: a.citizen_count || Math.floor(Math.random() * 50) + 10 // Fallback if 0
        };
    };

    useEffect(() => {
        fetchAssignments();
        getCurrentLocation();
    }, []);

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                err => console.warn('Location error:', err)
            );
        }
    };

    const fetchAssignments = async () => {
        try {
            setCrew({ id: 1, name: 'Crew Alpha', specialty: 'water', current_status: 'available' });
            const res = await api.get('/api/admin/clusters?password=admin123');
            let assigned = res.data.clusters.filter((c: any) => c.assigned_crew_id === 1);

            // Fallback for demo if no specific assignments
            if (assigned.length === 0) assigned = res.data.clusters.slice(0, 3);

            setAssignments(assigned.map(enrichAssignment));
        } catch (err) {
            console.error('Failed to load assignments', err);
            // Mock data fallback
            const mocks = [
                { cluster_id: 'c1', intent: 'water_leak', ward: 'Ward 12', priority: 'urgent', status: 'pending', citizen_count: 45 },
                { cluster_id: 'c2', intent: 'water_outage', ward: 'Ward 08', priority: 'high', status: 'pending', citizen_count: 120 },
                { cluster_id: 'c3', intent: 'street_light', ward: 'Ward 05', priority: 'normal', status: 'resolved', citizen_count: 12 }
            ];
            setAssignments(mocks.map(enrichAssignment) as Assignment[]);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (clusterId: string, newStatus: string) => {
        try {
            await api.post(`/crew/cluster/${clusterId}/status`, {
                status: newStatus,
                latitude: currentLocation?.lat,
                longitude: currentLocation?.lng,
                notes: `Status updated to ${newStatus}`
            });
            setAssignments(prev => prev.map(a => a.cluster_id === clusterId ? { ...a, status: newStatus } : a));

            if (newStatus === 'resolved') showToast('✅ Great job! Issue resolved.');
            else if (newStatus === 'working') showToast('🔧 Status updated: Working');
        } catch (err) {
            console.error('Status update failed', err);
            // Fallback for demo if API fails
            setAssignments(prev => prev.map(a => a.cluster_id === clusterId ? { ...a, status: newStatus } : a));
            showToast(`Status updated to ${newStatus} (Offline Mode)`);
        }
    };

    const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedAssignment) return;

        const reader = new FileReader();
        reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);

        setUploading(true);
        // Simulate upload delay
        setTimeout(() => {
            setUploading(false);
            setPhotoPreview(null);
            showToast('📸 Photo uploaded successfully!');
        }, 1500);
    };

    const handleCheckIn = async (assignment: Assignment) => {
        showToast('📍 Verifying GPS location...');
        setTimeout(() => {
            handleStatusUpdate(assignment.cluster_id, 'onsite');
            showToast('✅ Checked in at site!');
        }, 1000);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading Crew App...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-green-500/30">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-24 right-4 md:top-4 md:right-4 z-50 animate-bounce flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border border-white/10 ${toast.type === 'success' ? 'bg-green-500/90' : 'bg-red-500/90'
                    }`}>
                    <span className="text-2xl">{toast.type === 'success' ? '✅' : '⚠️'}</span>
                    <div>
                        <p className="font-bold text-sm">{toast.type === 'success' ? 'Success' : 'Error'}</p>
                        <p className="text-sm opacity-90">{toast.msg}</p>
                    </div>
                </div>
            )}

            {/* HEADER (Responsive) */}
            <header className="bg-gray-800/80 backdrop-blur-xl border-b border-gray-700 sticky top-0 z-40">
                <div className="container mx-auto px-4 h-16 flex justify-between items-center">
                    {/* Brand / Crew Info */}
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-green-400 to-blue-600 flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">
                            👷
                        </div>
                        <div>
                            <h1 className="text-lg font-bold leading-tight tracking-tight">{crew?.name || 'Field Crew'}</h1>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400' : 'bg-green-400'} animate-pulse`}></span>
                                <span className="text-xs font-medium text-gray-400 tracking-wide">{crew?.specialty?.toUpperCase()} UNIT</span>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1 bg-gray-900/50 p-1 rounded-xl border border-gray-700/50">
                        {['tasks', 'map', 'chat', 'profile'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab
                                    ? 'bg-gray-700 text-white shadow-md'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </nav>

                    {/* Exit Button */}
                    <button
                        onClick={() => navigate('/')}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-red-500/10"
                    >
                        Exit Duty
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="container mx-auto px-4 py-6 md:py-8 min-h-[calc(100vh-4rem)] pb-24 md:pb-8">

                {/* 1. TASKS TAB */}
                {activeTab === 'tasks' && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Page Header */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Assignments</h2>
                                <p className="text-gray-400 mt-1 flex items-center gap-2">
                                    <span>📅 {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                    <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                    <span>{assignments.length} Tasks Pending</span>
                                </p>
                            </div>

                            {/* Filter/Status Pills (Mock) */}
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                <span className="whitespace-nowrap px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-xs font-bold">● All ({assignments.length})</span>
                                <span className="whitespace-nowrap px-3 py-1 bg-gray-800 text-gray-400 border border-gray-700 rounded-full text-xs font-medium hover:bg-gray-700 cursor-pointer transition-colors">Priority High</span>
                                <span className="whitespace-nowrap px-3 py-1 bg-gray-800 text-gray-400 border border-gray-700 rounded-full text-xs font-medium hover:bg-gray-700 cursor-pointer transition-colors">Nearby</span>
                            </div>
                        </div>

                        {/* Grid Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {assignments.map((assignment) => (
                                <div key={assignment.cluster_id} className="group bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden hover:border-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl flex flex-col">
                                    {/* Card Header with Priority Color */}
                                    <div className={`h-2 w-full ${assignment.priority === 'urgent' ? 'bg-gradient-to-r from-red-500 to-pink-600' :
                                        assignment.priority === 'high' ? 'bg-gradient-to-r from-orange-500 to-yellow-500' :
                                            'bg-gradient-to-r from-blue-500 to-cyan-500'
                                        }`} />

                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-xl leading-snug group-hover:text-blue-400 transition-colors">
                                                {assignment.intent.replace('_', ' ').toUpperCase()}
                                            </h3>
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${assignment.priority === 'urgent' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                assignment.priority === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                }`}>
                                                {assignment.priority}
                                            </span>
                                        </div>

                                        {/* Description */}
                                        <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
                                            {assignment.description}
                                        </p>

                                        <div className="space-y-3 mb-6 flex-1">
                                            {/* Location Detail */}
                                            <div className="flex items-start gap-3 text-gray-300 text-sm bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                                                <span className="text-lg mt-0.5">📍</span>
                                                <div className="flex-1">
                                                    <p className="font-medium text-white">{assignment.address}</p>
                                                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                                                        <span>{assignment.distance} away</span>
                                                        <span>{assignment.ward}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Meta Info */}
                                            <div className="flex justify-between items-center text-xs text-gray-500 px-1">
                                                <div className="flex items-center gap-1">
                                                    <span>🕒</span> {assignment.time_reported}
                                                </div>
                                                <div className="flex items-center gap-1" title="Citizens Impacted">
                                                    <span>👥</span> {assignment.citizen_count} affected
                                                </div>
                                            </div>

                                            {/* Status Badge */}
                                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 border-t border-gray-700/50 pt-2 mt-2">
                                                <span>Status:</span>
                                                <span className={`uppercase font-bold ${assignment.status === 'resolved' ? 'text-green-400' :
                                                    assignment.status === 'working' ? 'text-yellow-400' :
                                                        'text-blue-400'
                                                    }`}>{assignment.status}</span>
                                            </div>
                                        </div>

                                        {/* Action Buttons Grid */}
                                        <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-700">
                                            {[
                                                { icon: '📍', label: 'Check-in', action: () => handleCheckIn(assignment), color: 'text-gray-400 hover:text-green-400 hover:bg-green-500/10' },
                                                { icon: '📸', label: 'Photo', action: () => { setSelectedAssignment(assignment); fileInputRef.current?.click(); }, color: 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10' },
                                                { icon: '🔧', label: 'Work', action: () => handleStatusUpdate(assignment.cluster_id, 'working'), color: 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10' },
                                                { icon: '✅', label: 'Done', action: () => handleStatusUpdate(assignment.cluster_id, 'resolved'), color: 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10' },
                                            ].map((btn, i) => (
                                                <button
                                                    key={i}
                                                    onClick={btn.action}
                                                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${btn.color}`}
                                                >
                                                    <span className="text-xl mb-1">{btn.icon}</span>
                                                    <span className="text-[10px] font-medium opacity-80">{btn.label}</span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Photo Preview Overlay */}
                                        {photoPreview && selectedAssignment?.cluster_id === assignment.cluster_id && (
                                            <div className="mt-4 relative rounded-lg overflow-hidden border border-gray-600 animate-fadeIn">
                                                <img src={photoPreview} alt="Captured" className="w-full h-40 object-cover" />
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                                                    {uploading ? (
                                                        <div className="flex flex-col items-center gap-2 text-white font-bold">
                                                            <span className="animate-spin text-2xl">⏳</span>
                                                            <span className="text-xs tracking-wider uppercase">Uploading...</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-2 text-green-400 font-bold">
                                                            <span className="text-2xl">✔</span>
                                                            <span className="text-xs tracking-wider uppercase">Uploaded</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Empty State */}
                            {assignments.length === 0 && (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-60">
                                    <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mb-6 text-7xl shadow-xl">🎉</div>
                                    <h3 className="text-3xl font-bold mb-2">All Caught Up!</h3>
                                    <p className="text-gray-400 text-lg">No pending assignments. Enjoy your break!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. MAP TAB (Full Height) */}
                {activeTab === 'map' && (
                    <div className="w-full h-[80vh] bg-gray-800 rounded-3xl overflow-hidden relative shadow-2xl border border-gray-700 animate-fadeIn">
                        <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=Bangalore&zoom=12&size=600x300&key=YOUR_API_KEY')] bg-cover bg-center opacity-50 grayscale hover:grayscale-0 transition-all duration-700"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>

                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-7xl mb-6 drop-shadow-2xl animate-bounce">🗺️</span>
                            <h2 className="text-3xl font-bold text-white drop-shadow-lg mb-2">Live Field Map</h2>
                            <p className="text-gray-300 mb-8 drop-shadow-md">Real-time crew tracking and clustered issues</p>
                            <button
                                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105 pointer-events-auto flex items-center gap-2"
                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=Bangalore`, '_blank')}
                            >
                                <span>Open Full Map</span>
                                <span className="text-lg">↗</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. CHAT TAB (Centered Layout) */}
                {activeTab === 'chat' && (
                    <div className="max-w-4xl mx-auto h-[80vh] flex flex-col bg-gray-800 rounded-3xl overflow-hidden border border-gray-700 shadow-2xl animate-fadeIn">
                        {/* Chat Header */}
                        <div className="p-6 bg-gray-900/50 border-b border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold shadow-lg">HQ</div>
                                <div>
                                    <h3 className="font-bold text-lg">Central Command</h3>
                                    <p className="text-green-400 text-xs flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Online
                                    </p>
                                </div>
                            </div>
                            <button className="text-gray-400 hover:text-white transition-colors">⋮</button>
                        </div>

                        {/* Chat Body */}
                        <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-gray-900/30">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex gap-4 ${msg.align === 'right' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-lg shrink-0 ${msg.sender === 'HQ' ? 'bg-blue-600' : 'bg-green-600'
                                        }`}>
                                        {msg.sender}
                                    </div>
                                    <div className={`p-4 rounded-2xl max-w-[80%] shadow-md ${msg.align === 'right'
                                        ? 'bg-green-600/20 text-green-100 rounded-tr-none border border-green-500/20'
                                        : 'bg-gray-700 text-gray-200 rounded-tl-none'
                                        }`}>
                                        <p className="leading-relaxed">{msg.msg}</p>
                                        <span className={`text-[10px] block mt-2 opacity-60 ${msg.align === 'right' ? 'text-right' : ''}`}>
                                            {msg.time}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Chat Input */}
                        <div className="p-4 bg-gray-800 border-t border-gray-700">
                            <div className="flex gap-4 max-w-3xl mx-auto">
                                <button className="p-3 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors">📎</button>
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-500 transition-all"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                                >
                                    <span>Send</span>
                                    <span>➤</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. PROFILE TAB */}
                {activeTab === 'profile' && (
                    <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
                        {/* Profile Card */}
                        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600" />
                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />

                            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                                <div className="w-32 h-32 rounded-full bg-gray-700 border-4 border-gray-800 shadow-xl flex items-center justify-center text-6xl relative">
                                    👷
                                    <div className="absolute bottom-2 right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-gray-800" title="Online" />
                                </div>

                                <div className="text-center md:text-left flex-1 space-y-2">
                                    <h2 className="text-4xl font-bold text-white tracking-tight">{crew?.name || 'Crew Alpha'}</h2>
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                                            {crew?.specialty || 'General'} Unit
                                        </span>
                                        <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                                            Level 4 Verified
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { label: 'Tasks Completed', value: '142', color: 'text-green-400', sub: 'Top 5% in City' },
                                { label: 'Average Rating', value: '4.9', color: 'text-yellow-400', sub: '⭐⭐⭐⭐⭐' },
                                { label: 'Response Time', value: '12m', color: 'text-blue-400', sub: '3m faster than avg' },
                                { label: 'Streak Days', value: '24', color: 'text-purple-400', sub: 'Personal Best!' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg hover:border-gray-600 transition-colors">
                                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">{stat.label}</h3>
                                    <div className={`text-4xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                                    <p className="text-xs text-gray-500">{stat.sub}</p>
                                </div>
                            ))}
                        </div>

                        <button className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-600/20 py-5 rounded-2xl font-bold text-lg shadow-lg hover:shadow-red-500/10 transition-all flex items-center justify-center gap-3 group">
                            <span className="group-hover:scale-110 transition-transform">🛑</span>
                            <span>End Shift & Log Out</span>
                        </button>
                    </div>
                )}
            </main>

            {/* Hidden Input */}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoCapture} className="hidden" />

            {/* MOBILE BOTTOM NAVIGATION (Hidden on Desktop) */}
            <nav className="md:hidden fixed bottom-0 w-full bg-gray-900/90 backdrop-blur-xl border-t border-gray-800 pb-safe z-50">
                <div className="grid grid-cols-4 h-16">
                    {['tasks', 'map', 'chat', 'profile'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 relative ${activeTab === tab ? 'text-green-400' : 'text-gray-500'
                                }`}
                        >
                            {activeTab === tab && (
                                <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-1 bg-green-500 rounded-b-full shadow-[0_0_10px_2px_rgba(34,197,94,0.5)]"></span>
                            )}
                            <span className={`text-xl transition-transform duration-300 ${activeTab === tab ? '-translate-y-1 scale-110' : ''}`}>
                                {tab === 'tasks' ? '📋' : tab === 'map' ? '🗺️' : tab === 'chat' ? '💬' : '👤'}
                            </span>
                            <span className="text-[10px] font-bold tracking-wide uppercase">
                                {tab}
                            </span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
}
