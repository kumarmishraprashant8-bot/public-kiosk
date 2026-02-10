import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../utils/api';

interface SimulationPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SimulationPanel({ isOpen, onClose }: SimulationPanelProps) {
    const [activeTab, setActiveTab] = useState<'sms'>('sms');

    // SMS State
    const [phoneNumber, setPhoneNumber] = useState('+919876543210');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [result, setResult] = useState<{ success: boolean; msg: string } | null>(null);

    const handleSendSMS = async () => {
        if (!message.trim()) return;

        setIsSending(true);
        setResult(null);

        try {
            await api.post('/api/integrations/simulate-sms', {
                sender: phoneNumber,
                message: message
            });

            setResult({ success: true, msg: 'SMS Simulation Processed Successfully' });
            setMessage(''); // Clear message on success

            // Auto-clear success message after 3s
            setTimeout(() => setResult(null), 3000);

        } catch (err) {
            console.error('Simulation error:', err);
            setResult({ success: false, msg: 'Failed to simulate SMS.' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[1200] bg-slate-900/60 backdrop-blur-sm"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 z-[1300] h-full w-full max-w-md border-l border-slate-700 bg-slate-800 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-700 p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                                    <Smartphone className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Simulation Lab</h2>
                                    <p className="text-xs text-slate-400">Test non-app integrations</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {/* Tabs */}
                            <div className="mb-6 flex rounded-lg bg-slate-900/50 p-1">
                                <button
                                    onClick={() => setActiveTab('sms')}
                                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'sms'
                                        ? 'bg-indigo-600 text-white shadow-lg'
                                        : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                >
                                    SMS / IVRS
                                </button>
                                <button
                                    disabled
                                    className="flex-1 cursor-not-allowed rounded-md px-4 py-2 text-sm font-medium text-slate-600"
                                >
                                    IoT Sensors (Soon)
                                </button>
                            </div>

                            {/* SMS Simulator */}
                            {activeTab === 'sms' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-400">
                                            Simulated Sender (Phone)
                                        </label>
                                        <input
                                            type="text"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-400">
                                            Message Content
                                        </label>
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            rows={4}
                                            placeholder="e.g., Water leak at Central Market near the main gate"
                                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                        <p className="mt-1 text-xs text-slate-500">
                                            Try keywords like: "water", "road", "garbage", "electric"
                                        </p>
                                    </div>

                                    {/* Quick Templates */}
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            "Water leak at Sector 4",
                                            "Huge pothole on Main Street",
                                            "Garbage checking overdue",
                                            "No electricity in Ward 5"
                                        ].map((text) => (
                                            <button
                                                key={text}
                                                onClick={() => setMessage(text)}
                                                className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                                            >
                                                {text}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Result Alert */}
                                    {result && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex items-center gap-3 rounded-lg p-3 text-sm ${result.success
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                }`}
                                        >
                                            {result.success ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                            {result.msg}
                                        </motion.div>
                                    )}

                                    <button
                                        onClick={handleSendSMS}
                                        disabled={isSending || !message.trim()}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500"
                                    >
                                        {isSending ? (
                                            <span className="animate-pulse">Sending...</span>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4" />
                                                Simulate Incoming SMS
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
