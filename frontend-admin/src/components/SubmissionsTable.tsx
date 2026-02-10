import { useState } from 'react';
import { Submission } from '../types';
import { ShieldCheck, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../utils/api';

interface ExtendedSubmission extends Submission {
  text?: string;
  ocr_parsed_data?: Record<string, any>;
  created_at?: string;
}

interface SubmissionsTableProps {
  submissions: ExtendedSubmission[];
  onSelect: (ids: number[]) => void;
  selectedIds: number[];
}

const INTENT_ICONS: Record<string, string> = {
  water_outage: '💧',
  electricity_outage: '⚡',
  garbage: '🗑️',
  road: '🛣️',
  sewage: '🚰',
  streetlight: '💡',
  other: '📋',
};

export default function SubmissionsTable({
  submissions,
  onSelect,
  selectedIds,
}: SubmissionsTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Verification State
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [verificationResults, setVerificationResults] = useState<Record<number, boolean>>({});

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onSelect(filteredSubmissions.map((s) => s.id));
    } else {
      onSelect([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      onSelect([...selectedIds, id]);
    } else {
      onSelect(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  const handleVerify = async (e: React.MouseEvent, submissionId: number) => {
    e.stopPropagation(); // Prevent row expand
    setVerifyingId(submissionId);

    try {
      // 1. Get Receipt ID
      const receiptRes = await api.get(`/receipt/by-submission/${submissionId}`);
      const receiptId = receiptRes.data.receipt_id;

      // 2. Verify Chain
      const verifyRes = await api.get(`/receipt/${receiptId}/verify`);
      const isValid = verifyRes.data.verification === 'OK';

      setVerificationResults(prev => ({ ...prev, [submissionId]: isValid }));

      if (isValid) {
        // Optional: could trigger a global toast via a passed prop, but visual feedback is enough for now
      }
    } catch (err) {
      console.error("Verification failed", err);
      setVerificationResults(prev => ({ ...prev, [submissionId]: false }));
    } finally {
      setVerifyingId(null);
    }
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter((s) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.id.toString().includes(query) ||
      s.intent.toLowerCase().includes(query) ||
      s.status.toLowerCase().includes(query)
    );
  });

  // Paginate
  const totalPages = Math.ceil(filteredSubmissions.length / pageSize);
  const paginatedSubmissions = filteredSubmissions.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'badge-danger',
      high: 'badge-warning',
      normal: 'badge-info',
    };
    return (
      <span className={`badge ${colors[priority] || 'badge-info'}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'badge-warning',
      assigned: 'badge-info',
      resolved: 'badge-success',
    };
    return (
      <span className={`badge ${colors[status] || 'badge-warning'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/50 shadow-xl">
      {/* Header */}
      <div className="border-b border-slate-700/80 bg-slate-800/80 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-white">
            Recent Submissions ({filteredSubmissions.length})
          </h2>

          {/* Search */}
          <div className="relative max-w-xs flex-1">
            <input
              type="search"
              placeholder="Search submissions..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2 pl-10 pr-4 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
              aria-label="Search submissions"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-700/80 bg-slate-800/60">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.length === paginatedSubmissions.length && paginatedSubmissions.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Location</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Audit</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Time</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60">
            {paginatedSubmissions.map((submission) => (
              <>
                <tr
                  key={submission.id}
                  className={`transition-colors hover:bg-slate-700/30 ${expandedIds.has(submission.id) ? 'bg-cyan-500/5' : ''}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(submission.id)}
                      onChange={(e) => handleSelectOne(submission.id, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                      aria-label={`Select submission ${submission.id}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-white">
                    #{submission.id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {INTENT_ICONS[submission.intent] || '📋'}
                      </span>
                      <span className="text-sm capitalize text-slate-200">
                        {submission.intent.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {submission.latitude && submission.longitude
                      ? `${submission.latitude.toFixed(4)}, ${submission.longitude.toFixed(4)}`
                      : '--'}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(submission.status)}
                  </td>
                  <td className="px-4 py-3">
                    {getPriorityBadge(submission.priority)}
                  </td>
                  <td className="px-4 py-3">
                    {verifyingId === submission.id ? (
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    ) : verificationResults[submission.id] === true ? (
                      <div title="Verified on Blockchain" className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                    ) : verificationResults[submission.id] === false ? (
                      <div title="Verification Failed" className="flex items-center gap-1 text-rose-400">
                        <XCircle className="h-5 w-5" />
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleVerify(e, submission.id)}
                        className="text-slate-500 hover:text-cyan-400 transition-colors"
                        title="Verify Integrity"
                      >
                        <ShieldCheck className="h-5 w-5" />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {formatTime(submission.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleExpand(submission.id)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
                      aria-label={expandedIds.has(submission.id) ? 'Collapse' : 'Expand'}
                      aria-expanded={expandedIds.has(submission.id)}
                    >
                      <span className={`inline-block transition-transform ${expandedIds.has(submission.id) ? 'rotate-180' : ''
                        }`}>
                        ▼
                      </span>
                    </button>
                  </td>
                </tr>

                {/* Expanded Row */}
                {expandedIds.has(submission.id) && (
                  <tr key={`${submission.id}-expanded`}>
                    <td colSpan={9} className="bg-slate-800/50 px-4 py-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Description */}
                        <div className="rounded-lg border border-slate-600/60 bg-slate-800 p-4">
                          <h4 className="mb-2 text-sm font-semibold text-slate-200">
                            📝 Description
                          </h4>
                          <p className="text-sm text-slate-300">
                            {submission.text || 'No description provided.'}
                          </p>
                        </div>

                        {/* OCR Data */}
                        <div className="rounded-lg border border-slate-600/60 bg-slate-800 p-4">
                          <h4 className="mb-2 text-sm font-semibold text-slate-200">
                            📄 OCR Parsed Data
                          </h4>
                          {submission.ocr_parsed_data ? (
                            <div className="space-y-1">
                              {Object.entries(submission.ocr_parsed_data).map(
                                ([key, value]) =>
                                  value && (
                                    <div key={key} className="flex justify-between text-sm">
                                      <span className="capitalize text-slate-400">
                                        {key.replace(/_/g, ' ')}:
                                      </span>
                                      <span className="font-medium text-white">
                                        {String(value)}
                                      </span>
                                    </div>
                                  )
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">No OCR data</p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {paginatedSubmissions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-2xl bg-slate-700/50 p-6">
              <span className="text-5xl">📋</span>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">
              No submissions found
            </h3>
            <p className="text-sm text-slate-400">
              {submissions.length === 0
                ? 'Click "Seed Demo" to create sample data.'
                : 'Try adjusting your search.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredSubmissions.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-700/80 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-white"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border border-slate-600 px-3 py-1 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ←
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded border border-slate-600 px-3 py-1 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
