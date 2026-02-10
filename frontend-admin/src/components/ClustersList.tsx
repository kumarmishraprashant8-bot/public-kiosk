import { useState, useMemo } from 'react';
import { Cluster } from '../types';
import ClusterCard from './ClusterCard';

interface ClustersListProps {
    clusters: Cluster[];
    selectedClusterIds: string[];
    onSelectCluster: (clusterId: string, selected: boolean) => void;
    onSelectAll: (selected: boolean) => void;
    onClusterClick: (cluster: Cluster) => void;
    onBulkDispatch: () => void;
}

type SortField = 'size' | 'priority' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function ClustersList({
    clusters,
    selectedClusterIds,
    onSelectCluster,
    onSelectAll,
    onClusterClick,
    onBulkDispatch,
}: ClustersListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set(clusters.map((c) => c.intent));
        return ['all', ...Array.from(cats)];
    }, [clusters]);

    // Filter and sort clusters
    const filteredClusters = useMemo(() => {
        let result = [...clusters];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (c) =>
                    c.cluster_id.toLowerCase().includes(query) ||
                    c.intent.toLowerCase().includes(query) ||
                    (c.ward && c.ward.toLowerCase().includes(query))
            );
        }

        // Category filter
        if (categoryFilter !== 'all') {
            result = result.filter((c) => c.intent === categoryFilter);
        }

        // Priority filter
        if (priorityFilter !== 'all') {
            if (priorityFilter === 'escalated') {
                result = result.filter((c) => c.escalated);
            } else {
                result = result.filter((c) => c.priority === priorityFilter);
            }
        }

        // Sort
        result.sort((a, b) => {
            let comparison = 0;

            if (sortField === 'size') {
                comparison = a.size - b.size;
            } else if (sortField === 'priority') {
                const priorityOrder = { urgent: 3, high: 2, normal: 1 };
                comparison =
                    (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) -
                    (priorityOrder[b.priority as keyof typeof priorityOrder] || 0);
            } else if (sortField === 'created_at') {
                comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }

            return sortDirection === 'desc' ? -comparison : comparison;
        });

        return result;
    }, [clusters, searchQuery, categoryFilter, priorityFilter, sortField, sortDirection]);

    const allSelected = filteredClusters.length > 0 &&
        filteredClusters.every((c) => selectedClusterIds.includes(c.cluster_id));

    return (
        <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/50 shadow-xl">
            {/* Header */}
            <div className="border-b border-slate-700/80 bg-slate-800/80 px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white">
                            Clusters ({filteredClusters.length})
                        </h2>
                        {selectedClusterIds.length > 0 && (
                            <span className="badge badge-primary">
                                {selectedClusterIds.length} selected
                            </span>
                        )}
                    </div>

                    {selectedClusterIds.length > 0 && (
                        <button
                            onClick={onBulkDispatch}
                            className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
                        >
                            🚀 Dispatch Selected ({selectedClusterIds.length})
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative max-w-xs min-w-[200px] flex-1">
                        <input
                            type="search"
                            placeholder="Search clusters..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2 pl-10 pr-4 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                            aria-label="Search clusters"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            🔍
                        </span>
                    </div>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                        aria-label="Filter by category"
                    >
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat === 'all' ? 'All Categories' : cat.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>

                    {/* Priority Filter */}
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                        aria-label="Filter by priority"
                    >
                        <option value="all">All Priorities</option>
                        <option value="escalated">🚨 Escalated</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="normal">Normal</option>
                    </select>

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">Sort:</span>
                        <select
                            value={sortField}
                            onChange={(e) => setSortField(e.target.value as SortField)}
                            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                            aria-label="Sort by"
                        >
                            <option value="created_at">Time</option>
                            <option value="size">Size</option>
                            <option value="priority">Priority</option>
                        </select>
                        <button
                            onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                            className="rounded-lg border border-slate-600 p-2 hover:bg-slate-700"
                            aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
                        >
                            {sortDirection === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                </div>

                {/* Select All */}
                <div className="mt-3 flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => onSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        id="select-all-clusters"
                    />
                    <label htmlFor="select-all-clusters" className="text-sm text-slate-400">
                        Select all visible clusters
                    </label>
                </div>
            </div>

            {/* List */}
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto custom-scroll">
                {filteredClusters.length > 0 ? (
                    filteredClusters.map((cluster) => (
                        <ClusterCard
                            key={cluster.cluster_id}
                            cluster={cluster}
                            isSelected={selectedClusterIds.includes(cluster.cluster_id)}
                            onSelect={onSelectCluster}
                            onClick={onClusterClick}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-4 rounded-2xl bg-slate-700/50 p-6">
                            <span className="text-5xl">📊</span>
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-white">
                            No clusters found
                        </h3>
                        <p className="mb-6 max-w-sm text-sm text-slate-400">
                            {clusters.length === 0
                                ? 'Click "Seed Demo" to create sample data, then "Run Clustering" to detect patterns.'
                                : 'Try adjusting your filters.'}
                        </p>
                        {clusters.length === 0 && (
                            <p className="text-xs text-cyan-400">Tip: Seed Demo creates 200 submissions + 2 hot clusters</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
