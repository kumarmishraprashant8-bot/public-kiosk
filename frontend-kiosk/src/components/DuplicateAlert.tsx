import { AlertTriangle, ThumbsUp, ArrowRight } from 'lucide-react';

interface DuplicateAlertProps {
    isOpen: boolean;
    onClose: () => void; // Proceed anyway
    onConfirm: () => void; // "Thanks, I won't submit"
    matchData: any;
}

export default function DuplicateAlert({ isOpen, onClose, onConfirm, matchData }: DuplicateAlertProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-yellow-500/50 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="bg-yellow-500/10 p-6 text-center border-b border-yellow-500/20">
                    <div className="mx-auto bg-yellow-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8 text-yellow-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Similar Issue Found!</h2>
                    <p className="text-yellow-200/80 text-sm">
                        It looks like someone nearby just reported this.
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="text-xs text-white/40 uppercase font-bold mb-1">Existing Report</div>
                        <p className="text-white/90 italic">"{matchData?.similar_text}"</p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-green-400">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Status: In Progress
                        </div>
                    </div>

                    <div className="text-center text-white/60 text-sm">
                        Reporting it again won't speed it up, but you can upvote it instead!
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 bg-black/20 flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <ThumbsUp size={20} />
                        Upvote Existing (Don't Submit)
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/60 font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                        Submit Anyway
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
