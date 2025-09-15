# Echo - Personalized Learning Assistant

Echo is an AI-powered Chrome extension that helps you learn from YouTube videos by creating interactive study materials including quizzes, summaries, and flashcards.

## 📁 Project Structure

```
echo-extension/
├── manifest.json                 # Extension configuration (Manifest V3)
├── README.md                    # This file
├── src/                         # Source code directory
│   ├── html/                    # HTML templates
│   │   └── popup.html          # Main popup interface
│   ├── css/                     # Stylesheets
│   │   └── popup.css           # Main stylesheet with dark theme
│   └── js/                      # JavaScript modules
│       ├── popup.js            # Frontend logic and UI interactions
│       ├── content.js          # YouTube page interaction script
│       ├── background.js       # Service worker for storage and messaging
│       └── ai.js              # AI core module for study material generation
└── assets/                      # Static assets
    └── icons/                  # Extension icons
        ├── icon16.png          # 16x16 icon
        ├── icon48.png          # 48x48 icon
        └── icon128.png         # 128x128 icon
```

## 🚀 Features

- **Video Library**: Save YouTube videos to your personal learning library
- **AI-Generated Study Materials**: Automatically create summaries, key terms, and quizzes
- **Interactive Quizzes**: Test your knowledge with multiple-choice questions
- **Spaced Repetition System**: Schedule reviews for long-term retention
- **Transcript Highlighting**: Highlight important parts of video transcripts
- **Modern Dark UI**: Clean, modern interface optimized for learning

## 🛠️ Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The Echo icon should appear in your Chrome toolbar

## 📖 Usage

### Adding Videos to Your Library

1. Visit any YouTube video page
2. Look for the "📚 Add to Echo Library" button in the video's action menu
3. Click the button to add the video to your learning library

### Studying with Echo

1. Click the Echo extension icon in your toolbar
2. Select a video from your library
3. Click "Study Now" to generate AI-powered study materials
4. Review the summary and key terms
5. Take the interactive quiz to test your knowledge
6. Schedule reviews for spaced repetition learning

## 🔧 Technical Details

- **Manifest Version**: V3 (latest Chrome extension standard)
- **APIs Used**: chrome.ai, chrome.storage.local, chrome.scripting, chrome.alarms, chrome.notifications
- **Frontend**: Vanilla JavaScript (ES6 modules), HTML5, CSS3
- **AI Integration**: Chrome's built-in AI API for content generation

## 🔒 Privacy

Echo respects your privacy:
- All data is stored locally on your device
- No personal information is sent to external servers
- AI processing uses Chrome's built-in AI API
- You have full control over your learning data

## 📄 License

This project is open source and available under the MIT License.