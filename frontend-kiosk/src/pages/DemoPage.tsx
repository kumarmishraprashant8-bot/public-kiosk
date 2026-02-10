import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

// Import embedded components
import LiveStatsBar from '../components/LiveStatsBar';
import FeaturedResolutions from '../components/FeaturedResolutions';
import PsychicBanner from '../components/PsychicBanner';
import AIAlertsPanel from '../components/AIAlertsPanel';
import DemandForecast from '../components/DemandForecast';

import { Language } from '../types';

type Tab = 'citizen' | 'admin' | 'stats' | 'crew';

export default function DemoPage() {
    const [activeTab, setActiveTab] = useState<Tab>('citizen');
    const [lang, setLang] = useState<Language>('en');
    const navigate = useNavigate();

    // Check for emergency mode
    useState(() => {
        api.get('/emergency/status').then(res => {
            if (res.data.active) {
                navigate('/emergency');
            }
        }).catch(console.error);
    });

    const tabs = [
        { id: 'citizen' as Tab, label: '🏛️ Citizen', desc: 'Report Issue' },
        { id: 'admin' as Tab, label: '💻 Admin', desc: 'Dashboard' },
        { id: 'stats' as Tab, label: '📊 Stats', desc: 'Public Data' },
        { id: 'crew' as Tab, label: '🚀 Crew', desc: 'Field Ops' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
            {/* Header */}
            <header className="bg-black/30 backdrop-blur-lg border-b border-white/10 p-4 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                            <span className="text-xl">🏛️</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">CivicPulse Demo</h1>
                            <p className="text-xs text-white/50">Smart Urban Helpdesk</p>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-purple-500 text-white'
                                    : 'text-white/60 hover:bg-white/10'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-6xl mx-auto p-4">

                {/* CITIZEN TAB */}
                {activeTab === 'citizen' && (
                    <div className="space-y-6 animate-slide-up">
                        <div className="text-center py-8">
                            <h2 className="text-4xl font-bold text-white mb-3">Hello, Citizen. <span className="text-purple-400">What can we fix?</span></h2>
                            <p className="text-white/60 text-lg">Choose how you want to report</p>
                        </div>

                        {/* Language Selector */}
                        <div className="flex justify-center gap-4">
                            {[
                                { code: 'en', label: 'English', flag: '🇬🇧' },
                                { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
                                { code: 'ta', label: 'Tamil', flag: '🇮🇳' }
                            ].map((l) => (
                                <button
                                    key={l.code}
                                    onClick={() => setLang(l.code as Language)}
                                    className={`px-4 py-2 rounded-full border transition-all ${lang === l.code
                                        ? 'bg-white text-purple-900 border-white font-bold transform scale-105'
                                        : 'bg-transparent text-white/70 border-white/30 hover:bg-white/10'
                                        }`}
                                >
                                    <span className="mr-2">{l.flag}</span>
                                    {l.label}
                                </button>
                            ))}
                        </div>

                        <LiveStatsBar />
                        <PsychicBanner />
                        <FeaturedResolutions />

                        {/* Quick Actions */}
                        {/* Quick Actions Hero Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                            {/* Photo Action */}
                            <button
                                onClick={() => navigate('/submit', { state: { lang, mode: 'photo' } })}
                                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-400/30 p-8 hover:border-blue-400 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300 transform hover:-translate-y-1"
                            >
                                <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative z-10 flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <span className="text-5xl">📸</span>
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-2xl font-bold text-white mb-1">Snap & Report</h3>
                                        <p className="text-blue-200 text-sm">Quick photo issue</p>
                                    </div>
                                </div>
                            </button>

                            {/* Voice Action - Featured Center */}
                            <button
                                onClick={() => navigate('/submit', { state: { lang, mode: 'voice' } })}
                                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-600/30 border-2 border-purple-400/50 p-8 hover:border-purple-400 hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] transition-all duration-300 transform hover:-translate-y-2 scale-105"
                            >
                                <div className="absolute inset-0 bg-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative z-10 flex flex-col items-center gap-4">
                                    <div className="w-24 h-24 rounded-full bg-purple-500/30 flex items-center justify-center animate-pulse-slow group-hover:scale-110 transition-transform">
                                        <span className="text-6xl">🎤</span>
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-3xl font-bold text-white mb-1">Speak & Solve</h3>
                                        <p className="text-purple-200 text-sm">Just say what's wrong</p>
                                    </div>
                                </div>
                            </button>

                            {/* Type Action */}
                            <button
                                onClick={() => navigate('/phone', { state: { lang, mode: 'type' } })}
                                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 border border-indigo-400/30 p-8 hover:border-indigo-400 hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all duration-300 transform hover:-translate-y-1"
                            >
                                <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative z-10 flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <span className="text-5xl">✍️</span>
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-2xl font-bold text-white mb-1">Describe Detail</h3>
                                        <p className="text-indigo-200 text-sm">Type in details</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* ADMIN TAB */}
                {activeTab === 'admin' && (
                    <div className="space-y-6 animate-slide-up">
                        <div className="text-center py-4">
                            <h2 className="text-3xl font-bold text-white mb-2">Admin Command Center</h2>
                            <p className="text-white/60">AI-powered operations dashboard</p>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="glass-card p-4 text-center">
                                <div className="text-3xl font-bold text-yellow-400">247</div>
                                <div className="text-white/50 text-sm">Total Reports</div>
                            </div>
                            <div className="glass-card p-4 text-center">
                                <div className="text-3xl font-bold text-green-400">89%</div>
                                <div className="text-white/50 text-sm">Resolved</div>
                            </div>
                            <div className="glass-card p-4 text-center">
                                <div className="text-3xl font-bold text-blue-400">4.2h</div>
                                <div className="text-white/50 text-sm">Avg Time</div>
                            </div>
                            <div className="glass-card p-4 text-center">
                                <div className="text-3xl font-bold text-purple-400">12</div>
                                <div className="text-white/50 text-sm">Active Crews</div>
                            </div>
                        </div>

                        {/* Cluster Map Placeholder */}
                        <div className="glass-card p-6">
                            <h3 className="font-bold text-white mb-4">🗺️ Real-time Cluster Map</h3>
                            <div className="h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
                                <div className="text-center">
                                    <span className="text-6xl block mb-3">📍</span>
                                    <p className="text-white/60">Interactive heatmap showing issue clusters</p>
                                    <button
                                        onClick={() => navigate('/admin')}
                                        className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors shadow-lg animate-pulse"
                                    >
                                        Open Full Dashboard
                                    </button>
                                </div>
                            </div>
                        </div>

                        <AIAlertsPanel />
                        <DemandForecast />
                    </div>
                )}

                {/* STATS TAB */}
                {activeTab === 'stats' && (
                    <div className="space-y-6 animate-slide-up">
                        <div className="text-center py-4">
                            <h2 className="text-3xl font-bold text-white mb-2">📊 Public Transparency</h2>
                            <p className="text-white/60">Open data for citizens</p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="glass-card p-6">
                                <h3 className="text-lg font-bold text-white mb-4">City-Wide Impact</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/70">🏘️ Wards Served</span>
                                        <span className="text-2xl font-bold text-white">8</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/70">👥 Active Citizens</span>
                                        <span className="text-2xl font-bold text-green-400">1,247</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/70">💰 Tax ₹ Saved</span>
                                        <span className="text-2xl font-bold text-yellow-400">₹4.2L</span>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card p-6">
                                <h3 className="text-lg font-bold text-white mb-4">🏆 Top Citizens</h3>
                                <div className="space-y-3">
                                    {[
                                        { name: 'Priya S.', points: 420, badge: '🥇' },
                                        { name: 'Raj K.', points: 385, badge: '🥈' },
                                        { name: 'Anita M.', points: 310, badge: '🥉' },
                                    ].map((user, i) => (
                                        <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{user.badge}</span>
                                                <span className="text-white">{user.name}</span>
                                            </div>
                                            <span className="text-yellow-400 font-bold">{user.points} pts</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Download Options */}
                        <div className="glass-card p-6">
                            <h3 className="font-bold text-white mb-4">📥 Open Data Access (RTI Compliant)</h3>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => window.open('http://localhost:8000/transparency/export/csv', '_blank')}
                                    className="flex-1 py-3 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                                >
                                    📊 Download CSV
                                </button>
                                <button
                                    onClick={() => window.open('http://localhost:8000/docs', '_blank')}
                                    className="flex-1 py-3 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                                >
                                    📄 API Docs
                                </button>
                                <button
                                    onClick={() => navigate('/verify')}
                                    className="flex-1 py-3 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 font-medium"
                                >
                                    🛡️ Verify Receipt
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* CREW TAB */}
                {activeTab === 'crew' && (
                    <div className="space-y-6 animate-slide-up">
                        <div className="text-center py-4">
                            <h2 className="text-3xl font-bold text-white mb-2">🚀 Crew Dashboard</h2>
                            <p className="text-white/60">Mobile-first field operations</p>
                        </div>

                        {/* Crew Status */}
                        <div className="glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white">Today's Assignments</h3>
                                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                                    🟢 On Duty
                                </span>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { id: 'CL-001', type: 'Water Leak', ward: 'Koramangala, Bangalore', priority: 'urgent', eta: '15 min' },
                                    { id: 'CL-002', type: 'Pothole', ward: 'Indiranagar, Bangalore', priority: 'high', eta: '45 min' },
                                    { id: 'CL-003', type: 'Garbage', ward: 'HSR Layout, Bangalore', priority: 'normal', eta: '2 hrs' },
                                ].map(task => (
                                    <div key={task.id} className="bg-white/5 p-4 rounded-xl flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${task.priority === 'urgent' ? 'bg-red-500' :
                                                    task.priority === 'high' ? 'bg-yellow-500' : 'bg-green-500'
                                                    }`}></span>
                                                <span className="font-medium text-white">{task.type}</span>
                                            </div>
                                            <span className="text-white/50 text-sm">📍 {task.ward}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-white/70 text-sm">{task.eta}</div>
                                            <button
                                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.ward)}`, '_blank')}
                                                className="mt-1 px-3 py-1 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors"
                                            >
                                                Navigate
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => {
                                    const btn = document.getElementById('gps-btn');
                                    if (btn) btn.innerHTML = '<span class="text-4xl animate-pulse">🛰️</span><span class="text-white">Locating...</span>';
                                    setTimeout(() => {
                                        if (btn) btn.innerHTML = '<span class="text-4xl">📍</span><span class="text-white">GPS Check-in</span>';
                                        alert("✅ GPS Verified!\nLocation: 12.9716° N, 77.5946° E\nAccuracy: 5m");
                                    }, 1500);
                                }}
                                id="gps-btn"
                                className="glass-card p-6 flex flex-col items-center gap-3 hover:bg-white/5 transition-colors"
                            >
                                <span className="text-4xl">📍</span>
                                <span className="text-white">GPS Check-in</span>
                            </button>
                            <button
                                onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = () => {
                                        alert("📸 Photo Uploaded Successfully!\nAI Analysis: Water Leak Detected (Confidence: 98%)");
                                    };
                                    input.click();
                                }}
                                className="glass-card p-6 flex flex-col items-center gap-3 hover:bg-white/5 transition-colors"
                            >
                                <span className="text-4xl">📸</span>
                                <span className="text-white">Upload Photo</span>
                            </button>
                        </div>

                        <button
                            onClick={() => navigate('/crew')}
                            className="btn-primary w-full py-4"
                        >
                            Open Full Crew App
                        </button>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="mt-10 py-6 text-center border-t border-white/10">
                <p className="text-white/40 text-sm">
                    Made by Prashant Mishra
                </p>
            </footer>
        </div>
    );
}
