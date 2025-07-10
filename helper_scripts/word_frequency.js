// word_frequency.js
// Manages word frequency operations for the subtitle overlay

const fs = require('fs');
const path = require('path');

/**
 * Checks if a word contains Chinese characters
 * @param {string} word - Word to check
 * @returns {boolean} - True if word contains Chinese characters
 */
function isChineseWord(word) {
  // Match Chinese characters (Unicode ranges for Chinese)
  const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f]/;
  
  // Must contain at least one Chinese character AND not be purely numeric
  const hasChinese = chineseRegex.test(word);
  const isNumeric = /^\d+$/.test(word);
  
  return hasChinese && !isNumeric;
}

/**
 * Parses all enriched subtitle files and builds word frequency dictionary
 * @returns {Object} - Dictionary with word frequencies {word: count}
 */
function buildWordFrequencyCorpus() {
  const enrichedDir = path.join(__dirname, '..', 'enriched_subtitles');
  const frequencyDict = {};
  
  try {
    const files = fs.readdirSync(enrichedDir).filter(file => file.endsWith('.enriched.json'));
    
    console.log(`Processing ${files.length} enriched subtitle files...`);
    
    files.forEach((file, index) => {
      const filePath = path.join(enrichedDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      // Extract words from segmented data
      if (Array.isArray(data)) {
        data.forEach(subtitle => {
          if (subtitle.segmented && Array.isArray(subtitle.segmented)) {
            subtitle.segmented.forEach(segment => {
              if (segment.word && isChineseWord(segment.word)) {
                frequencyDict[segment.word] = (frequencyDict[segment.word] || 0) + 1;
              }
            });
          }
        });
      }
      
      if ((index + 1) % 10 === 0) {
        console.log(`Processed ${index + 1}/${files.length} files...`);
      }
    });
    
    console.log(`Completed! Found ${Object.keys(frequencyDict).length} unique Chinese words.`);
    return frequencyDict;
    
  } catch (error) {
    console.error('Error building word frequency corpus:', error);
    return {};
  }
}

/**
 * Maps frequency counts to scores 1-5 based on percentiles
 * @param {Object} frequencyDict - Dictionary with word frequencies
 * @returns {Object} - Dictionary with word scores {word: score}
 */
function mapFrequencyToScores(frequencyDict) {
  // Sort words by frequency descending
  const sortedWords = Object.entries(frequencyDict)
    .sort((a, b) => b[1] - a[1]);

  const totalFrequency = sortedWords.reduce((sum, [, count]) => sum + count, 0);

  // Cumulative frequency breakpoints
  const breakpoints = {
    5: 0.60, // Top 60% of total word volume (most frequent)
    4: 0.80, // Next 20%
    3: 0.90, // Next 10%
    2: 0.97, // Next 7%
    1: 1.00  // Last 3%
  };

  let cumulative = 0;
  const scoreDict = {};

  for (const [word, count] of sortedWords) {
    cumulative += count;
    const ratio = cumulative / totalFrequency;
    if (ratio <= breakpoints[5]) {
      scoreDict[word] = 5;
    } else if (ratio <= breakpoints[4]) {
      scoreDict[word] = 4;
    } else if (ratio <= breakpoints[3]) {
      scoreDict[word] = 3;
    } else if (ratio <= breakpoints[2]) {
      scoreDict[word] = 2;
    } else {
      scoreDict[word] = 1;
    }
  }

  return scoreDict;
}

/**
 * Saves frequency and score data to cache files
 * @param {Object} frequencyDict - Word frequency dictionary
 * @param {Object} scoreDict - Word score dictionary
 */
function saveFrequencyData(frequencyDict, scoreDict) {
  const cacheDir = path.join(__dirname, '..', 'cache');
  
  // Create cache directory if it doesn't exist
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir);
  }
  
  const frequencyPath = path.join(cacheDir, 'word_frequency.json');
  const scorePath = path.join(cacheDir, 'word_scores.json');
  
  fs.writeFileSync(frequencyPath, JSON.stringify(frequencyDict, null, 2));
  fs.writeFileSync(scorePath, JSON.stringify(scoreDict, null, 2));
  
  console.log(`Frequency data saved to: ${frequencyPath}`);
  console.log(`Score data saved to: ${scorePath}`);
}

/**
 * Main function to build and save word frequency data
 */
function main() {
  console.log('Building word frequency corpus...');
  const frequencyDict = buildWordFrequencyCorpus();
  
  if (Object.keys(frequencyDict).length === 0) {
    console.error('No frequency data generated. Exiting.');
    return;
  }
  
  console.log('Mapping frequencies to scores...');
  const scoreDict = mapFrequencyToScores(frequencyDict);
  
  console.log('Saving data to cache...');
  saveFrequencyData(frequencyDict, scoreDict);
  
  // Calculate totals
  const totalWords = Object.values(frequencyDict).reduce((sum, count) => sum + count, 0);
  const uniqueWords = Object.keys(frequencyDict).length;
  
  console.log('\n=== CORPUS STATISTICS ===');
  console.log(`Total word occurrences: ${totalWords.toLocaleString()}`);
  console.log(`Unique Chinese words: ${uniqueWords.toLocaleString()}`);
  
  // Print top 5 words from each score bucket
  console.log('\n=== TOP 5 WORDS BY SCORE ===');
  for (let score = 5; score >= 1; score--) {
    const wordsInScore = Object.entries(frequencyDict)
      .filter(([word]) => scoreDict[word] === score)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    console.log(`\nScore ${score} (top 5):`);
    wordsInScore.forEach(([word, count]) => {
      console.log(`  ${word}: ${count.toLocaleString()} occurrences`);
    });
  }
  
  console.log('\n=== FREQUENCY DISTRIBUTION ===');
  const scoreCounts = {};
  Object.values(scoreDict).forEach(score => {
    scoreCounts[score] = (scoreCounts[score] || 0) + 1;
  });
  
  Object.entries(scoreCounts).forEach(([score, count]) => {
    console.log(`Score ${score}: ${count.toLocaleString()} words`);
  });
}

// Export functions for use in other modules
module.exports = {
  buildWordFrequencyCorpus,
  mapFrequencyToScores,
  isChineseWord
};

// Run main function if script is executed directly
if (require.main === module) {
  main();
} 