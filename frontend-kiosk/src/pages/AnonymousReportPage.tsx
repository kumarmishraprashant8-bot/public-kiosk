import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const SENSITIVE_CATEGORIES = [
    { id: 'corruption', name: 'Corruption / Bribery', icon: '💰', description: 'Report demands for bribes or corrupt practices' },
    { id: 'fraud', name: 'Fund Misuse', icon: '📊', description: 'Report misuse of public funds' },
    { id: 'harassment', name: 'Official Harassment', icon: '⚠️', description: 'Report harassment by officials' },
    { id: 'safety', name: 'Safety Concern', icon: '🚨', description: 'Report dangerous conditions' },
    { id: 'pollution', name: 'Environmental Violation', icon: '🏭', description: 'Report illegal dumping' },
];

export default function AnonymousReportPage() {
    const [step, setStep] = useState<'info' | 'category' | 'details' | 'done'>('info');
    const [category, setCategory] = useState<string>('');
    const [text, setText] = useState('');
    const [ward, setWard] = useState('');
    const [loading, setLoading] = useState(false);
    const [trackingCode, setTrackingCode] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async () => {
        if (!text.trim() || !category) return;

        setLoading(true);
        try {
            const res = await api.post('/anonymous/report', {
                intent: category,
                text,
                ward: ward || null,
            });
            setTrackingCode(res.data.tracking_code);
            setStep('done');
        } catch (err) {
            console.error('Anonymous submit failed', err);
            alert('Submission failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Info screen
    if (step === 'info') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="max-w-lg glass-card p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <span className="text-4xl">🔒</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-4">Anonymous Reporting</h1>
                    <p className="text-white/70 mb-6">
                        Report sensitive issues without revealing your identity.
                        No phone number, name, or personal data will be stored.
                    </p>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 text-left">
                        <h3 className="font-bold text-yellow-400 mb-2">⚠️ Important</h3>
                        <ul className="text-white/70 text-sm space-y-2">
                            <li>• You'll receive a one-time tracking code</li>
                            <li>• Save it carefully - it cannot be recovered</li>
                            <li>• We cannot contact you for follow-up</li>
                            <li>• Consider regular reporting for faster resolution</li>
                        </ul>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => setStep('category')}
                            className="btn-primary w-full py-4"
                        >
                            🔒 Continue Anonymously
                        </button>
                        <button
                            onClick={() => navigate('/submit')}
                            className="text-white/50 hover:text-white/70 text-sm"
                        >
                            Use regular reporting instead →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Category selection
    if (step === 'category') {
        return (
            <div className="min-h-screen p-6">
                <button onClick={() => setStep('info')} className="text-white/60 mb-6">
                    ← Back
                </button>
                <h1 className="text-2xl font-bold text-white mb-6">Select Category</h1>

                <div className="grid gap-4">
                    {SENSITIVE_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => { setCategory(cat.id); setStep('details'); }}
                            className="glass-card p-5 text-left flex items-center gap-4 hover:border-purple-500/50 transition-all"
                        >
                            <span className="text-3xl">{cat.icon}</span>
                            <div>
                                <h3 className="font-bold text-white">{cat.name}</h3>
                                <p className="text-white/50 text-sm">{cat.description}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Details form
    if (step === 'details') {
        const selectedCat = SENSITIVE_CATEGORIES.find(c => c.id === category);

        return (
            <div className="min-h-screen p-6">
                <button onClick={() => setStep('category')} className="text-white/60 mb-6">
                    ← Back
                </button>

                <div className="mb-6">
                    <span className="text-3xl">{selectedCat?.icon}</span>
                    <h1 className="text-2xl font-bold text-white mt-2">{selectedCat?.name}</h1>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-white/70 text-sm block mb-2">Describe the issue *</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Provide as much detail as possible..."
                            className="w-full h-40 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:border-purple-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-white/70 text-sm block mb-2">Ward / Area (optional)</label>
                        <input
                            type="text"
                            value={ward}
                            onChange={(e) => setWard(e.target.value)}
                            placeholder="e.g., Koramangala, Ward 23"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:border-purple-500 outline-none"
                        />
                    </div>

                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                        <p className="text-white/70 text-sm">
                            🔒 Your report will be completely anonymous. No personal data is collected or stored.
                        </p>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!text.trim() || loading}
                        className="btn-primary w-full py-5 disabled:opacity-50"
                    >
                        {loading ? 'Submitting...' : '🔒 Submit Anonymously'}
                    </button>
                </div>
            </div>
        );
    }

    // Success screen
    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="max-w-lg glass-card p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
                    <span className="text-4xl">✅</span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">Report Submitted</h1>
                <p className="text-white/70 mb-6">
                    Your anonymous report has been filed successfully.
                </p>

                <div className="bg-yellow-500/20 border-2 border-yellow-500 rounded-xl p-6 mb-6">
                    <p className="text-yellow-400 text-sm mb-2">Save your tracking code:</p>
                    <p className="text-3xl font-mono font-bold text-white">{trackingCode}</p>
                    <p className="text-yellow-400/70 text-xs mt-2">
                        ⚠️ This is the ONLY way to track your report
                    </p>
                </div>

                <button
                    onClick={() => navigator.clipboard?.writeText(trackingCode)}
                    className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-lg text-white mb-4 w-full"
                >
                    📋 Copy Code
                </button>

                <button
                    onClick={() => navigate('/')}
                    className="text-white/50 hover:text-white/70"
                >
                    Return Home
                </button>
            </div>
        </div>
    );
}
