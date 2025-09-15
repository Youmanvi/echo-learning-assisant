/**
 * Popup JavaScript for Echo Chrome Extension
 * Handles UI interactions and communication with background script
 */

class EchoPopup {
    constructor() {
        this.currentVideo = null;
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.selectedAnswer = null;
        this.quizScore = 0;
        
        this.init();
    }

    /**
     * Initialize the popup
     */
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEventListeners();
            this.loadVideoLibrary();
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Back to library button
        document.getElementById('back-to-library').addEventListener('click', () => {
            this.showLibraryView();
        });

        // Quiz navigation buttons
        document.getElementById('submit-answer').addEventListener('click', () => {
            this.submitAnswer();
        });

        document.getElementById('next-question').addEventListener('click', () => {
            this.nextQuestion();
        });

        document.getElementById('retake-quiz').addEventListener('click', () => {
            this.retakeQuiz();
        });

        document.getElementById('schedule-review').addEventListener('click', () => {
            this.scheduleReview();
        });

        // Footer buttons
        document.getElementById('settings-button').addEventListener('click', () => {
            this.showSettings();
        });

        document.getElementById('help-button').addEventListener('click', () => {
            this.showHelp();
        });
    }

    /**
     * Load and display the video library
     */
    async loadVideoLibrary() {
        try {
            this.showLoadingState();
            
            const response = await this.sendMessageToBackground({ action: 'getVideos' });
            
            if (response.success) {
                this.renderVideoLibrary(response.data);
                this.updateVideoCount(response.data.length);
            } else {
                this.showError('Failed to load video library');
            }
        } catch (error) {
            console.error('Error loading video library:', error);
            this.showError('Error loading video library');
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Render the video library
     */
    renderVideoLibrary(videos) {
        const videoList = document.getElementById('video-list');
        const emptyState = document.getElementById('empty-state');

        if (videos.length === 0) {
            videoList.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        videoList.style.display = 'block';
        emptyState.style.display = 'none';

        videoList.innerHTML = videos.map(video => this.createVideoItem(video)).join('');
    }

    /**
     * Create HTML for a video item
     */
    createVideoItem(video) {
        const lastStudied = video.lastStudied ? 
            new Date(video.lastStudied).toLocaleDateString() : 'Never';
        
        return `
            <div class="video-item" data-video-id="${video.videoId}">
                <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgdmlld0JveD0iMCAwIDQwMCAyMjUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjI1IiBmaWxsPSIjNDQ0Ii8+CjxwYXRoIGQ9Ik0xNzUgMTAwTDIyNSAxMjVMMTc1IDE1MFYxMDBaIiBmaWxsPSIjNjY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTkwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjODg4IiBmb250LXNpemU9IjE0Ij5Ob1RodW1ibmFpbDwvdGV4dD4KPC9zdmc+'">
                <h3 class="video-title">${this.escapeHtml(video.title)}</h3>
                <p class="video-channel">${this.escapeHtml(video.channelName)}</p>
                <div class="video-meta">
                    <span class="study-count">Studied ${video.studyCount || 0} times</span>
                    <span class="last-studied">Last: ${lastStudied}</span>
                </div>
                <button class="study-button" onclick="echoPopup.startStudySession('${video.videoId}')">
                    📚 Study Now
                </button>
            </div>
        `;
    }

    /**
     * Update video count display
     */
    updateVideoCount(count) {
        const countElement = document.getElementById('video-count');
        countElement.textContent = `${count} video${count !== 1 ? 's' : ''}`;
    }

    /**
     * Start a study session for a video
     */
    async startStudySession(videoId) {
        try {
            this.showLoadingState();
            
            // Get video data
            const videosResponse = await this.sendMessageToBackground({ action: 'getVideos' });
            if (!videosResponse.success) {
                throw new Error('Failed to get video data');
            }

            this.currentVideo = videosResponse.data.find(v => v.videoId === videoId);
            if (!this.currentVideo) {
                throw new Error('Video not found');
            }

            // Get transcript from content script
            const transcriptResponse = await this.sendMessageToBackground({ 
                action: 'getTranscript' 
            });
            
            if (!transcriptResponse.success) {
                throw new Error('Failed to get transcript. Make sure you\'re on a YouTube video page.');
            }

            // Generate study materials using AI
            const studyModule = await this.generateStudyModule(transcriptResponse.data);
            
            // Display the quiz
            this.displayQuiz(studyModule);
            
            // Update study count
            await this.updateVideoStudyCount(videoId);
            
        } catch (error) {
            console.error('Error starting study session:', error);
            this.showError(error.message);
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Generate study module using AI
     */
    async generateStudyModule(transcriptData) {
        try {
            const studyModule = await generateStudyModule(
                transcriptData.transcript,
                transcriptData.highlights || [],
                this.currentVideo.difficulty || 'medium'
            );
            
            return studyModule;
        } catch (error) {
            console.error('Error generating study module:', error);
            throw new Error('Failed to generate study materials');
        }
    }

    /**
     * Display the quiz interface
     */
    displayQuiz(studyModule) {
        this.currentQuiz = studyModule;
        this.currentQuestionIndex = 0;
        this.quizScore = 0;
        
        // Show quiz view
        this.showQuizView();
        
        // Display summary
        this.displaySummary(studyModule.summary);
        
        // Display key terms
        this.displayKeyTerms(studyModule.keyTerms);
        
        // Display first question
        this.displayQuestion(studyModule.quiz.questions[0]);
        
        // Update quiz title
        document.getElementById('quiz-title').textContent = 
            `Study Session: ${this.currentVideo.title}`;
    }

    /**
     * Display summary
     */
    displaySummary(summary) {
        const summaryContent = document.getElementById('summary-content');
        summaryContent.innerHTML = `<p>${this.escapeHtml(summary)}</p>`;
    }

    /**
     * Display key terms
     */
    displayKeyTerms(keyTerms) {
        const keyTermsContent = document.getElementById('key-terms-content');
        keyTermsContent.innerHTML = keyTerms.map(term => 
            `<span class="key-term">${this.escapeHtml(term)}</span>`
        ).join('');
    }

    /**
     * Display a quiz question
     */
    displayQuestion(question) {
        const questionText = document.getElementById('question-text');
        const optionsContainer = document.getElementById('options-container');
        const submitButton = document.getElementById('submit-answer');
        const feedbackContainer = document.getElementById('feedback-container');
        const quizComplete = document.getElementById('quiz-complete');
        
        // Hide feedback and complete sections
        feedbackContainer.classList.add('hidden');
        quizComplete.classList.add('hidden');
        
        // Update question text
        questionText.textContent = question.question;
        
        // Create options
        optionsContainer.innerHTML = question.options.map((option, index) => `
            <div class="option" data-index="${index}" onclick="echoPopup.selectOption(${index})">
                ${this.escapeHtml(option)}
            </div>
        `).join('');
        
        // Reset submit button
        submitButton.disabled = true;
        submitButton.textContent = 'Submit Answer';
        
        // Update progress
        this.updateQuizProgress();
        
        // Reset selected answer
        this.selectedAnswer = null;
    }

    /**
     * Select an option
     */
    selectOption(index) {
        // Remove previous selection
        document.querySelectorAll('.option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Select new option
        const selectedOption = document.querySelector(`[data-index="${index}"]`);
        selectedOption.classList.add('selected');
        
        this.selectedAnswer = index;
        
        // Enable submit button
        document.getElementById('submit-answer').disabled = false;
    }

    /**
     * Submit answer
     */
    submitAnswer() {
        if (this.selectedAnswer === null) return;
        
        const question = this.currentQuiz.quiz.questions[this.currentQuestionIndex];
        const isCorrect = this.selectedAnswer === question.correctAnswer;
        
        if (isCorrect) {
            this.quizScore++;
        }
        
        // Show feedback
        this.showFeedback(isCorrect, question.explanation);
        
        // Disable submit button
        document.getElementById('submit-answer').disabled = true;
    }

    /**
     * Show feedback for the answer
     */
    showFeedback(isCorrect, explanation) {
        const options = document.querySelectorAll('.option');
        const correctIndex = this.currentQuiz.quiz.questions[this.currentQuestionIndex].correctAnswer;
        
        // Highlight correct and incorrect answers
        options.forEach((option, index) => {
            if (index === correctIndex) {
                option.classList.add('correct');
            } else if (index === this.selectedAnswer && !isCorrect) {
                option.classList.add('incorrect');
            }
        });
        
        // Show feedback text
        const feedbackText = document.getElementById('feedback-text');
        feedbackText.innerHTML = `
            <strong>${isCorrect ? 'Correct!' : 'Incorrect'}</strong><br>
            ${this.escapeHtml(explanation)}
        `;
        
        // Show feedback container
        document.getElementById('feedback-container').classList.remove('hidden');
        
        // Update next button text
        const nextButton = document.getElementById('next-question');
        if (this.currentQuestionIndex === this.currentQuiz.quiz.questions.length - 1) {
            nextButton.textContent = 'Finish Quiz';
        } else {
            nextButton.textContent = 'Next Question';
        }
    }

    /**
     * Move to next question
     */
    nextQuestion() {
        if (this.currentQuestionIndex === this.currentQuiz.quiz.questions.length - 1) {
            this.finishQuiz();
        } else {
            this.currentQuestionIndex++;
            const nextQuestion = this.currentQuiz.quiz.questions[this.currentQuestionIndex];
            this.displayQuestion(nextQuestion);
        }
    }

    /**
     * Finish the quiz
     */
    finishQuiz() {
        const totalQuestions = this.currentQuiz.quiz.questions.length;
        const percentage = Math.round((this.quizScore / totalQuestions) * 100);
        
        // Hide feedback container
        document.getElementById('feedback-container').classList.add('hidden');
        
        // Show quiz complete
        const quizComplete = document.getElementById('quiz-complete');
        const finalScore = document.getElementById('final-score');
        
        finalScore.innerHTML = `
            <div class="score-display">
                <div class="score-number">${this.quizScore}/${totalQuestions}</div>
                <div class="score-percentage">${percentage}%</div>
            </div>
        `;
        
        quizComplete.classList.remove('hidden');
    }

    /**
     * Retake the quiz
     */
    retakeQuiz() {
        this.currentQuestionIndex = 0;
        this.quizScore = 0;
        this.displayQuestion(this.currentQuiz.quiz.questions[0]);
        document.getElementById('quiz-complete').classList.add('hidden');
    }

    /**
     * Schedule review for the video
     */
    async scheduleReview() {
        try {
            // Calculate next review date (1 day from now)
            const reviewDate = new Date();
            reviewDate.setDate(reviewDate.getDate() + 1);
            
            await this.sendMessageToBackground({
                action: 'scheduleReview',
                videoId: this.currentVideo.videoId,
                reviewDate: reviewDate
            });
            
            this.showNotification('Review scheduled successfully!', 'success');
        } catch (error) {
            console.error('Error scheduling review:', error);
            this.showNotification('Failed to schedule review', 'error');
        }
    }

    /**
     * Update quiz progress
     */
    updateQuizProgress() {
        const totalQuestions = this.currentQuiz.quiz.questions.length;
        const progress = ((this.currentQuestionIndex + 1) / totalQuestions) * 100;
        
        document.getElementById('question-counter').textContent = 
            `Question ${this.currentQuestionIndex + 1} of ${totalQuestions}`;
        document.getElementById('progress-fill').style.width = `${progress}%`;
    }

    /**
     * Update video study count
     */
    async updateVideoStudyCount(videoId) {
        try {
            const videosResponse = await this.sendMessageToBackground({ action: 'getVideos' });
            if (videosResponse.success) {
                const video = videosResponse.data.find(v => v.videoId === videoId);
                if (video) {
                    await this.sendMessageToBackground({
                        action: 'updateVideo',
                        videoId: videoId,
                        data: {
                            studyCount: (video.studyCount || 0) + 1,
                            lastStudied: Date.now()
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error updating study count:', error);
        }
    }

    /**
     * Show library view
     */
    showLibraryView() {
        document.getElementById('library-view').classList.add('active');
        document.getElementById('quiz-view').classList.remove('active');
        this.loadVideoLibrary();
    }

    /**
     * Show quiz view
     */
    showQuizView() {
        document.getElementById('library-view').classList.remove('active');
        document.getElementById('quiz-view').classList.add('active');
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        document.getElementById('loading-state').classList.remove('hidden');
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        document.getElementById('loading-state').classList.add('hidden');
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#2d5a2d' : type === 'error' ? '#5a2d2d' : '#333'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    /**
     * Show settings (placeholder)
     */
    showSettings() {
        this.showNotification('Settings coming soon!', 'info');
    }

    /**
     * Show help (placeholder)
     */
    showHelp() {
        this.showNotification('Help documentation coming soon!', 'info');
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
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the popup
const echoPopup = new EchoPopup();

