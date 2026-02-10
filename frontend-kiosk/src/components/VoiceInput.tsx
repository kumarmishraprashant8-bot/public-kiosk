import { useEffect } from "react";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    lang?: "en" | "hi" | "ta";
    disabled?: boolean;
}

const SPEECH_LANG_MAP: Record<string, string> = {
    en: "en-IN",
    hi: "hi-IN",
    ta: "ta-IN"
};

export default function VoiceInput({ onTranscript, lang = "en" }: VoiceInputProps) {
    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    // Handle transcript updates
    useEffect(() => {
        if (!listening && transcript) {
            handleDialogFlow(transcript);
        }
    }, [listening, transcript]);

    const handleDialogFlow = (text: string) => {
        // Direct pass-through mode (Smart Mode)
        // Instead of blocking the user locally, we send the FULL text to the parent.
        // The parent (SubmitPage) already has a powerful AI check that will run on this text.
        onTranscript(text);
    };

    const toggleListening = () => {
        if (listening) {
            SpeechRecognition.stopListening();
        } else {
            resetTranscript();
            // Enable continuous listening so it doesn't stop automatically
            SpeechRecognition.startListening({ continuous: true, language: SPEECH_LANG_MAP[lang] });
        }
    };

    if (!browserSupportsSpeechRecognition) return null;

    return (
        <div className="flex flex-col items-center gap-4">
            <button
                onClick={toggleListening}
                className={`voice-input-btn w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl ${listening
                    ? "bg-red-500 animate-pulse scale-110 shadow-red-500/50"
                    : "bg-blue-600 hover:bg-blue-500 hover:scale-105"
                    }`}
            >
                <span className="text-4xl">
                    {listening ? '⏹️' : '🎤'}
                </span>
            </button>


            <p className="text-white/80 font-medium text-lg">
                {listening ? (lang === "hi" ? "बात पूरी होने पर टैप करें" : "Tap to Stop") : (lang === "hi" ? "बोलने के लिए टैप करें" : "Tap to Speak")}
            </p>

            {transcript && (
                <div className="bg-black/40 px-4 py-2 rounded-lg max-w-xs text-center">
                    <p className="text-white/70 italic">"{transcript}"</p>
                </div>
            )}
        </div>
    );
}
