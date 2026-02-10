import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

export default function VoiceCommandFAB() {
    const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    // Hide on specific pages if needed
    if (location.pathname === '/submit' || location.pathname === '/phone' || location.pathname === '/kiosk' || location.pathname === '/') return null;
    if (!browserSupportsSpeechRecognition) return null;

    useEffect(() => {
        if (!listening && transcript) {
            handleCommand(transcript.toLowerCase());
        }
    }, [listening, transcript]);

    const handleCommand = (text: string) => {
        console.log("Voice Command:", text);
        if (text.includes('report') || text.includes('complaint') || text.includes('issue')) {
            navigate('/submit');
        } else if (text.includes('status') || text.includes('track')) {
            navigate('/track');
        } else if (text.includes('leaderboard') || text.includes('hero')) {
            navigate('/heroes');
        } else if (text.includes('home') || text.includes('cancel')) {
            navigate('/kiosk');
        }
        setIsOpen(false);
    };

    const toggleListening = () => {
        if (listening) {
            SpeechRecognition.stopListening();
            setIsOpen(false);
        } else {
            resetTranscript();
            SpeechRecognition.startListening({ continuous: false, language: 'en-IN' });
            setIsOpen(true);
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed bottom-24 right-6 z-[9990] bg-slate-900/90 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-2xl max-w-xs text-center"
                    >
                        <p className="text-slate-300 text-sm mb-2">Listening...</p>
                        <p className="text-white font-bold text-lg">"{transcript || 'Say: Report Pothole'}"</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleListening}
                className={`fixed bottom-6 right-6 z-[9991] w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${listening ? 'bg-red-500 animate-pulse ring-4 ring-red-500/30' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/50'
                    }`}
            >
                <span className="text-2xl">{listening ? '⏹️' : '🎙️'}</span>
            </motion.button>
        </>
    );
}
