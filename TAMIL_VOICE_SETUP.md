# Tamil Voice Setup Guide

The Tamil AI voice feature uses your browser's built-in text-to-speech (TTS) engine. If Tamil voice is not speaking, it means your system doesn't have Tamil language support installed.

## Solution: Install Tamil Language Support

### For Windows 10/11:

1. **Open Settings** (Windows key + I)
2. Go to **Time & Language** → **Language & Region**
3. Click **Add a language**
4. Search for "Tamil" (தமிழ்)
5. Select **Tamil (India)** or **Tamil (Singapore)**
6. Click **Next** and then **Install**
7. Wait for the language pack to download and install
8. **Important**: Check the box for "Text-to-speech" during installation

### For Android/Chrome:

1. Open **Settings**
2. Go to **System** → **Languages & input**
3. Tap **Text-to-speech output**
4. Tap the settings icon next to your TTS engine (usually Google Text-to-speech)
5. Tap **Install voice data**
6. Find and download **Tamil (India)** voice

### For iOS/Safari:

1. Open **Settings**
2. Go to **Accessibility** → **Spoken Content**
3. Tap **Voices**
4. Download **Tamil** voice pack

### For Linux:

Install eSpeak or Festival Tamil voice:
```bash
# For eSpeak
sudo apt-get install espeak-ng-data-ta

# For Festival
sudo apt-get install festvox-ta
```

## Testing the Voice

After installation:

1. **Restart your browser** (important!)
2. Open the developer console (F12)
3. You should see logs like: `Using voice: Tamil (ta-IN)`
4. If you still see warnings about "No voice found", try:
   - Refreshing the page
   - Clearing browser cache
   - Trying a different browser (Chrome/Edge usually have better TTS support)

## Troubleshooting

### Voice still not working?

1. **Check browser console** (F12) for error messages
2. The app will show available voices in the console: `Available voices: ...`
3. Make sure at least one voice shows `(ta-IN)` or `(ta-XX)`

### Alternative: Use Hindi or English

If you can't install Tamil support right now, the app fully supports:
- English (en) - Usually pre-installed on all systems
- Hindi (hi-IN) - Often pre-installed on Indian systems

## Technical Details

The app uses the **Web Speech API** which depends on:
- **Windows**: Windows OneCore voices
- **Android**: Google Text-to-speech
- **iOS**: Apple's Siri voices
- **Linux**: eSpeak/Festival

The improved code now:
✅ Detects available voices
✅ Shows helpful error messages if Tamil voice is missing
✅ Logs voice selection in browser console for debugging
✅ Provides fallback detection for partial language matches
