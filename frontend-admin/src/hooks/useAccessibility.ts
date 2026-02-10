import { useEffect, useCallback, useState } from 'react';

interface AccessibilitySettings {
    highContrast: boolean;
    largeFont: boolean;
    reducedMotion: boolean;
}

interface UseAccessibilityOptions {
    onClustering?: () => void;
    onDispatch?: () => void;
    onSettings?: () => void;
    onHelp?: () => void;
}

/**
 * Hook for accessibility features and keyboard shortcuts
 * - C: Run clustering
 * - D: Open dispatch
 * - S: Open settings
 * - ?: Show help overlay
 * - Esc: Close modals
 */
export function useAccessibility(options: UseAccessibilityOptions = {}) {
    const [showKeyboardOverlay, setShowKeyboardOverlay] = useState(false);
    const [settings, setSettings] = useState<AccessibilitySettings>(() => {
        if (typeof window === 'undefined') {
            return { highContrast: false, largeFont: false, reducedMotion: false };
        }
        const saved = localStorage.getItem('accessibility_settings');
        return saved
            ? JSON.parse(saved)
            : { highContrast: false, largeFont: false, reducedMotion: false };
    });

    // Apply settings to document
    useEffect(() => {
        if (typeof document === 'undefined') return;

        document.documentElement.setAttribute(
            'data-high-contrast',
            settings.highContrast.toString()
        );
        document.documentElement.setAttribute(
            'data-large-font',
            settings.largeFont.toString()
        );
        document.documentElement.setAttribute(
            'data-reduced-motion',
            settings.reducedMotion.toString()
        );
    }, [settings]);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs
            if (
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement ||
                event.target instanceof HTMLSelectElement
            ) {
                return;
            }

            // Also ignore if modifier keys are pressed (except for ?)
            if (event.ctrlKey || event.altKey || event.metaKey) {
                return;
            }

            switch (event.key.toLowerCase()) {
                case 'c':
                    event.preventDefault();
                    options.onClustering?.();
                    break;
                case 'd':
                    event.preventDefault();
                    options.onDispatch?.();
                    break;
                case 's':
                    event.preventDefault();
                    options.onSettings?.();
                    break;
                case '?':
                    event.preventDefault();
                    setShowKeyboardOverlay((prev) => !prev);
                    options.onHelp?.();
                    break;
                case 'escape':
                    setShowKeyboardOverlay(false);
                    break;
            }
        },
        [options]
    );

    // Register keyboard listener
    useEffect(() => {
        if (typeof window === 'undefined') return;

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Update a single setting
    const updateSetting = useCallback(
        (key: keyof AccessibilitySettings, value: boolean) => {
            setSettings((prev) => {
                const next = { ...prev, [key]: value };
                localStorage.setItem('accessibility_settings', JSON.stringify(next));
                return next;
            });
        },
        []
    );

    // Toggle a setting
    const toggleSetting = useCallback((key: keyof AccessibilitySettings) => {
        setSettings((prev) => {
            const next = { ...prev, [key]: !prev[key] };
            localStorage.setItem('accessibility_settings', JSON.stringify(next));
            return next;
        });
    }, []);

    // Announce message via screen reader
    const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        if (typeof document === 'undefined') return;

        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', priority);
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);

        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }, []);

    // Text-to-speech helper
    const speak = useCallback((text: string, lang: 'en' | 'hi' | 'kn' = 'en') => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'kn' ? 'kn-IN' : 'en-US';
        window.speechSynthesis.speak(utterance);
    }, []);

    return {
        settings,
        updateSetting,
        toggleSetting,
        showKeyboardOverlay,
        setShowKeyboardOverlay,
        announce,
        speak,
    };
}

export default useAccessibility;
