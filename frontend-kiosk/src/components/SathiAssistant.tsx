import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'sathi';
    timestamp: Date;
}

type LangCode = 'en' | 'hi' | 'ta';

const SATHI_RESPONSES: Record<string, Record<LangCode, string[]>> = {
    welcome: {
        en: ["Namaste! I am Sathi. How can I help you?", "Hello citizen! I'm here to assist you."],
        hi: ["नमस्ते! मैं साथी हूँ। मैं आपकी कैसे मदद कर सकता हूँ?", "नमस्कार नागरिक! आपकी सेवा में हाज़िर हूँ।"],
        ta: ["வணக்கம்! நான் சதி. உங்களுக்கு எப்படி உதவ முடியும்?", "வணக்கம் குடிமகளே!"]
    },
    water_outage: {
        en: ["I understand you have a water problem. Is it a supply cut?", "Water issues are priority. Location?"],
        hi: ["मुझे समझ आ रहा है कि पानी की समस्या है। क्या सप्लाई बंद है?", "पानी की समस्या प्राथमिकता है। स्थान बताएं?"],
        ta: ["தண்ணீர் பிரச்சனை என்று புரிகிறது. விநியோகம் நிறுத்தப்பட்டதா?", "தண்ணீர் பிரச்சனை முக்கியம். இடம் எங்கே?"]
    },
    electricity_outage: {
        en: ["Power cuts can be difficult. I'm noting this down.", "I see an electricity issue. Is it the whole street?"],
        hi: ["बिजली कटौती मुश्किल हो सकती है। मैं नोट कर रहा हूँ।", "क्या पूरी गली में बिजली नहीं है?"],
        ta: ["மின்வெட்டு கடினமாக இருக்கலாம். நான் குறிக்கிறேன்.", "தெரு முழுவதும் மின்சாரம் இல்லையா?"]
    },
    garbage: {
        en: ["I'll help you report this garbage issue. Where is it?", "Cleanliness is important. Please describe the location."],
        hi: ["कचरे की समस्या रिपोर्ट करने में मदद करूँगा। यह कहाँ है?", "सफाई जरूरी है। कृपया जगह बताएं।"],
        ta: ["குப்பை பிரச்சனையை புகாரளிக்க உதவுகிறேன். எங்கே இது?", "சுத்தமே முக்கியம். இடத்தை விவரிக்கவும்."]
    },
    road: {
        en: ["Potholes are dangerous. Is it on the main road?", "I'm noting this road damage. Is it blocking traffic?"],
        hi: ["गड्ढे खतरनाक हैं। क्या यह मुख्य सड़क पर है?", "सड़क की क्षति नोट कर ली है। क्या ट्रैफिक रुका है?"],
        ta: ["சாலை பள்ளங்கள் ஆபத்தானவை. இது பிரதான சாலையிலா?", " போக்குவரத்து தடைபடுகிறதா?"]
    },
    conversational: {
        en: ["I am an AI assistant here to help with civic issues.", "Please tell me about any water, power, or road issues."],
        hi: ["मैं एक AI असिस्टेंट हूँ, आपकी मदद के लिए।", "पानी, बिजली या सड़क की समस्या बताएं।"],
        ta: ["நான் ஒரு AI உதவியாளர்.", "தண்ணீர், மின்சாரம் அல்லது சாலை பிரச்சனைகளை கூறுங்கள்."]
    },
    default: {
        en: ["I'm listening. Please tell me more.", "Could you clarify? I want to help."],
        hi: ["मैं सुन रहा हूँ। कृपया और बताएं।", "क्या आप स्पष्ट कर सकते हैं? मैं मदद करना चाहता हूँ।"],
        ta: ["நான் கேட்கிறேன். மேலும் சொல்லுங்கள்.", "விளக்க முடியுமா? உதவ விரும்புகிறேன்."]
    }
};

const KEYWORDS: Record<string, string> = {
    // Water
    water: 'water_outage', leak: 'water_outage', supply: 'water_outage', pipe: 'water_outage',
    pani: 'water_outage', paani: 'water_outage', neer: 'water_outage', thannir: 'water_outage',
    // Electricity
    power: 'electricity_outage', light: 'electricity_outage', current: 'electricity_outage', shock: 'electricity_outage',
    bijli: 'electricity_outage', minsaram: 'electricity_outage',
    // Garbage
    garbage: 'garbage', waste: 'garbage', trash: 'garbage', clean: 'garbage', dustbin: 'garbage',
    kachra: 'garbage', kuppai: 'garbage',
    // Road
    road: 'road', pothole: 'road', street: 'road', repair: 'road', broken: 'road',
    sadak: 'road', salai: 'road', pallam: 'road',
    // Conversational
    hello: 'welcome', hi: 'welcome', namaste: 'welcome', vanakkam: 'welcome',
    help: 'conversational', madad: 'conversational', udavi: 'conversational'
};

export default function SathiAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [currentLang, setCurrentLang] = useState<LangCode>('en');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Initial welcome
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            addMessage('sathi', SATHI_RESPONSES.welcome[currentLang][0]);
        }
    }, [isOpen]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const addMessage = (sender: 'user' | 'sathi', text: string) => {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text,
            sender,
            timestamp: new Date()
        }]);
    };

    const handleSend = () => {
        if (!inputText.trim()) return;
        addMessage('user', inputText);
        processUserMessage(inputText);
        setInputText("");
    };

    const processUserMessage = (text: string) => {
        const lower = text.toLowerCase();
        let intent = 'default';

        if (lower.includes('report') || lower.includes('complaint')) {
            navigate('/report');
            setTimeout(() => addMessage('sathi', currentLang === 'hi' ? "रिपोर्ट फॉर्म खोल रहा हूँ।" : "Opening report form."), 500);
            return;
        }
        if (lower.includes('track') || lower.includes('status')) {
            navigate('/track');
            setTimeout(() => addMessage('sathi', currentLang === 'hi' ? "ट्रैकिंग पेज यहाँ है।" : "Here is the tracking page."), 500);
            return;
        }

        for (const [key, val] of Object.entries(KEYWORDS)) {
            if (lower.includes(key)) {
                intent = val;
                break;
            }
        }

        setTimeout(() => {
            const responses = SATHI_RESPONSES[intent]?.[currentLang] || SATHI_RESPONSES.default[currentLang];
            const response = responses[Math.floor(Math.random() * responses.length)];
            addMessage('sathi', response);

            // Polyglot TTS
            const utterance = new SpeechSynthesisUtterance(response);
            utterance.lang = currentLang === 'hi' ? 'hi-IN' : currentLang === 'ta' ? 'ta-IN' : 'en-IN';
            window.speechSynthesis.speak(utterance);
        }, 1000);
    };

    const toggleListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice input not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = currentLang === 'hi' ? 'hi-IN' : currentLang === 'ta' ? 'ta-IN' : 'en-IN';
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputText(transcript);
            setTimeout(() => {
                addMessage('user', transcript);
                processUserMessage(transcript);
                setInputText("");
            }, 500);
        };
        recognition.start();
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-50 border-4 border-white/20"
            >
                <span className="text-3xl">🤖</span>
                {!isOpen && (
                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping"></span>
                )}
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    {/* Header with Language Toggle */}
                    <div className="bg-blue-600/20 p-4 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">🤖</div>
                            <div>
                                <h3 className="font-bold text-white">Sathi Assistant</h3>
                                <div className="flex gap-2 mt-1">
                                    {(['en', 'hi', 'ta'] as LangCode[]).map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => setCurrentLang(lang)}
                                            className={`text-[10px] px-2 py-0.5 rounded-full border ${currentLang === lang
                                                    ? 'bg-blue-500 border-blue-400 text-white'
                                                    : 'border-white/20 text-white/60 hover:bg-white/10'
                                                }`}
                                        >
                                            {lang.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white">✕</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-800 text-white border border-white/10 rounded-bl-none'}`}>
                                    {msg.text}
                                    <div className="text-[10px] opacity-50 mt-1 text-right">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 bg-black/20 border-t border-white/10 flex gap-2">
                        <button onClick={toggleListening} className={`p-3 rounded-full transition-colors ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-800 hover:bg-gray-700'}`}>🎤</button>
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={currentLang === 'hi' ? "बोलें या टाइप करें..." : "Type or speak..."}
                            className="flex-1 bg-gray-800 border-none rounded-full px-4 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button onClick={handleSend} className="p-3 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-colors">➤</button>
                    </div>
                </div>
            )}
        </>
    );
}
