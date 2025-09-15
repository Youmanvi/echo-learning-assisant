/**
 * Background Service Worker for Echo Chrome Extension
 * Handles storage, messaging, and scheduled reviews
 */

class EchoBackgroundService {
    constructor() {
        this.storageKey = 'echo_video_library';
        this.srsKey = 'echo_srs_data';
        this.init();
    }

    /**
     * Initialize the background service
     */
    init() {
        this.setupMessageListener();
        this.setupAlarmListener();
        this.setupInstallListener();
    }

    /**
     * Setup message listener for communication with content scripts and popup
     */
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });
    }

    /**
     * Handle incoming messages
     */
    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'addVideo':
                    await this.addVideoToLibrary(request.data);
                    sendResponse({ success: true });
                    break;

                case 'getVideos':
                    const videos = await this.getVideoLibrary();
                    sendResponse({ success: true, data: videos });
                    break;

                case 'removeVideo':
                    await this.removeVideoFromLibrary(request.videoId);
                    sendResponse({ success: true });
                    break;

                case 'updateVideo':
                    await this.updateVideoInLibrary(request.videoId, request.data);
                    sendResponse({ success: true });
                    break;

                case 'getTranscript':
                    const transcriptData = await this.getTranscriptFromContentScript(sender.tab.id);
                    sendResponse({ success: true, data: transcriptData });
                    break;

                case 'scheduleReview':
                    await this.scheduleVideoReview(request.videoId, request.reviewDate);
                    sendResponse({ success: true });
                    break;

                case 'getSRSData':
                    const srsData = await this.getSRSData();
                    sendResponse({ success: true, data: srsData });
                    break;

                case 'updateSRSData':
                    await this.updateSRSData(request.videoId, request.data);
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Add video to the library
     */
    async addVideoToLibrary(videoData) {
        try {
            const library = await this.getVideoLibrary();
            
            // Check if video already exists
            const existingIndex = library.findIndex(video => video.videoId === videoData.videoId);
            
            if (existingIndex >= 0) {
                // Update existing video
                library[existingIndex] = { ...library[existingIndex], ...videoData };
            } else {
                // Add new video
                library.push({
                    ...videoData,
                    id: this.generateVideoId(),
                    studyCount: 0,
                    lastStudied: null,
                    difficulty: 'medium',
                    tags: [],
                    notes: ''
                });
            }

            await this.saveVideoLibrary(library);
            console.log('Video added to library:', videoData.title);
        } catch (error) {
            console.error('Error adding video to library:', error);
            throw error;
        }
    }

    /**
     * Get the video library
     */
    async getVideoLibrary() {
        try {
            const result = await chrome.storage.local.get([this.storageKey]);
            return result[this.storageKey] || [];
        } catch (error) {
            console.error('Error getting video library:', error);
            return [];
        }
    }

    /**
     * Save the video library
     */
    async saveVideoLibrary(library) {
        try {
            await chrome.storage.local.set({ [this.storageKey]: library });
        } catch (error) {
            console.error('Error saving video library:', error);
            throw error;
        }
    }

    /**
     * Remove video from library
     */
    async removeVideoFromLibrary(videoId) {
        try {
            const library = await this.getVideoLibrary();
            const filteredLibrary = library.filter(video => video.videoId !== videoId);
            await this.saveVideoLibrary(filteredLibrary);
            
            // Also remove any scheduled reviews
            await this.cancelVideoReview(videoId);
        } catch (error) {
            console.error('Error removing video from library:', error);
            throw error;
        }
    }

    /**
     * Update video in library
     */
    async updateVideoInLibrary(videoId, updateData) {
        try {
            const library = await this.getVideoLibrary();
            const videoIndex = library.findIndex(video => video.videoId === videoId);
            
            if (videoIndex >= 0) {
                library[videoIndex] = { ...library[videoIndex], ...updateData };
                await this.saveVideoLibrary(library);
            }
        } catch (error) {
            console.error('Error updating video in library:', error);
            throw error;
        }
    }

    /**
     * Get transcript from content script
     */
    async getTranscriptFromContentScript(tabId) {
        try {
            const response = await chrome.tabs.sendMessage(tabId, { action: 'getTranscript' });
            return response.data;
        } catch (error) {
            console.error('Error getting transcript from content script:', error);
            throw error;
        }
    }

    /**
     * Schedule a video review using Spaced Repetition System
     */
    async scheduleVideoReview(videoId, reviewDate) {
        try {
            const alarmName = `echo_review_${videoId}`;
            
            // Cancel existing alarm if any
            await chrome.alarms.clear(alarmName);
            
            // Create new alarm
            await chrome.alarms.create(alarmName, {
                when: reviewDate.getTime()
            });

            // Update SRS data
            const srsData = await this.getSRSData();
            srsData[videoId] = {
                nextReview: reviewDate.getTime(),
                interval: this.calculateNextInterval(srsData[videoId]?.interval || 1),
                easeFactor: srsData[videoId]?.easeFactor || 2.5,
                repetitions: (srsData[videoId]?.repetitions || 0) + 1
            };
            await this.saveSRSData(srsData);

            console.log(`Scheduled review for video ${videoId} at ${reviewDate}`);
        } catch (error) {
            console.error('Error scheduling video review:', error);
            throw error;
        }
    }

    /**
     * Cancel a scheduled video review
     */
    async cancelVideoReview(videoId) {
        try {
            const alarmName = `echo_review_${videoId}`;
            await chrome.alarms.clear(alarmName);
            
            // Remove from SRS data
            const srsData = await this.getSRSData();
            delete srsData[videoId];
            await this.saveSRSData(srsData);
        } catch (error) {
            console.error('Error canceling video review:', error);
        }
    }

    /**
     * Calculate next interval for spaced repetition
     */
    calculateNextInterval(currentInterval) {
        // Simple spaced repetition algorithm
        if (currentInterval === 1) return 1; // 1 day
        if (currentInterval === 1) return 6; // 6 days
        return Math.min(currentInterval * 2, 30); // Max 30 days
    }

    /**
     * Get SRS data
     */
    async getSRSData() {
        try {
            const result = await chrome.storage.local.get([this.srsKey]);
            return result[this.srsKey] || {};
        } catch (error) {
            console.error('Error getting SRS data:', error);
            return {};
        }
    }

    /**
     * Save SRS data
     */
    async saveSRSData(srsData) {
        try {
            await chrome.storage.local.set({ [this.srsKey]: srsData });
        } catch (error) {
            console.error('Error saving SRS data:', error);
            throw error;
        }
    }

    /**
     * Update SRS data for a specific video
     */
    async updateSRSData(videoId, data) {
        try {
            const srsData = await this.getSRSData();
            srsData[videoId] = { ...srsData[videoId], ...data };
            await this.saveSRSData(srsData);
        } catch (error) {
            console.error('Error updating SRS data:', error);
            throw error;
        }
    }

    /**
     * Setup alarm listener for scheduled reviews
     */
    setupAlarmListener() {
        chrome.alarms.onAlarm.addListener(async (alarm) => {
            if (alarm.name.startsWith('echo_review_')) {
                await this.handleReviewAlarm(alarm);
            }
        });
    }

    /**
     * Handle review alarm
     */
    async handleReviewAlarm(alarm) {
        try {
            const videoId = alarm.name.replace('echo_review_', '');
            const library = await this.getVideoLibrary();
            const video = library.find(v => v.videoId === videoId);
            
            if (video) {
                // Create notification
                await chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'Echo - Time to Review!',
                    message: `It's time to review "${video.title}"`,
                    buttons: [
                        { title: 'Study Now' },
                        { title: 'Remind Later' }
                    ]
                });

                // Update last reviewed time
                await this.updateVideoInLibrary(videoId, {
                    lastReviewed: Date.now()
                });
            }
        } catch (error) {
            console.error('Error handling review alarm:', error);
        }
    }

    /**
     * Setup install listener
     */
    setupInstallListener() {
        chrome.runtime.onInstalled.addListener((details) => {
            if (details.reason === 'install') {
                console.log('Echo extension installed');
                this.initializeStorage();
            } else if (details.reason === 'update') {
                console.log('Echo extension updated');
            }
        });
    }

    /**
     * Initialize storage with default values
     */
    async initializeStorage() {
        try {
            const library = await this.getVideoLibrary();
            if (library.length === 0) {
                // Initialize with empty library
                await this.saveVideoLibrary([]);
            }

            const srsData = await this.getSRSData();
            if (Object.keys(srsData).length === 0) {
                // Initialize with empty SRS data
                await this.saveSRSData({});
            }
        } catch (error) {
            console.error('Error initializing storage:', error);
        }
    }

    /**
     * Generate unique video ID
     */
    generateVideoId() {
        return 'video_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Handle notification clicks
     */
    setupNotificationListener() {
        chrome.notifications.onClicked.addListener((notificationId) => {
            // Handle notification click
            chrome.notifications.clear(notificationId);
        });

        chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
            if (buttonIndex === 0) {
                // "Study Now" button clicked
                chrome.tabs.create({ url: 'popup.html' });
            } else if (buttonIndex === 1) {
                // "Remind Later" button clicked
                // Reschedule for 1 hour later
                const videoId = notificationId.replace('echo_review_', '');
                const laterDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
                this.scheduleVideoReview(videoId, laterDate);
            }
            chrome.notifications.clear(notificationId);
        });
    }
}

// Initialize the background service
const echoBackgroundService = new EchoBackgroundService();

