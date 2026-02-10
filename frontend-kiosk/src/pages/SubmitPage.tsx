import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Language, SubmissionCreate, OCRParseResponse, ReceiptResponse } from "../types";
import api from "../utils/api";
import { saveToOfflineQueue, syncOfflineQueue } from "../utils/offlineQueue";
import { stopSpeaking, speak } from "../utils/tts";
import DuplicateAlert from "../components/DuplicateAlert";
import IntentSuggestion from "../components/IntentSuggestion";
import SmartTips from "../components/SmartTips";
import VoiceInput from "../components/VoiceInput";
import PriorityBadge from "../components/PriorityBadge";
import PhotoUpload from "../components/PhotoUpload";

const ISSUE_TYPES = [
  { id: "water_outage", icon: "💧", label: "Water Issue", labelHi: "पानी की समस्या", labelTa: "நீர் பிரச்சனை" },
  { id: "electricity_outage", icon: "⚡", label: "Electricity", labelHi: "बिजली की समस्या", labelTa: "மின்சார பிரச்சனை" },
  { id: "garbage", icon: "🗑️", label: "Garbage", labelHi: "कचरा", labelTa: "குப்பை" },
  { id: "road", icon: "🛣️", label: "Road/Pothole", labelHi: "सड़क/गड्ढा", labelTa: "சாலை/குழி" },
  { id: "sewage", icon: "🚰", label: "Sewage/Drain", labelHi: "नाला/नाली", labelTa: "கழிவுநீர்" },
  { id: "streetlight", icon: "💡", label: "Street Light", labelHi: "स्ट्रीट लाइट", labelTa: "தெரு விளக்கு" },
  { id: "general", icon: "📢", label: "General / Other", labelHi: "अन्य समस्या", labelTa: "பிற பிரச்சனைகள்" },
];

// AI State Types
interface DuplicateData {
  is_duplicate: boolean;
  confidence: number;
  similar_submission_id?: number;
  similar_text?: string;
  distance_meters?: number;
  message: string;
}

interface IntentData {
  detected_intent: string;
  confidence: number;
  matches_selection: boolean;
  suggested_change: boolean;
  message: string | null;
}

interface PriorityData {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  estimated_response: string;
  confidence?: number;
  breakdown: Record<string, number>;
}

export default function SubmitPage() {
  const location = useLocation();

  const state = location.state as { lang?: Language; mode?: 'photo' | 'voice' | 'type' };
  const initialLang = state?.lang
    || (sessionStorage.getItem("selectedLanguage") as Language)
    || "en";

  const [lang] = useState<Language>(initialLang);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [intent, setIntent] = useState("");
  const [text, setText] = useState("");
  const initialMode = state?.mode;

  // Handle Quick Actions
  useEffect(() => {
    if (initialMode && step === 1) {
      setIntent("general");
      setStep(2);

      // Auto-trigger actions based on mode
      setTimeout(() => {
        if (initialMode === 'photo') {
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          if (fileInput) fileInput.click();
        } else if (initialMode === 'voice') {
          const micBtn = document.querySelector('.voice-input-btn') as HTMLButtonElement;
          if (micBtn) micBtn.click();
        } else if (initialMode === 'type') {
          const textArea = document.querySelector('textarea') as HTMLTextAreaElement;
          if (textArea) textArea.focus();
        }
      }, 500); // Small delay to ensure render
    }
  }, [initialMode, step]);
  const [ocrData, setOcrData] = useState<OCRParseResponse | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();

  // AI Feature States
  const [duplicateData, setDuplicateData] = useState<DuplicateData | null>(null);
  const [intentData, setIntentData] = useState<IntentData | null>(null);
  const [priorityData, setPriorityData] = useState<PriorityData | null>(null);
  const [aiChecking, setAiChecking] = useState(false);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(true);
  const [joinedSubmissionId, setJoinedSubmissionId] = useState<number | null>(null);

  const [locationCoords, setLocationCoords] = useState<{ lat: number, lng: number } | null>(null);

  useEffect(() => {
    // Get Location
    import("../utils/geo").then(({ getCurrentLocation }) => {
      getCurrentLocation()
        .then(loc => {
          setLocationCoords({ lat: loc.latitude, lng: loc.longitude });
          // setGeoError(null);
        })
        .catch(err => {
          console.warn("Location error:", err);
          // setGeoError("Location access denied. Using default/manual.");
        });
    });

    // Stop speech
    stopSpeaking();

    // Voice Guidance for Step 1
    let ttsTimer: ReturnType<typeof setTimeout>;
    if (step === 1) {
      const texts: Record<string, string> = {
        en: "Select your problem",
        hi: "अपनी समस्या चुनें",
        ta: "உங்கள் பிரச்சனையை தேர்ந்தெடுக்கவும்"
      };
      // Short delay to allow page load
      ttsTimer = setTimeout(() => speak(texts[lang] || texts.en, lang), 500);
    }

    // ... existing event listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const syncInterval = setInterval(() => {
      if (isOnline) syncOfflineQueue();
    }, 15000);

    return () => {
      clearTimeout(ttsTimer);
      stopSpeaking();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(syncInterval);
    };
  }, [isOnline]);

  // Run AI checks when moving to Step 3
  // Run AI checks when moving to Step 3 OR when text allows enough context
  useEffect(() => {
    // Check if we have enough text and it's not just a short greeting
    if (text.length > 10 && intent && isOnline) {
      const timer = setTimeout(() => {
        runAIChecks();
      }, 1000); // Debounce for 1 second
      return () => clearTimeout(timer);
    }
  }, [text, intent, step]);

  // Debounced AI check function
  const runAIChecks = async () => {
    if (!text.trim() || !intent || !isOnline) return;

    setAiChecking(true);
    try {
      // Run all AI checks in parallel
      const [dupRes, intentRes, priorityRes] = await Promise.allSettled([
        api.post("/api/ai/duplicate-check", {
          text,
          intent,
          latitude: locationCoords?.lat,
          longitude: locationCoords?.lng,
          radius_meters: 500
        }),
        api.post("/api/ai/intent-check", {
          text,
          selected_intent: intent
        }),
        api.post("/api/ai/priority-score", {
          text,
          intent
        })
      ]);

      // Handle duplicate check
      // Handle duplicate check
      if (dupRes.status === "fulfilled") {
        setDuplicateData(dupRes.value.data);
        setShowDuplicateAlert(dupRes.value.data.is_duplicate);
      }

      // Handle intent check
      if (intentRes.status === "fulfilled") {
        const iData = intentRes.value.data;
        setIntentData(iData);

        // AUTO-SWITCH High Confidence Intent
        // If the AI is very sure (>80%) and it's different from current, switch it automatically
        if (iData.confidence > 0.8 && iData.detected_intent !== intent) {
          setIntent(iData.detected_intent);
          // Optional: Show a toast/notification here if we had a toast system
          // For now, the visual change of the icon is enough, maybe adding a glow effect would be cool
        }
      }

      // Handle priority score
      if (priorityRes.status === "fulfilled") {
        setPriorityData(priorityRes.value.data);
      }
    } catch (error) {
      console.error("AI check error:", error);
    } finally {
      // Keep loading state for a moment so user sees it
      setTimeout(() => setAiChecking(false), 800);
    }
  };

  // Handle joining an existing duplicate
  const handleJoinDuplicate = async (submissionId: number, clusterId?: string) => {
    try {
      let citizenCount = 1;
      if (clusterId) {
        const res = await api.post(`/api/cluster/${clusterId}/join`, { submission_id: submissionId });
        citizenCount = res.data.cluster_size || 1;
      } else {
        const res = await api.post(`/admin/submission/${submissionId}/join`, null, { params: { password: "admin123" } });
        citizenCount = res.data.citizen_count || 1;
      }
      setJoinedSubmissionId(submissionId);
      setShowDuplicateAlert(false);
      // Get receipt for joined submission
      const receiptRes = await api.get(`/receipt/by-submission/${submissionId}`);
      navigate(`/receipt/${receiptRes.data.receipt_id}`, {
        state: {
          priorityData,
          joinedSubmissionId: submissionId,
          citizenCount,
          message: `Joined complaint #${submissionId}`
        }
      });
    } catch (error) {
      console.error("Failed to join complaint:", error);
      setJoinedSubmissionId(submissionId);
      setShowDuplicateAlert(false);
    }
  };

  // Handle continuing with new submission despite duplicates
  const handleContinueNew = () => {
    setShowDuplicateAlert(false);
    setJoinedSubmissionId(null);
  };

  // Handle switching intent to AI suggestion
  const handleIntentSwitch = () => {
    if (intentData?.detected_intent) {
      setIntent(intentData.detected_intent);
      setIntentData(null);
      // Re-run AI checks with new intent
      runAIChecks();
    }
  };

  // Handle keeping current intent
  const handleIntentKeep = () => {
    setIntentData(null);
  };

  // Handle issue solved via smart tips
  const handleIssueSolved = () => {
    navigate("/");
  };

  // Handle voice transcript
  const handleVoiceTranscript = (transcript: string) => {
    setText(prev => prev ? `${prev} ${transcript}` : transcript);
  };


  // handleMagicVoice removed


  const handleSubmit = async () => {
    if (!intent) {
      alert("Please select an issue type");
      return;
    }
    if (!text.trim()) {
      alert("Please describe your issue");
      return;
    }

    setSubmitting(true);
    try {
      const submission: SubmissionCreate = {
        intent,
        text,
        ocr_parsed_data: ocrData ? { ...ocrData.parsed_fields, raw_text: ocrData.raw_text } : undefined,
        uploaded_files: uploadedFileUrl ? [uploadedFileUrl] : [],
        latitude: locationCoords?.lat,
        longitude: locationCoords?.lng,
      };

      if (isOnline) {
        try {
          const response = await api.post<ReceiptResponse>("/submission", submission);
          // Pass priority data to receipt page via state
          navigate(`/receipt/${response.data.receipt_id}`, {
            state: {
              priorityData,
              joinedSubmissionId
            }
          });
        } catch (error) {
          console.error("Submission error:", error);
          await saveToOfflineQueue(submission, selectedFile);
          alert("Saved to offline queue. Will sync when online.");
        }
      } else {
        await saveToOfflineQueue(submission, selectedFile);
        alert("Saved to offline queue. Will sync when online.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getIssueLabel = (issue: typeof ISSUE_TYPES[0]) => {
    if (lang === "hi") return issue.labelHi;
    if (lang === "ta") return issue.labelTa;
    return issue.label;
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      {/* Status Badge */}
      <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
        <span className="status-dot"></span>
        {isOnline ? 'Online' : 'Offline Mode'}
      </div>

      {/* Progress Steps */}
      <div className="step-indicator">
        <div className={`step-dot ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}></div>
        <div className={`step-dot ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}></div>
        <div className={`step-dot ${step >= 3 ? 'active' : ''}`}></div>
      </div>

      <div className="max-w-4xl mx-auto animate-slide-up">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center justify-center gap-2 animate-pulse">
            <span className="text-xl">⚠️</span>
            <span className="text-yellow-200 font-medium">
              {lang === "hi" ? "आप ऑफलाइन हैं - शिकायत सुरक्षित की जाएगी" : "You are offline - Report will be queued"}
            </span>
          </div>
        )}

        {/* Step 1: Select Issue Type */}
        {step === 1 && (
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-2">
              {lang === "hi" ? "समस्या का प्रकार चुनें" : lang === "ta" ? "பிரச்சனை வகையைத் தேர்ந்தெடுக்கவும்" : "Select Issue Type"}
            </h1>
            <p className="text-lg text-white/60 text-center mb-8">
              {lang === "hi" ? "अपनी शिकायत का प्रकार चुनें" : lang === "ta" ? "உங்கள் புகாரின் வகையைத் தேர்ந்தெடுக்கவும்" : "Choose the type of complaint you want to report"}
            </p>

            {/* MAGIC VOICE INPUT REMOVED - User Feedback: "Not necessary" */}
            <div className="mb-8"></div>

            {/* Voice Command for Issue Selection */}
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="glass-card p-4 flex flex-col items-center gap-2">
                <p className="text-white/70 text-sm mb-2">
                  {lang === "hi" ? "बोलकर चुनें (जैसे: 'पानी की समस्या')" : lang === "ta" ? "பேசி தேர்ந்தெடுக்கவும் (எ.கா: 'நீர் பிரச்சனை')" : "Or just say it (e.g. 'Water problem')"}
                </p>
                <VoiceInput
                  lang={lang}
                  onTranscript={(text) => {
                    const lower = text.toLowerCase();
                    // Basic Keyword Matching (Multilingual)
                    const waterKeywords = ['water', 'pani', 'neer', 'leak', 'supply', 'தண்ணீர்', 'நீர்', 'குழாய்', 'पानी', 'नल'];
                    const powerKeywords = ['electricity', 'power', 'bijli', 'current', 'light', 'மின்சாரம்', 'மின்', 'बिजली', 'करंट'];
                    const roadKeywords = ['road', 'pothole', 'sadak', 'gaddha', 'street', 'சாலை', 'குழி', 'सड़क', 'गड्ढा'];
                    const garbageKeywords = ['garbage', 'trash', 'kachra', 'waste', 'dustbin', 'குப்பை', 'கழிவு', 'कचरा', 'कूड़ा'];

                    let matchedId = null;
                    if (waterKeywords.some(w => lower.includes(w))) matchedId = 'water_outage';
                    else if (powerKeywords.some(w => lower.includes(w))) matchedId = 'electricity_outage';
                    else if (roadKeywords.some(w => lower.includes(w))) matchedId = 'road';
                    else if (garbageKeywords.some(w => lower.includes(w))) matchedId = 'garbage';

                    if (matchedId) {
                      setIntent(matchedId);
                      setStep(2);
                      setText(text); // Pre-fill description with spoken text
                    } else {
                      alert("Could not detect issue type. Please try again or tap an icon.");
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
              {ISSUE_TYPES.map((issue) => (
                <button
                  key={issue.id}
                  onClick={() => {
                    setIntent(issue.id);
                    setStep(2);
                  }}
                  className={`issue-card ${intent === issue.id ? 'selected' : ''}`}
                >
                  <div className="icon">{issue.icon}</div>
                  <div className="label">{getIssueLabel(issue)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Upload Photo & Details */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setStep(1)}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <span className="text-white text-xl">←</span>
              </button>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {lang === "hi" ? "विवरण जोड़ें" : lang === "ta" ? "விவரங்களைச் சேர்க்கவும்" : "Add Details"}
              </h1>
            </div>

            {/* Selected Issue Badge */}
            <div className="glass-card p-4 mb-6 inline-flex items-center gap-3">
              <span className="text-2xl">{ISSUE_TYPES.find(i => i.id === intent)?.icon}</span>
              <span className="text-white font-medium">
                {getIssueLabel(ISSUE_TYPES.find(i => i.id === intent)!)}
              </span>
            </div>

            {/* Photo Upload - Hidden in Voice Mode */}
            {initialMode !== 'voice' && (
              <PhotoUpload
                lang={lang}
                onOCRComplete={(data) => {
                  setOcrData(data);
                  if (data.parsed_fields?.amount) {
                    setText(`Bill amount: ${data.parsed_fields.amount}`);
                  }
                }}
                onUploadComplete={(url) => setUploadedFileUrl(url)}
                onFileSelect={(file) => {
                  setSelectedFile(file);
                  const reader = new FileReader();
                  reader.onload = (e) => setPreview(e.target?.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            )}

            {/* OCR Fields Display */}
            {ocrData?.parsed_fields && Object.keys(ocrData.parsed_fields).length > 0 && (
              <div className="glass-card p-4 mb-6">
                <h3 className="text-white font-medium mb-3">📋 Extracted Information:</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(ocrData.parsed_fields).map(([key, value]) => (
                    <div key={key} className="bg-white/5 p-3 rounded-lg">
                      <span className="text-white/50 text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                      <p className="text-white font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description with Voice Input */}
            <div className="mb-6">
              <label className="block text-white/80 text-lg mb-3 font-medium">
                ✏️ {lang === "hi" ? "समस्या का विवरण" : lang === "ta" ? "பிரச்சனை விவரம்" : "Describe Your Issue"}
              </label>
              <div className="flex gap-4">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={lang === "hi" ? "अपनी शिकायत का विवरण लिखें..." : lang === "ta" ? "உங்கள் புகாரை விவரிக்கவும்..." : "Describe your complaint in detail..."}
                  className="input-premium flex-1 min-h-[150px] resize-none"
                />

                {/* Voice Input - Hidden in Photo Mode */}
                {initialMode !== 'photo' && (
                  <div className="flex flex-col items-center justify-center">
                    <VoiceInput
                      onTranscript={handleVoiceTranscript}
                      lang={lang}
                    />
                  </div>
                )}
              </div>

              {/* AI Analysis Indicator */}
              {aiChecking && (
                <div className="flex items-center gap-2 mt-2 text-blue-300 animate-pulse">
                  <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                  <span className="text-sm font-medium">
                    🤖 {lang === "hi" ? "AI विश्लेषण कर रहा है..." : "AI Analyzing..."}
                  </span>
                </div>
              )}
            </div>

            {/* Smart Tips */}
            {intent && (
              <SmartTips
                intent={intent}
                onSolved={handleIssueSolved}
                lang={lang}
              />
            )}

            {/* Continue Button */}
            <button
              onClick={async () => {
                if (!text.trim()) return;

                setAiChecking(true);
                try {
                  // Check for duplicates before moving to step 3
                  const lat = locationCoords?.lat;
                  const lng = locationCoords?.lng;

                  const res = await api.post('/submission/check-duplicate', {
                    text,
                    latitude: lat,
                    longitude: lng,
                    intent
                  });

                  if (res.data.is_duplicate) {
                    setDuplicateData(res.data);
                    setShowDuplicateAlert(true);
                  } else {
                    setStep(3);
                  }
                } catch (e) {
                  console.error("Duplicate check failed", e);
                  setStep(3); // Proceed on error
                } finally {
                  setAiChecking(false);
                }
              }}
              disabled={!text.trim() || aiChecking}
              className="btn-primary w-full py-6 text-xl disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {aiChecking ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  Checking...
                </>
              ) : (
                lang === "hi" ? "आगे बढ़ें" : lang === "ta" ? "தொடரவும்" : "Continue →"
              )}
            </button>

            {/* Duplicate Modal */}
            <DuplicateAlert
              isOpen={showDuplicateAlert && !!duplicateData}
              onClose={() => {
                setShowDuplicateAlert(false);
                setStep(3);
              }}
              onConfirm={() => {
                setShowDuplicateAlert(false);
                navigate('/'); // Go back home
              }}
              matchData={duplicateData}
            />
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setStep(2)}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <span className="text-white text-xl">←</span>
              </button>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {lang === "hi" ? "समीक्षा करें और सबमिट करें" : lang === "ta" ? "மதிப்பாய்வு செய்து சமர்ப்பிக்கவும்" : "Review & Submit"}
              </h1>
            </div>

            {/* AI Loading State */}
            {aiChecking && (
              <div className="glass-card p-4 mb-6 flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-blue-300">🤖 Analyzing your complaint...</span>
              </div>
            )}

            {/* Duplicate Alert */}
            {duplicateData?.is_duplicate && showDuplicateAlert && (
              <DuplicateAlert
                isOpen={showDuplicateAlert}
                onClose={handleContinueNew}
                onConfirm={() => duplicateData.similar_submission_id && handleJoinDuplicate(duplicateData.similar_submission_id)}
                matchData={duplicateData}
              />
            )}

            {/* Intent Mismatch Suggestion */}
            {intentData && !intentData.matches_selection && intentData.suggested_change && (
              <IntentSuggestion
                detectedIntent={intentData.detected_intent}
                selectedIntent={intent}
                confidence={intentData.confidence}
                message={intentData.message || ""}
                onSwitch={handleIntentSwitch}
                onKeep={handleIntentKeep}
                lang={lang}
              />
            )}

            {/* Priority Badge */}
            {priorityData && (
              <div className="glass-card p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-white/60">Priority:</span>
                  <PriorityBadge
                    level={priorityData.level}
                    score={priorityData.score}
                    estimatedResponse={priorityData.estimated_response}
                    confidence={priorityData.confidence}
                    showDetails={true}
                  />
                </div>
              </div>
            )}

            {/* Joined Cluster Info */}
            {joinedSubmissionId && (
              <div className="glass-card p-4 mb-6 bg-green-500/10 border-2 border-green-400/30">
                <p className="text-green-300 flex items-center gap-2">
                  ✅ You're joining complaint #{joinedSubmissionId}. Your voice adds weight!
                </p>
              </div>
            )}

            {/* Summary Card */}
            <div className="glass-card-light p-6 mb-6">
              <div className="flex items-start gap-4 mb-4">
                <span className="text-4xl">{ISSUE_TYPES.find(i => i.id === intent)?.icon}</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {getIssueLabel(ISSUE_TYPES.find(i => i.id === intent)!)}
                  </h2>
                  <p className="text-gray-600 mt-2">{text}</p>
                </div>
              </div>

              {preview && (
                <div className="mt-4 p-4 bg-gray-100 rounded-xl">
                  <img src={preview} alt="Attached" className="max-h-32 rounded-lg" />
                  <span className="text-sm text-gray-500 mt-2 block">📎 Photo attached</span>
                </div>
              )}
            </div>

            {/* Offline Warning */}
            {!isOnline && (
              <div className="glass-card p-4 mb-6 border-l-4 border-yellow-500">
                <p className="text-yellow-400 flex items-center gap-2">
                  ⚠️ {lang === "hi" ? "आप ऑफलाइन हैं। शिकायत बाद में सिंक होगी।" : "You're offline. Complaint will sync later."}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting || aiChecking}
              className="btn-success w-full py-8 text-2xl font-bold animate-pulse-glow disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {lang === "hi" ? "सबमिट हो रहा है..." : "Submitting..."}
                </span>
              ) : (
                <span>
                  ✓ {lang === "hi" ? "शिकायत दर्ज करें" : lang === "ta" ? "புகாரை சமர்ப்பிக்கவும்" : "Submit Complaint"}
                </span>
              )}
            </button>

            <p className="text-white/50 text-center mt-4 text-sm">
              {lang === "hi" ? "आपको एक रसीद मिलेगी" : "You will receive a receipt with QR code"}
            </p>
          </div>
        )}
      </div>
    </div >
  );
}
