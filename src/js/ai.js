/**
 * AI Core Module for Echo Chrome Extension
 * Handles AI interaction and study material generation
 */

/**
 * Master Technical Prompt Template
 * This is the comprehensive prompt that will be sent to the AI
 */
const MASTER_PROMPT_TEMPLATE = `
You are an expert educational content creator specializing in creating comprehensive study materials from video transcripts. Your task is to analyze the provided transcript data and generate a complete study module that includes a summary, key terms, and an interactive quiz.

## Instructions:

1. **Summary Generation**: Create a concise yet comprehensive summary that captures the main concepts, key points, and important details from the transcript. The summary should be educational and help reinforce learning.

2. **Key Terms Extraction**: Identify and extract 8-12 important terms, concepts, or phrases that are central to understanding the content. These should be the most significant learning objectives.

3. **Quiz Creation**: Generate 5-7 multiple-choice questions that test understanding of the material. Questions should:
   - Cover different aspects of the content
   - Vary in difficulty (mix of recall and application)
   - Have 4 options each (A, B, C, D)
   - Include detailed explanations for each answer
   - Focus on the most important learning points

## Response Format:
You must respond with a valid JSON object in the following exact format:

{
  "summary": "Comprehensive summary of the video content...",
  "keyTerms": ["term1", "term2", "term3", "term4", "term5", "term6", "term7", "term8"],
  "quiz": {
    "questions": [
      {
        "question": "What is the main topic discussed in this video?",
        "options": [
          "Option A text",
          "Option B text", 
          "Option C text",
          "Option D text"
        ],
        "correctAnswer": 0,
        "explanation": "Detailed explanation of why this answer is correct and what the other options represent."
      }
    ]
  }
}

## Content Data:
The following data contains the transcript and any user highlights:

\`\`\`json
{{TRANSCRIPT_DATA}}
\`\`\`

## Difficulty Level: {{DIFFICULTY}}

Please analyze this content and generate the study materials according to the specifications above. Ensure the JSON response is valid and complete.
`;

/**
 * Generate study module using AI
 * @param {Array} transcriptData - Array of transcript segments with timestamps and text
 * @param {Array} highlights - Array of user-highlighted text segments
 * @param {string} difficulty - Difficulty level: 'easy', 'medium', 'hard'
 * @returns {Promise<Object>} Study module with summary, key terms, and quiz
 */
async function generateStudyModule(transcriptData, highlights = [], difficulty = 'medium') {
    try {
        // Validate input data
        if (!transcriptData || !Array.isArray(transcriptData) || transcriptData.length === 0) {
            throw new Error('Invalid transcript data provided');
        }

        // Prepare the data for injection into the prompt
        const jsonData = {
            transcript: transcriptData,
            highlights: highlights,
            metadata: {
                totalSegments: transcriptData.length,
                totalDuration: calculateTotalDuration(transcriptData),
                difficulty: difficulty,
                timestamp: Date.now()
            }
        };

        // Format the prompt with the data
        const formattedPrompt = MASTER_PROMPT_TEMPLATE
            .replace('{{TRANSCRIPT_DATA}}', JSON.stringify(jsonData, null, 2))
            .replace('{{DIFFICULTY}}', difficulty);

        console.log('Sending prompt to AI:', formattedPrompt);

        // Call the Chrome AI API
        const response = await chrome.ai.createPrompt(formattedPrompt);
        
        if (!response) {
            throw new Error('No response received from AI');
        }

        // Parse the AI response
        const studyModule = parseAIResponse(response);
        
        // Validate the study module structure
        validateStudyModule(studyModule);
        
        console.log('Generated study module:', studyModule);
        return studyModule;

    } catch (error) {
        console.error('Error generating study module:', error);
        
        // Return a fallback study module if AI fails
        return generateFallbackStudyModule(transcriptData, difficulty);
    }
}

/**
 * Parse AI response and extract JSON
 * @param {string} response - Raw AI response
 * @returns {Object} Parsed study module
 */
function parseAIResponse(response) {
    try {
        // Try to extract JSON from the response
        let jsonString = response;
        
        // Look for JSON block markers
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                         response.match(/```\s*([\s\S]*?)\s*```/) ||
                         response.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            jsonString = jsonMatch[1] || jsonMatch[0];
        }
        
        // Clean up the JSON string
        jsonString = jsonString.trim();
        
        // Parse the JSON
        const parsed = JSON.parse(jsonString);
        
        return parsed;
        
    } catch (error) {
        console.error('Error parsing AI response:', error);
        throw new Error('Failed to parse AI response as JSON');
    }
}

/**
 * Validate study module structure
 * @param {Object} studyModule - Study module to validate
 * @throws {Error} If validation fails
 */
function validateStudyModule(studyModule) {
    if (!studyModule || typeof studyModule !== 'object') {
        throw new Error('Study module must be an object');
    }
    
    if (!studyModule.summary || typeof studyModule.summary !== 'string') {
        throw new Error('Study module must have a summary string');
    }
    
    if (!Array.isArray(studyModule.keyTerms)) {
        throw new Error('Study module must have keyTerms array');
    }
    
    if (!studyModule.quiz || !studyModule.quiz.questions || !Array.isArray(studyModule.quiz.questions)) {
        throw new Error('Study module must have quiz with questions array');
    }
    
    // Validate each question
    studyModule.quiz.questions.forEach((question, index) => {
        if (!question.question || typeof question.question !== 'string') {
            throw new Error(`Question ${index + 1} must have a question string`);
        }
        
        if (!Array.isArray(question.options) || question.options.length !== 4) {
            throw new Error(`Question ${index + 1} must have exactly 4 options`);
        }
        
        if (typeof question.correctAnswer !== 'number' || 
            question.correctAnswer < 0 || 
            question.correctAnswer > 3) {
            throw new Error(`Question ${index + 1} must have a valid correctAnswer (0-3)`);
        }
        
        if (!question.explanation || typeof question.explanation !== 'string') {
            throw new Error(`Question ${index + 1} must have an explanation string`);
        }
    });
}

/**
 * Calculate total duration from transcript data
 * @param {Array} transcriptData - Transcript segments
 * @returns {number} Total duration in seconds
 */
function calculateTotalDuration(transcriptData) {
    if (!transcriptData || transcriptData.length === 0) return 0;
    
    const lastSegment = transcriptData[transcriptData.length - 1];
    return lastSegment.startTime || 0;
}

/**
 * Generate fallback study module when AI fails
 * @param {Array} transcriptData - Transcript segments
 * @param {string} difficulty - Difficulty level
 * @returns {Object} Fallback study module
 */
function generateFallbackStudyModule(transcriptData, difficulty) {
    console.log('Generating fallback study module');
    
    // Extract key terms from transcript
    const keyTerms = extractKeyTermsFromTranscript(transcriptData);
    
    // Generate basic summary
    const summary = generateBasicSummary(transcriptData);
    
    // Generate basic quiz
    const quiz = generateBasicQuiz(transcriptData, difficulty);
    
    return {
        summary: summary,
        keyTerms: keyTerms,
        quiz: quiz
    };
}

/**
 * Extract key terms from transcript using simple heuristics
 * @param {Array} transcriptData - Transcript segments
 * @returns {Array} Array of key terms
 */
function extractKeyTermsFromTranscript(transcriptData) {
    const termFrequency = {};
    const allText = transcriptData.map(segment => segment.text).join(' ').toLowerCase();
    
    // Simple keyword extraction based on frequency and length
    const words = allText.split(/\s+/)
        .filter(word => word.length > 4 && /^[a-zA-Z]+$/.test(word))
        .filter(word => !isCommonWord(word));
    
    words.forEach(word => {
        termFrequency[word] = (termFrequency[word] || 0) + 1;
    });
    
    // Return top 8 terms
    return Object.entries(termFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([term]) => term);
}

/**
 * Check if a word is a common word
 * @param {string} word - Word to check
 * @returns {boolean} True if common word
 */
function isCommonWord(word) {
    const commonWords = [
        'this', 'that', 'with', 'have', 'will', 'from', 'they', 'know', 'want', 'been',
        'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like',
        'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'
    ];
    return commonWords.includes(word.toLowerCase());
}

/**
 * Generate basic summary from transcript
 * @param {Array} transcriptData - Transcript segments
 * @returns {string} Basic summary
 */
function generateBasicSummary(transcriptData) {
    if (transcriptData.length === 0) return 'No content available.';
    
    // Take first few segments and last few segments
    const firstPart = transcriptData.slice(0, 3).map(s => s.text).join(' ');
    const lastPart = transcriptData.slice(-2).map(s => s.text).join(' ');
    
    return `This video covers ${transcriptData.length} segments of content. The beginning discusses ${firstPart.substring(0, 200)}... The conclusion covers ${lastPart.substring(0, 200)}...`;
}

/**
 * Generate basic quiz from transcript
 * @param {Array} transcriptData - Transcript segments
 * @param {string} difficulty - Difficulty level
 * @returns {Object} Basic quiz object
 */
function generateBasicQuiz(transcriptData, difficulty) {
    const questions = [];
    
    if (transcriptData.length > 0) {
        // Question 1: About the beginning
        questions.push({
            question: "What is discussed at the beginning of this video?",
            options: [
                "Introduction to the main topic",
                "Conclusion and summary",
                "Technical details only",
                "Background music"
            ],
            correctAnswer: 0,
            explanation: "The beginning of the video typically introduces the main topic that will be covered."
        });
        
        // Question 2: About content length
        questions.push({
            question: "How many content segments does this video have?",
            options: [
                `${transcriptData.length} segments`,
                "Less than 5 segments",
                "More than 50 segments",
                "Unknown"
            ],
            correctAnswer: 0,
            explanation: `This video contains ${transcriptData.length} distinct content segments.`
        });
    }
    
    // Add more questions based on available content
    if (transcriptData.length > 5) {
        questions.push({
            question: "What type of content is this video?",
            options: [
                "Educational content",
                "Entertainment only",
                "Advertisement",
                "Music video"
            ],
            correctAnswer: 0,
            explanation: "This appears to be educational content based on the structured transcript segments."
        });
    }
    
    return { questions };
}

/**
 * Adjust difficulty of questions
 * @param {Array} questions - Array of questions
 * @param {string} difficulty - Difficulty level
 * @returns {Array} Adjusted questions
 */
function adjustQuestionDifficulty(questions, difficulty) {
    // This would implement difficulty adjustment logic
    // For now, return questions as-is
    return questions;
}

// Export the main function for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateStudyModule };
}

