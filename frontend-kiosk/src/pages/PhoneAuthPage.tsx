import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Language } from "../types";
import api from "../utils/api";
import { speak, stopSpeaking } from "../utils/tts";

// Check for demo mode
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export default function PhoneAuthPage() {
  const location = useLocation();
  const initialLang = (location.state as { lang?: Language })?.lang
    || (sessionStorage.getItem("selectedLanguage") as Language)
    || "en";
  const [lang] = useState<Language>(initialLang);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(DEMO_MODE ? "000000" : "");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const navigate = useNavigate();

  // Voice guidance
  useEffect(() => {
    stopSpeaking(); // clear previous

    const timer = setTimeout(() => {
      if (step === "phone") {
        const texts: Record<string, string> = {
          en: "Please enter your mobile number",
          hi: "कृपया अपना मोबाइल नंबर दर्ज करें",
          ta: "தயவுசெய்து உங்கள் மொபைல் எண்ணை உள்ளிடவும்"
        };
        speak(texts[lang] || texts.en, lang);
      } else {
        const texts: Record<string, string> = {
          en: "Please enter the verification code sent to your mobile",
          hi: "कृपया अपने मोबाइल पर भेजा गया सत्यापन कोड दर्ज करें",
          ta: "உங்கள் மொபைலுக்கு அனுப்பப்பட்ட சரிபார்ப்புக் குறியீட்டை உள்ளிடவும்"
        };
        speak(texts[lang] || texts.en, lang);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      stopSpeaking();
    };
  }, [step, lang]);

  const handleRequestOTP = async () => {
    if (!phone.trim()) {
      alert("Please enter phone number");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/request-otp", { phone });
      setStep("otp");
    } catch (error) {
      console.error("OTP request error:", error);
      alert("Failed to request OTP. Check if backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      alert("Please enter OTP");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/verify-otp", { phone, code: otp });
      localStorage.setItem("access_token", response.data.access_token);
      // Pass the preserved mode to SubmitPage
      const mode = (location.state as any)?.mode;
      navigate("/submit", { state: { lang, mode } });
    } catch (error) {
      console.error("OTP verify error:", error);
      alert("Invalid OTP. Use 000000 for demo bypass.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Back Button */}
        <button
          onClick={() => step === "otp" ? setStep("phone") : navigate("/")}
          className="mb-6 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <span className="text-white text-xl">← {lang === "hi" ? "वापस" : "Back"}</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl animate-float">
            <span className="text-5xl">{step === "phone" ? "📱" : "🔐"}</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {step === "phone"
              ? (lang === "hi" ? "फोन नंबर दर्ज करें" : lang === "ta" ? "தொலைபேசி எண்ணை உள்ளிடவும்" : "Enter Phone Number")
              : (lang === "hi" ? "OTP दर्ज करें" : lang === "ta" ? "OTP உள்ளிடவும்" : "Enter OTP")}
          </h1>
          <p className="text-white/60">
            {step === "phone"
              ? (lang === "hi" ? "हम आपको एक OTP भेजेंगे" : "We'll send you a verification code")
              : (lang === "hi" ? "अपने फोन पर भेजा गया कोड दर्ज करें" : "Enter the code sent to your phone")}
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8">
          {step === "phone" ? (
            <div className="space-y-6">
              <div>
                <label className="block text-white/80 text-sm mb-2 font-medium">
                  {lang === "hi" ? "मोबाइल नंबर" : lang === "ta" ? "மொபைல் எண்" : "Mobile Number"}
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center justify-center px-4 bg-white/10 border-2 border-white/20 rounded-xl text-white/70 text-lg font-medium whitespace-nowrap">
                    🇮🇳 +91
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="input-premium flex-1 text-2xl tracking-widest text-center"
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Consent Handling */}
              <div className="flex items-start gap-3 my-4 p-3 bg-white/5 rounded-lg border border-white/10">
                <input
                  type="checkbox"
                  id="consent"
                  className="mt-1 w-5 h-5 accent-blue-500"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <label htmlFor="consent" className="text-sm text-white/80 cursor-pointer">
                  {lang === "hi" ? "मैं अपनी जानकारी और स्थान साझा करने के लिए सहमत हूँ" :
                    lang === "ta" ? "எனது தகவல் மற்றும் இருப்பிடத்தைப் பகிர ஒப்புக்கொள்கிறேன்" :
                      "I agree to share my information and location for request processing"}
                </label>
              </div>

              <button
                onClick={handleRequestOTP}
                disabled={loading || !phone.trim() || !consent}
                className="btn-primary w-full py-5 text-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {lang === "hi" ? "भेज रहे हैं..." : "Sending..."}
                  </span>
                ) : (
                  <span>{lang === "hi" ? "OTP भेजें" : lang === "ta" ? "OTP அனுப்பவும்" : "Send OTP"}</span>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-white/80 text-sm mb-2 font-medium">
                  {lang === "hi" ? "6 अंकों का OTP" : "6-Digit OTP"}
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  maxLength={6}
                  className="input-premium text-center text-3xl tracking-[0.5em] font-mono"
                  autoFocus
                />
              </div>

              {/* Demo Hint / Auto-fill Badge */}
              {DEMO_MODE ? (
                <div className="p-4 bg-gradient-to-r from-emerald-500/30 to-green-500/30 rounded-xl border-2 border-emerald-400/50 animate-pulse">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">🎪</span>
                    <div className="text-center">
                      <p className="text-emerald-300 font-bold text-lg">DEMO MODE</p>
                      <p className="text-emerald-200 text-sm">OTP auto-filled • Click verify to continue</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                  <p className="text-blue-300 text-sm text-center">
                    💡 Demo: Use <span className="font-mono font-bold">000000</span> to bypass
                  </p>
                </div>
              )}

              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length < 6}
                className="btn-success w-full py-5 text-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {lang === "hi" ? "सत्यापित कर रहे हैं..." : "Verifying..."}
                  </span>
                ) : (
                  <span>✓ {lang === "hi" ? "सत्यापित करें" : lang === "ta" ? "சரிபார்க்கவும்" : "Verify & Continue"}</span>
                )}
              </button>

              <button
                onClick={() => setStep("phone")}
                className="w-full text-white/60 hover:text-white text-center py-2 transition-colors"
              >
                {lang === "hi" ? "नंबर बदलें" : "Change number"}
              </button>
            </div>
          )}
        </div>

        {/* Security Note */}
        <p className="text-white/40 text-center text-sm mt-6">
          🔒 {lang === "hi" ? "आपका डेटा सुरक्षित है" : "Your data is secure and encrypted"}
        </p>
      </div>
    </div >
  );
}
