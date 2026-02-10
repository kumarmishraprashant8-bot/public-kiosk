import { Cluster } from '../types';

interface ClusterCardProps {
    cluster: Cluster;
    isSelected: boolean;
    onSelect: (clusterId: string, selected: boolean) => void;
    onClick: (cluster: Cluster) => void;
}

export default function ClusterCard({
    cluster,
    isSelected,
    onSelect,
    onClick,
}: ClusterCardProps) {
    const intentIcons: Record<string, string> = {
        water_outage: '💧',
        electricity_outage: '⚡',
        garbage: '🗑️',
        road: '🛣️',
        sewage: '🚰',
        streetlight: '💡',
        other: '📋',
    };

    const getPriorityStyles = (priority: string, escalated: boolean) => {
        if (escalated) return 'border-rose-500/50 bg-rose-500/5';
        switch (priority) {
            case 'urgent':
                return 'border-rose-500/50 bg-rose-500/5';
            case 'high':
                return 'border-amber-500/50 bg-amber-500/5';
            default:
                return 'border-slate-600/60 bg-slate-800/50';
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
    };

    return (
        <div
            className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all hover:shadow-lg ${getPriorityStyles(
                cluster.priority,
                cluster.escalated
            )} ${isSelected ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-slate-900' : ''}`}
            onClick={() => onClick(cluster)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick(cluster)}
            aria-label={`Cluster ${cluster.cluster_id}, ${cluster.size} submissions, ${cluster.priority} priority`}
        >
            {/* Checkbox */}
            <div onClick={(e) => e.stopPropagation()}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelect(cluster.cluster_id, e.target.checked)}
                    className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                    aria-label={`Select cluster ${cluster.cluster_id}`}
                />
            </div>

            {/* Icon */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-700/80 text-2xl">
                {intentIcons[cluster.intent] || '📋'}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="truncate font-semibold capitalize text-white">
                        {cluster.intent.replace(/_/g, ' ')}
                    </h3>
                    {cluster.escalated && (
                        <span className="badge badge-danger text-xs animate-pulse">
                            🚨 ESCALATED
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                        📍 {cluster.ward || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                        📄 {cluster.size} submissions
                    </span>
                </div>
            </div>

            {/* Priority & Time */}
            <div className="text-right shrink-0">
                <div
                    className={`badge mb-1 ${cluster.priority === 'urgent'
                            ? 'badge-danger'
                            : cluster.priority === 'high'
                                ? 'badge-warning'
                                : 'badge-info'
                        }`}
                >
                    {cluster.priority.toUpperCase()}
                </div>
                <div className="text-xs text-slate-500">
                    {formatTimeAgo(cluster.created_at)}
                </div>
            </div>

            {/* Arrow indicator */}
            <div className="text-xl text-slate-500">
                →
            </div>
        </div>
    );
}
