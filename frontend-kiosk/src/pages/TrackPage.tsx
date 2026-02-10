import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";

interface TrackData {
  short_code: string;
  receipt_id: string;
  receipt_hash: string;
  verified: boolean;
  submission: {
    id: number;
    intent: string;
    text: string;
    status: string;
    priority: string;
  };
  timeline: Array<{ step: string; status: string; label: string; at: string | null }>;
  cluster?: { cluster_id: string; size: number; ward: string };
}

const INTENT_LABELS: Record<string, string> = {
  water_outage: "Water Issue",
  electricity_outage: "Electricity",
  garbage: "Garbage",
  road: "Road/Pothole",
  sewage: "Sewage/Drain",
  streetlight: "Street Light",
};

export default function TrackPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shortCode) return;
    api
      .get<TrackData>(`/track/${shortCode}`)
      .then((res) => setData(res.data))
      .catch(() => setError("Tracking code not found"))
      .finally(() => setLoading(false));
  }, [shortCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading tracking info...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6">
        <div className="glass-card p-8 text-center max-w-md">
          <span className="text-6xl block mb-4">❌</span>
          <h1 className="text-2xl font-bold text-white mb-2">Not Found</h1>
          <p className="text-white/60 mb-6">{error || "Invalid tracking code"}</p>
          <button onClick={() => navigate("/")} className="btn-primary">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">📋 Complaint Tracking</h1>
          <p className="text-white/60">Code: {data.short_code}</p>
        </div>

        <div className="glass-card-light p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500">Status</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-bold ${
                data.submission.status === "resolved"
                  ? "bg-green-100 text-green-800"
                  : data.submission.status === "assigned"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {data.submission.status}
            </span>
          </div>
          <div className="mb-2">
            <span className="text-gray-500 text-sm">Issue</span>
            <p className="font-medium text-gray-800">
              {INTENT_LABELS[data.submission.intent] || data.submission.intent}
            </p>
          </div>
          <p className="text-gray-600 text-sm">{data.submission.text}</p>
          {data.cluster && (
            <p className="text-sm text-purple-600 mt-2">
              👥 {data.cluster.size} reporters in {data.cluster.ward}
            </p>
          )}
        </div>

        <div className="glass-card p-6 mb-4">
          <h2 className="font-bold text-white mb-4">Timeline</h2>
          <div className="space-y-4">
            {data.timeline.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step.status === "done" ? "bg-green-500 text-white" : "bg-gray-600 text-white"
                  }`}
                >
                  {step.status === "done" ? "✓" : i + 1}
                </div>
                <div>
                  <p className="text-white font-medium">{step.label}</p>
                  {step.at && (
                    <p className="text-white/50 text-xs">{new Date(step.at).toLocaleString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`p-4 rounded-xl flex items-center gap-3 ${
            data.verified ? "bg-green-500/20 border border-green-400/50" : "bg-amber-500/20"
          }`}
        >
          {data.verified ? (
            <>
              <span className="text-2xl">✓</span>
              <div>
                <p className="font-bold text-green-300">Verification OK</p>
                <p className="text-sm text-green-200/80">Receipt hash chain verified</p>
              </div>
            </>
          ) : (
            <>
              <span className="text-2xl">⚠</span>
              <p className="text-amber-200">Verification pending</p>
            </>
          )}
        </div>

        <button
          onClick={() => navigate("/")}
          className="w-full mt-6 py-3 text-white/80 hover:text-white border border-white/20 rounded-xl"
        >
          New Complaint
        </button>
      </div>
    </div>
  );
}
