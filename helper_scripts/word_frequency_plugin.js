// word_frequency_plugin.js
// Plugin functionality for word frequency scores in the subtitle overlay

/**
 * Loads word frequency data from cache files
 * @returns {Promise<Object>} - Object containing frequency and score data
 */
async function loadFrequencyData() {
  try {
    // Load frequency data
    const frequencyResponse = await fetch(chrome.runtime.getURL('cache/word_frequency.json'));
    const frequencyData = await frequencyResponse.json();
    
    // Load score data
    const scoreResponse = await fetch(chrome.runtime.getURL('cache/word_scores.json'));
    const scoreData = await scoreResponse.json();
    
    return {
      frequency: frequencyData,
      scores: scoreData
    };
  } catch (error) {
    console.error('Error loading frequency data:', error);
    return null;
  }
}

/**
 * Gets the frequency score for a word
 * @param {string} word - The Chinese word to look up
 * @param {Object} frequencyData - Loaded frequency data
 * @returns {number|null} - Score 1-5, or null if word not found
 */
function getWordFrequencyScore(word, frequencyData) {
  if (!frequencyData || !frequencyData.scores) {
    return null;
  }
  
  return frequencyData.scores[word] || null;
}

/**
 * Gets the frequency count for a word
 * @param {string} word - The Chinese word to look up
 * @param {Object} frequencyData - Loaded frequency data
 * @returns {number|null} - Frequency count, or null if word not found
 */
function getWordFrequencyCount(word, frequencyData) {
  if (!frequencyData || !frequencyData.frequency) {
    return null;
  }
  
  return frequencyData.frequency[word] || null;
}

/**
 * Gets comprehensive frequency information for a word
 * @param {string} word - The Chinese word to look up
 * @param {Object} frequencyData - Loaded frequency data
 * @returns {Object|null} - Object with score, count, and metadata, or null if word not found
 */
function getWordFrequencyInfo(word, frequencyData) {
  if (!frequencyData) {
    return null;
  }
  
  const score = getWordFrequencyScore(word, frequencyData);
  const count = getWordFrequencyCount(word, frequencyData);
  
  if (score === null) {
    return null;
  }
  
  return {
    word: word,
    score: score,
    count: count,
    scoreDescription: getScoreDescription(score)
  };
}

/**
 * Gets the percentage coverage for a frequency score
 * @param {number} score - Frequency score 1-5
 * @returns {string} - Percentage coverage description
 */
function getScoreDescription(score) {
  const coverage = {
    5: '60%',
    4: '60-80%', 
    3: '80-90%',
    2: '90-97%',
    1: '97-100%'
  };
  
  return coverage[score] || 'Unknown';
}

/**
 * Formats frequency count with appropriate units in English
 * @param {number} count - Raw frequency count
 * @returns {string} - Formatted count string
 */
function formatFrequencyCount(count) {
  if (count >= 1000000) {
    return `${Math.round(count / 1000000)}M`;
  } else if (count >= 1000) {
    return `${Math.round(count / 1000)}K`;
  } else {
    return count.toString();
  }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadFrequencyData,
    getWordFrequencyScore,
    getWordFrequencyCount,
    getWordFrequencyInfo,
    getScoreDescription,
    formatFrequencyCount
  };
} 