import { useState, useEffect, useRef } from "react";
import api from "../utils/api";
import { Link } from "react-router-dom";

export default function ARInspector() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [nearbyIssues, setNearbyIssues] = useState<any[]>([]);
    const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });

    useEffect(() => {
        // 1. Camera Access
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            .then(stream => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setHasPermission(true);
                }
            })
            .catch(err => console.error("Camera Error:", err));

        // 2. Fetch Nearby Issues (Mock Location for demo if GPS fails)
        // In real app, use getCurrentPosition
        const defaultLat = 12.9716;
        const defaultLng = 77.5946;

        api.post("/api/ai/duplicate-check", {
            text: "test", // Dummy text to trigger search
            intent: "water_outage", // Dummy intent
            latitude: defaultLat,
            longitude: defaultLng,
            radius_meters: 500
        }).then(res => {
            if (res.data.matches) {
                setNearbyIssues(res.data.matches);
            }
        }).catch(err => console.error(err));

        // 3. Orientation Listener (Device capabilities needed)
        const handleOrientation = (e: DeviceOrientationEvent) => {
            setOrientation({
                alpha: e.alpha || 0, // Compass direction
                beta: e.beta || 0,
                gamma: e.gamma || 0
            });
        };
        window.addEventListener("deviceorientation", handleOrientation);

        return () => {
            window.removeEventListener("deviceorientation", handleOrientation);
            // Stop tracks
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-black">
            {/* Video Feed */}
            {hasPermission ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover z-0"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
                    <p>Requesting Camera Access...</p>
                </div>
            )}

            {/* AR Overlay UI */}
            <div className="absolute inset-0 z-10 p-4 pointer-events-none">

                {/* Header */}
                <div className="glass-card p-3 inline-flex items-center gap-2 mb-4 pointer-events-auto">
                    <Link to="/" className="text-white text-xl">←</Link>
                    <span className="text-white font-bold">Field Inspector (AR Mode)</span>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                </div>

                {/* Floating Markers (Simulated AR) */}
                {nearbyIssues.map((issue, i) => {
                    // Simple logic to scatter them based on index if compass is not accurate
                    // Real AR needs complex projection matrix
                    const offsetX = ((i % 3) - 1) * 30 + (orientation.alpha % 30);
                    const offsetY = 50 + ((i % 2) * 20);

                    return (
                        <div
                            key={i}
                            className="absolute bg-white/90 backdrop-blur p-3 rounded-xl shadow-xl w-64 pointer-events-auto transition-transform duration-200"
                            style={{
                                left: `${50 + offsetX}%`,
                                top: `${offsetY}%`,
                                transform: `translate(-50%, -50%) scale(${1 - (i * 0.1)})`
                            }}
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl">
                                    📍
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800">Issue #{issue.submission_id}</h4>
                                    <p className="text-xs text-gray-500">
                                        {issue.distance_meters ? `${Math.round(issue.distance_meters)}m away` : 'Nearby'}
                                    </p>
                                    <p className="text-xs text-blue-600 font-medium mt-1">
                                        {Math.round(issue.similarity_score * 100)}% Match
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {nearbyIssues.length === 0 && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                        <p className="text-white/80">Scanning area...</p>
                        <div className="mt-2 w-12 h-1 bg-white/20 rounded-full overflow-hidden mx-auto">
                            <div className="w-1/2 h-full bg-blue-400 animate-loading-bar"></div>
                        </div>
                    </div>
                )}

            </div>

            {/* HUD Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-20">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-white/60 text-xs font-mono">LAT: 12.9716 N | LNG: 77.5946 E</p>
                        <p className="text-white/60 text-xs font-mono">HDG: {Math.round(orientation.alpha)}° N</p>
                    </div>
                    <button className="btn-primary rounded-full w-14 h-14 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        📷
                    </button>
                </div>
            </div>
        </div>
    );
}
