interface PriorityBadgeProps {
    level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    score?: number;
    estimatedResponse?: string;
    confidence?: number; // 0.0 to 1.0
    size?: "sm" | "md" | "lg";
    showDetails?: boolean;
}

const PRIORITY_STYLES = {
    LOW: {
        bg: "bg-gradient-to-r from-gray-500 to-slate-600",
        border: "border-gray-400/50",
        text: "text-gray-100",
        icon: "📋",
        glow: ""
    },
    MEDIUM: {
        bg: "bg-gradient-to-r from-yellow-500 to-amber-600",
        border: "border-yellow-400/50",
        text: "text-yellow-100",
        icon: "⚡",
        glow: ""
    },
    HIGH: {
        bg: "bg-gradient-to-r from-orange-500 to-red-500",
        border: "border-orange-400/50",
        text: "text-orange-100",
        icon: "🔥",
        glow: "shadow-lg shadow-orange-500/30"
    },
    CRITICAL: {
        bg: "bg-gradient-to-r from-red-600 to-pink-600",
        border: "border-red-400/50",
        text: "text-red-100",
        icon: "🚨",
        glow: "shadow-lg shadow-red-500/50 animate-pulse"
    }
};

export default function PriorityBadge({
    level,
    score,
    estimatedResponse,
    confidence,
    size = "md",
    showDetails = false
}: PriorityBadgeProps) {
    const style = PRIORITY_STYLES[level] || PRIORITY_STYLES.MEDIUM;

    const sizeClasses = {
        sm: "px-2 py-1 text-xs",
        md: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2 text-base"
    };

    return (
        <div className="flex flex-col items-center gap-2">
            {/* Main Badge */}
            <div
                className={`
          inline-flex items-center gap-2 rounded-full font-bold
          ${style.bg} ${style.border} ${style.text} ${style.glow}
          ${sizeClasses[size]}
          border-2 relative overflow-hidden group
        `}
            >
                {/* Confidence shimmer effect */}
                {confidence && confidence > 0.8 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 translate-x-[-150%] animate-[shimmer_2s_infinite]"></div>
                )}

                <span>{style.icon}</span>
                <span>{level}</span>
                {score !== undefined && (
                    <span className="opacity-70">({score})</span>
                )}
            </div>

            {/* Details */}
            {showDetails && estimatedResponse && (
                <div className="text-center w-full max-w-[120px]">
                    <p className="text-white/60 text-[10px] uppercase tracking-wider mb-1">Est. Completion</p>
                    <p className="text-white font-mono font-bold text-sm bg-black/20 rounded px-2 py-0.5 mb-1">
                        {estimatedResponse}
                    </p>

                    {/* Confidence Band */}
                    {confidence && (
                        <div className="flex flex-col gap-0.5">
                            <div className="flex justify-between text-[9px] text-white/40">
                                <span>Confidence</span>
                                <span>{Math.round(confidence * 100)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${confidence > 0.8 ? 'bg-green-400' :
                                        confidence > 0.6 ? 'bg-yellow-400' : 'bg-red-400'
                                        }`}
                                    style={{ width: `${confidence * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}


