# Echo - Personalized Learning Assistant

Echo is an AI-powered Chrome extension that helps you learn from YouTube videos by creating interactive study materials including quizzes, summaries, and flashcards.

## Features

- **Video Library**: Save YouTube videos to your personal learning library
- **AI-Generated Study Materials**: Automatically create summaries, key terms, and quizzes
- **Interactive Quizzes**: Test your knowledge with multiple-choice questions
- **Spaced Repetition System**: Schedule reviews for long-term retention
- **Transcript Highlighting**: Highlight important parts of video transcripts
- **Modern Dark UI**: Clean, modern interface optimized for learning

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The Echo icon should appear in your Chrome toolbar

## Usage

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

### Features Overview

- **Summary**: AI-generated comprehensive summary of the video content
- **Key Terms**: Important concepts and terminology extracted from the video
- **Quiz**: Interactive multiple-choice questions with explanations
- **Progress Tracking**: Track your study sessions and performance
- **Review Scheduling**: Set up spaced repetition for long-term retention

## Technical Details

- **Manifest Version**: V3 (latest Chrome extension standard)
- **APIs Used**: chrome.ai, chrome.storage.local, chrome.scripting, chrome.alarms, chrome.notifications
- **Frontend**: Vanilla JavaScript (ES6 modules), HTML5, CSS3
- **AI Integration**: Chrome's built-in AI API for content generation

## File Structure

```
echo-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Main UI interface
├── popup.css             # Styling for the popup
├── popup.js              # Frontend logic and UI interactions
├── content.js            # YouTube page interaction script
├── background.js         # Service worker for storage and messaging
├── ai.js                 # AI core module for study material generation
└── icons/                # Extension icons (placeholder paths)
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Development

The extension is built with modern web technologies and follows Chrome extension best practices:

- **Manifest V3**: Uses the latest Chrome extension standard
- **Service Worker**: Background script handles storage and messaging
- **Content Scripts**: Inject functionality into YouTube pages
- **AI Integration**: Leverages Chrome's AI API for intelligent content generation
- **Responsive Design**: Modern dark theme with smooth animations

## Privacy

Echo respects your privacy:
- All data is stored locally on your device
- No personal information is sent to external servers
- AI processing uses Chrome's built-in AI API
- You have full control over your learning data

## Contributing

This is a complete, functional Chrome extension. Feel free to modify and extend it for your specific learning needs.

## License

This project is open source and available under the MIT License.

