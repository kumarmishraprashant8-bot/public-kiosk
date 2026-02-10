import { useState, useEffect } from 'react';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

interface AccessibilitySettings {
    highContrast: boolean;
    largeFont: boolean;
    reducedMotion: boolean;
    language: 'en' | 'hi' | 'kn';
}

const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
];

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
    const [settings, setSettings] = useState<AccessibilitySettings>(() => {
        const saved = localStorage.getItem('accessibility_settings');
        return saved
            ? JSON.parse(saved)
            : {
                highContrast: false,
                largeFont: false,
                reducedMotion: false,
                language: 'en',
            };
    });

    // Apply settings to document
    useEffect(() => {
        // High contrast
        document.documentElement.setAttribute(
            'data-high-contrast',
            settings.highContrast.toString()
        );

        // Large font
        document.documentElement.setAttribute(
            'data-large-font',
            settings.largeFont.toString()
        );

        // Reduced motion
        document.documentElement.setAttribute(
            'data-reduced-motion',
            settings.reducedMotion.toString()
        );

        // Save to localStorage
        localStorage.setItem('accessibility_settings', JSON.stringify(settings));
    }, [settings]);

    const handleToggle = (key: keyof AccessibilitySettings) => {
        if (typeof settings[key] === 'boolean') {
            setSettings(prev => ({
                ...prev,
                [key]: !prev[key],
            }));
        }
    };

    const handleLanguageChange = (lang: 'en' | 'hi' | 'kn') => {
        setSettings(prev => ({ ...prev, language: lang }));
    };

    const handleTTSTest = () => {
        if ('speechSynthesis' in window) {
            const msg = new SpeechSynthesisUtterance(
                'CivicPulse Admin Dashboard. Text to speech is working correctly.'
            );
            msg.lang = settings.language === 'hi' ? 'hi-IN' : settings.language === 'kn' ? 'kn-IN' : 'en-US';
            window.speechSynthesis.speak(msg);
        } else {
            alert('Text-to-speech is not supported in this browser.');
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="modal-overlay animate-fadeIn"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <div
                className="fixed inset-0 z-[1210] flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-title"
            >
                <div className="bg-slate-900 rounded-2xl shadow-drawer border border-slate-700 w-full max-w-lg max-h-[90vh] flex flex-col animate-slide-in-up overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                        <h2 id="settings-title" className="text-xl font-bold text-white">
                            ⚙️ Settings & Accessibility
                        </h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                            aria-label="Close settings"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="p-6 space-y-6 overflow-y-auto custom-scroll flex-1">
                        {/* Accessibility Section */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-1">
                                Accessibility
                            </h3>

                            {/* High Contrast */}
                            <label className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl mb-3 cursor-pointer hover:bg-slate-800 transition-colors group">
                                <div>
                                    <div className="font-semibold text-slate-100 group-hover:text-white transition-colors">High Contrast Mode</div>
                                    <div className="text-sm text-slate-400">
                                        Increase color contrast for better visibility
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.highContrast}
                                    onChange={() => handleToggle('highContrast')}
                                    className="w-5 h-5 rounded text-primary focus:ring-primary"
                                />
                            </label>

                            {/* Large Font */}
                            <label className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl mb-3 cursor-pointer hover:bg-slate-800 transition-colors group">
                                <div>
                                    <div className="font-semibold text-slate-100 group-hover:text-white transition-colors">Large Text</div>
                                    <div className="text-sm text-slate-400">
                                        Increase text size throughout the dashboard
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.largeFont}
                                    onChange={() => handleToggle('largeFont')}
                                    className="w-5 h-5 rounded text-primary focus:ring-primary"
                                />
                            </label>

                            {/* Reduced Motion */}
                            <label className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors group">
                                <div>
                                    <div className="font-semibold text-slate-100 group-hover:text-white transition-colors">Reduce Motion</div>
                                    <div className="text-sm text-slate-400">
                                        Minimize animations and transitions
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.reducedMotion}
                                    onChange={() => handleToggle('reducedMotion')}
                                    className="w-5 h-5 rounded text-primary focus:ring-primary"
                                />
                            </label>
                        </div>

                        {/* Language Section */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-1">
                                Language
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleLanguageChange(lang.code as 'en' | 'hi' | 'kn')}
                                        className={`p-3 rounded-xl border-2 font-semibold transition-all ${settings.language === lang.code
                                            ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10'
                                            : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                                            }`}
                                    >
                                        {lang.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Text to Speech */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-1">
                                Text to Speech
                            </h3>
                            <button
                                onClick={handleTTSTest}
                                className="btn btn-accent w-full py-3 shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-95"
                            >
                                🔊 Test Text-to-Speech
                            </button>
                            <p className="text-[10px] text-slate-500 mt-3 text-center leading-relaxed">
                                Uses Web Speech API for screen reader support and accessibility testing.
                            </p>
                        </div>

                        {/* Keyboard Shortcuts */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-1">
                                Keyboard Shortcuts
                            </h3>
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-300">Run Clustering Analysis</span>
                                    <kbd className="px-2 py-1 rounded bg-slate-700 text-slate-200 border border-slate-600 font-mono text-xs shadow-sm">C</kbd>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-300">Open Dispatch Modal</span>
                                    <kbd className="px-2 py-1 rounded bg-slate-700 text-slate-200 border border-slate-600 font-mono text-xs shadow-sm">D</kbd>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-300">Show Shortcuts Help</span>
                                    <kbd className="px-2 py-1 rounded bg-slate-700 text-slate-200 border border-slate-600 font-mono text-xs shadow-sm">?</kbd>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-300">Close Modal/Drawer</span>
                                    <kbd className="px-2 py-1 rounded bg-slate-700 text-slate-200 border border-slate-600 font-mono text-xs shadow-sm">Esc</kbd>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/50">
                        <button onClick={onClose} className="btn btn-primary w-full py-3 font-bold uppercase tracking-wider">
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
