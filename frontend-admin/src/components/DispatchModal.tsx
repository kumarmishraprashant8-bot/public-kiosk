import { useState } from 'react';

interface DispatchModalProps {
    isOpen: boolean;
    selectedCount: number;
    onClose: () => void;
    onConfirm: (crewId: string, eta: number) => void;
}

const DEMO_CREWS = [
    { id: 'crew-1', name: 'Alpha Team', specialty: 'Water & Sewage', available: true },
    { id: 'crew-2', name: 'Beta Squad', specialty: 'Electricity', available: true },
    { id: 'crew-3', name: 'Gamma Unit', specialty: 'Roads & Municipal', available: true },
    { id: 'crew-4', name: 'Delta Force', specialty: 'Emergency Response', available: false },
    { id: 'crew-5', name: 'Echo Patrol', specialty: 'General Maintenance', available: true },
];

export default function DispatchModal({
    isOpen,
    selectedCount,
    onClose,
    onConfirm,
}: DispatchModalProps) {
    const [selectedCrew, setSelectedCrew] = useState('');
    const [eta, setEta] = useState(30); // minutes
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (!selectedCrew) return;

        setIsSubmitting(true);
        // Simulate network delay for demo
        await new Promise((resolve) => setTimeout(resolve, 500));
        onConfirm(selectedCrew, eta);
        setIsSubmitting(false);
        setSelectedCrew('');
        setEta(30);
    };

    return (
        <>
            {/* Overlay */}
            <div
                className="modal-overlay animate-fadeIn"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal */}
            <div
                className="fixed inset-0 z-[1210] flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <div className="w-full max-w-md animate-slide-in-up rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
                        <h2 id="modal-title" className="text-xl font-bold text-white">
                            🚀 Simulate Dispatch
                        </h2>
                        <button
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"
                            aria-label="Close modal"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-5">
                        {/* Selected Count */}
                        <div className="rounded-lg bg-cyan-500/10 px-4 py-3 text-center text-cyan-300">
                            <span className="font-semibold">{selectedCount}</span> submission(s) selected for dispatch
                        </div>

                        {/* Crew Selection */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">
                                Select Crew
                            </label>
                            <div className="space-y-2">
                                {DEMO_CREWS.map((crew) => (
                                    <label
                                        key={crew.id}
                                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${selectedCrew === crew.id
                                            ? 'border-cyan-500/50 bg-cyan-500/10'
                                            : 'border-slate-600 hover:border-slate-500'
                                            } ${!crew.available ? 'cursor-not-allowed opacity-50' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name="crew"
                                            value={crew.id}
                                            checked={selectedCrew === crew.id}
                                            onChange={(e) => setSelectedCrew(e.target.value)}
                                            disabled={!crew.available}
                                            className="w-4 h-4 text-primary focus:ring-primary"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-white">{crew.name}</div>
                                            <div className="text-xs text-slate-400">{crew.specialty}</div>
                                        </div>
                                        {crew.available ? (
                                            <span className="badge badge-success text-xs">Available</span>
                                        ) : (
                                            <span className="badge bg-slate-600 text-slate-300 text-xs">Busy</span>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* ETA Slider */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">
                                ETA: <span className="font-bold text-cyan-400">{eta} min</span>
                            </label>
                            <input
                                type="range"
                                min="15"
                                max="120"
                                step="15"
                                value={eta}
                                onChange={(e) => setEta(Number(e.target.value))}
                                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-600 accent-cyan-500"
                            />
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                                <span>15 min</span>
                                <span>1 hr</span>
                                <span>2 hrs</span>
                            </div>
                        </div>

                        {/* Expected Effect */}
                        <div className="rounded-lg bg-slate-700/50 p-4 text-sm">
                            <h4 className="mb-2 font-medium text-slate-200">Expected Effect:</h4>
                            <ul className="space-y-1 text-slate-300">
                                <li>• {selectedCount} submissions marked as "assigned"</li>
                                <li>• Cluster heatmap will update (faded intensity)</li>
                                <li>• Activity log will record this dispatch</li>
                            </ul>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 border-t border-slate-700 px-6 py-4">
                        <button
                            onClick={onClose}
                            className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-slate-300 hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!selectedCrew || isSubmitting}
                            className="flex-1 rounded-lg bg-cyan-600 px-4 py-2 font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Dispatching...
                                </>
                            ) : (
                                <>✓ Confirm Dispatch</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
