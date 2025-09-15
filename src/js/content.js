/**
 * Content Script for Echo Chrome Extension
 * Handles interaction with YouTube watch pages
 */

class EchoContentScript {
    constructor() {
        this.videoId = this.extractVideoId();
        this.addToLibraryButton = null;
        this.transcriptData = null;
        this.highlights = [];
        
        this.init();
    }

    /**
     * Initialize the content script
     */
    init() {
        // Wait for YouTube to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    /**
     * Setup the content script after page load
     */
    setup() {
        this.injectAddToLibraryButton();
        this.setupMessageListener();
        this.setupTranscriptHighlighting();
    }

    /**
     * Extract video ID from current URL
     */
    extractVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v');
    }

    /**
     * Inject "Add to Echo Library" button into YouTube's action menu
     */
    injectAddToLibraryButton() {
        // Find YouTube's action menu (where Like, Share buttons are)
        const actionMenu = document.querySelector('#top-level-buttons-computed, #actions-inner');
        
        if (!actionMenu) {
            // Retry after a short delay if not found
            setTimeout(() => this.injectAddToLibraryButton(), 1000);
            return;
        }

        // Check if button already exists
        if (document.querySelector('#echo-add-button')) {
            return;
        }

        // Create the Echo button
        this.addToLibraryButton = document.createElement('button');
        this.addToLibraryButton.id = 'echo-add-button';
        this.addToLibraryButton.className = 'style-scope ytd-menu-renderer';
        this.addToLibraryButton.innerHTML = `
            <div class="style-scope ytd-menu-renderer">
                <span class="style-scope ytd-menu-renderer">📚 Add to Echo Library</span>
            </div>
        `;

        // Style the button
        this.addToLibraryButton.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 18px;
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            margin-left: 8px;
            transition: all 0.2s ease;
        `;

        // Add hover effect
        this.addToLibraryButton.addEventListener('mouseenter', () => {
            this.addToLibraryButton.style.transform = 'translateY(-1px)';
            this.addToLibraryButton.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        });

        this.addToLibraryButton.addEventListener('mouseleave', () => {
            this.addToLibraryButton.style.transform = 'translateY(0)';
            this.addToLibraryButton.style.boxShadow = 'none';
        });

        // Add click listener
        this.addToLibraryButton.addEventListener('click', () => this.handleAddToLibrary());

        // Insert the button
        actionMenu.appendChild(this.addToLibraryButton);
    }

    /**
     * Handle adding video to Echo library
     */
    async handleAddToLibrary() {
        try {
            // Extract video information
            const videoData = this.extractVideoData();
            
            if (!videoData) {
                this.showNotification('Error: Could not extract video information', 'error');
                return;
            }

            // Send message to background script
            const response = await this.sendMessageToBackground({
                action: 'addVideo',
                data: videoData
            });

            if (response.success) {
                this.showNotification('Video added to Echo Library!', 'success');
                this.updateButtonState('added');
            } else {
                this.showNotification('Error adding video to library', 'error');
            }
        } catch (error) {
            console.error('Error adding video to library:', error);
            this.showNotification('Error adding video to library', 'error');
        }
    }

    /**
     * Extract video data from the page
     */
    extractVideoData() {
        try {
            // Get video title
            const titleElement = document.querySelector('h1.title yt-formatted-string, h1.title');
            const title = titleElement ? titleElement.textContent.trim() : 'Unknown Title';

            // Get channel name
            const channelElement = document.querySelector('#owner-name a, #channel-name a, ytd-channel-name a');
            const channelName = channelElement ? channelElement.textContent.trim() : 'Unknown Channel';

            // Get video thumbnail
            const thumbnailElement = document.querySelector('video');
            const thumbnail = thumbnailElement ? 
                `https://img.youtube.com/vi/${this.videoId}/maxresdefault.jpg` : 
                '';

            return {
                videoId: this.videoId,
                title: title,
                channelName: channelName,
                thumbnail: thumbnail,
                url: window.location.href,
                addedAt: Date.now()
            };
        } catch (error) {
            console.error('Error extracting video data:', error);
            return null;
        }
    }

    /**
     * Update button state after adding to library
     */
    updateButtonState(state) {
        if (!this.addToLibraryButton) return;

        switch (state) {
            case 'added':
                this.addToLibraryButton.innerHTML = `
                    <div class="style-scope ytd-menu-renderer">
                        <span class="style-scope ytd-menu-renderer">✅ Added to Echo</span>
                    </div>
                `;
                this.addToLibraryButton.style.background = '#2d5a2d';
                this.addToLibraryButton.disabled = true;
                break;
            case 'loading':
                this.addToLibraryButton.innerHTML = `
                    <div class="style-scope ytd-menu-renderer">
                        <span class="style-scope ytd-menu-renderer">⏳ Adding...</span>
                    </div>
                `;
                this.addToLibraryButton.disabled = true;
                break;
        }
    }

    /**
     * Setup message listener for communication with popup/background
     */
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            switch (request.action) {
                case 'getTranscript':
                    this.handleGetTranscript().then(transcriptData => {
                        sendResponse({ success: true, data: transcriptData });
                    }).catch(error => {
                        sendResponse({ success: false, error: error.message });
                    });
                    return true; // Keep message channel open for async response

                case 'getHighlights':
                    sendResponse({ success: true, data: this.highlights });
                    break;

                case 'clearHighlights':
                    this.highlights = [];
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        });
    }

    /**
     * Handle transcript extraction request
     */
    async handleGetTranscript() {
        try {
            // Try to find and click the transcript button
            await this.openTranscript();
            
            // Wait for transcript to load
            await this.waitForTranscript();
            
            // Extract transcript data
            this.transcriptData = this.extractTranscriptData();
            
            return {
                transcript: this.transcriptData,
                highlights: this.highlights,
                videoId: this.videoId
            };
        } catch (error) {
            console.error('Error getting transcript:', error);
            throw error;
        }
    }

    /**
     * Open the transcript panel
     */
    async openTranscript() {
        // Look for transcript button
        const transcriptButton = document.querySelector('button[aria-label*="transcript" i], button[aria-label*="Transcript" i]');
        
        if (transcriptButton) {
            transcriptButton.click();
            return;
        }

        // Alternative: Look for "Show transcript" text
        const transcriptTextButton = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.toLowerCase().includes('transcript')
        );

        if (transcriptTextButton) {
            transcriptTextButton.click();
            return;
        }

        throw new Error('Transcript button not found');
    }

    /**
     * Wait for transcript to load
     */
    async waitForTranscript() {
        const maxWaitTime = 5000; // 5 seconds
        const checkInterval = 100; // 100ms
        let waited = 0;

        while (waited < maxWaitTime) {
            const transcriptContainer = document.querySelector('#segments-container, .ytd-transcript-segment-renderer');
            if (transcriptContainer) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }

        throw new Error('Transcript did not load within timeout');
    }

    /**
     * Extract transcript data from the page
     */
    extractTranscriptData() {
        const segments = [];
        const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer, .ytd-transcript-segment-renderer');

        transcriptSegments.forEach(segment => {
            const timeElement = segment.querySelector('.segment-timestamp, [role="button"]');
            const textElement = segment.querySelector('.segment-text, .ytd-transcript-segment-renderer');

            if (timeElement && textElement) {
                const timestamp = timeElement.textContent.trim();
                const text = textElement.textContent.trim();
                
                if (text) {
                    segments.push({
                        timestamp: timestamp,
                        text: text,
                        startTime: this.parseTimestamp(timestamp)
                    });
                }
            }
        });

        return segments;
    }

    /**
     * Parse timestamp string to seconds
     */
    parseTimestamp(timestamp) {
        const parts = timestamp.split(':').map(Number);
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    }

    /**
     * Setup transcript highlighting functionality
     */
    setupTranscriptHighlighting() {
        // This would be implemented to add highlight functionality
        // For now, we'll store highlights when they're manually added
        this.highlights = this.loadStoredHighlights();
    }

    /**
     * Load stored highlights from localStorage
     */
    loadStoredHighlights() {
        try {
            const stored = localStorage.getItem(`echo-highlights-${this.videoId}`);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading highlights:', error);
            return [];
        }
    }

    /**
     * Save highlights to localStorage
     */
    saveHighlights() {
        try {
            localStorage.setItem(`echo-highlights-${this.videoId}`, JSON.stringify(this.highlights));
        } catch (error) {
            console.error('Error saving highlights:', error);
        }
    }

    /**
     * Send message to background script
     */
    sendMessageToBackground(message) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, (response) => {
                resolve(response || { success: false, error: 'No response' });
            });
        });
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Create a temporary notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#2d5a2d' : type === 'error' ? '#5a2d2d' : '#333'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            max-width: 300px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Initialize the content script
const echoContentScript = new EchoContentScript();

