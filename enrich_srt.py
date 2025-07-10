"""
Chinese Subtitle Enrichment Tool

This script processes Chinese subtitle files (.srt) and enriches them with:
- English translations
- Word-by-word breakdowns with meanings
- Pinyin transcriptions
- Grammar explanations for intermediate learners

The tool uses AI services (OpenAI or DeepSeek) to analyze Chinese text and generate
educational content for language learning purposes.
"""

import srt
import json
import re
from datetime import timedelta
from pypinyin import lazy_pinyin, Style
import openai
from openai import OpenAI
import requests
import sys
import signal
import os
import concurrent.futures
from dotenv import load_dotenv

# CONFIGURATION
INPUT_FOLDER = "srts-to-enrich"
OUTPUT_FOLDER = "enriched-srts"

# Load environment variables from .env file
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
MAX_LINES = None  # Limit processing to N lines (None = process all)
AI_SERVICE = "openai"  # "openai" or "deepseek"
OPENAI_MODEL = "gpt-3.5-turbo"  # OpenAI model to use
TIMEOUT_SECONDS = 45  # Timeout for AI API calls

# Initialize OpenAI client if using OpenAI service
client = OpenAI(api_key=OPENAI_API_KEY) if AI_SERVICE == "openai" else None

def normalize_title(title):
    """
    Normalizes a media title for use in file names or URLs.
    
    This function removes leading whitespace, special characters, and converts
    spaces to underscores. It also removes the leading ▶ character and any
    fallback Plex titles that may be present. Chinese characters and fullwidth
    punctuation are replaced with dots.
    
    Args:
        title (str): The media title to normalize
        
    Returns:
        str: The normalized title suitable for file names or URLs
        
    Example:
        >>> normalize_title("▶ My Movie: The Sequel")
        "My_Movie_-_The_Sequel"
        >>> normalize_title("你好世界")
        "...."
    """
    result = title.strip()
    result = re.sub(r'^▶\s*', '', result)  # Remove leading ▶ and whitespace
    result = re.sub(r'^Plex.*$', '', result, flags=re.IGNORECASE)  # Remove fallback Plex titles
    result = re.sub(r':', ' -', result)  # Replace all colons with ' -'
    result = re.sub(r'\s+', '_', result)  # Convert spaces to underscores
    result = re.sub(r'[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]', '.', result)  # Replace Chinese chars and fullwidth punctuation with dots
    result = re.sub(r'#', '', result)  # Remove all hash symbols
    result = re.sub(r"[—'&,’]", "_", result)  # Replace em dash, apostrophe, ampersand, comma, and curly apostrophe with underscores
    return result

def infer_media_name_from_path(path):
    """
    Extract the media name from a file path by removing common subtitle extensions.
    
    This function takes a file path and strips away common subtitle file extensions
    (.srt, .chi.srt, .txt) to get the base media name. It handles case-insensitive
    matching and removes extra whitespace.
    
    Args:
        path (str): The file path to extract the name from
        
    Returns:
        str: The cleaned media name without file extensions
        
    Example:
        >>> infer_media_name_from_path("movies/My Movie.chi.srt")
        "My Movie"
    """
    name = os.path.basename(path)

    # Remove known suffixes in order (most specific to least specific)
    name = re.sub(r'\.chi\.srt$', '', name, flags=re.IGNORECASE)  # Chinese subtitle format
    name = re.sub(r'\.srt$', '', name, flags=re.IGNORECASE)       # Standard subtitle format
    name = re.sub(r'\.txt$', '', name, flags=re.IGNORECASE)       # Text file format

    # Normalize the extracted name using the same logic as other applications
    return normalize_title(name.strip())

def ensure_folder(path):
    """
    Create a folder if it doesn't exist.
    
    This is a utility function to ensure that output directories exist before
    trying to write files to them. It creates the full directory path if needed.
    
    Args:
        path (str): The folder path to create
    """
    if not os.path.exists(path):
        os.makedirs(path)

def load_lingq_terms(path):
    """
    Load LingQ vocabulary terms from a JSON file.
    
    This function reads a JSON file containing LingQ vocabulary data and extracts
    the terms and their learning status. It's designed to work with LingQ export
    format where each entry has a "term" and "status" field.
    
    Args:
        path (str): Path to the JSON file containing LingQ terms
        
    Returns:
        dict: Dictionary mapping terms to their status
        
    Example:
        >>> load_lingq_terms("vocabulary.json")
        {"你好": "learning", "谢谢": "known"}
    """
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {entry["term"]: entry["status"] for entry in data if "term" in entry}

def get_pinyin(word):
    """
    Convert a Chinese word to pinyin with tone marks.
    
    This function takes a Chinese character or word and converts it to pinyin
    (romanized Chinese) with tone marks. It uses the pypinyin library to handle
    the conversion and joins multiple characters with spaces.
    
    Args:
        word (str): Chinese word to convert to pinyin
        
    Returns:
        str: Pinyin representation with tone marks
        
    Example:
        >>> get_pinyin("你好")
        "nǐ hǎo"
    """
    return " ".join(lazy_pinyin(word, style=Style.TONE))

def build_prompt(text, media_name):
    """
    Build a structured prompt for AI analysis of Chinese text.
    
    This function creates a detailed prompt that instructs the AI to:
    1. Provide natural English translation
    2. Break down the sentence word by word with meanings
    3. Explain tricky grammar structures and cultural phrases
    
    The prompt is designed for intermediate Chinese learners and focuses on
    educational content rather than just translation.
    
    Args:
        text (str): The Chinese text to analyze
        media_name (str): Name of the media source for context
        
    Returns:
        str: Formatted prompt for AI analysis
    """
    return f"""
You are processing Chinese subtitles from the movie \"{media_name}\".

This is the subtitle line to analyze:
{text}

Please follow these steps:

1. Provide a natural English translation of the sentence.
2. Break down the sentence, word by word (no phrases), giving each word's 
meaning **in this context** and its grammatical role if relevant.
3. Please also provide an explanation of any tricky grammar structures, vocabulary, 
idiomatic / cultural phrases. Focus on things that would trip up an intermediate learner. 
If the sentence is very simple, keep the explanation very short

Return valid JSON (no trailing commas):
{{
  "translation": "...",
  "words": [{{"word": "...", "meaning": "..."}}],
  "explanation": "..."
}}
"""

def timeout_handler(signum, frame):
    """
    Signal handler for timeout events.
    
    This function is called when a timeout signal is received. It raises a
    TimeoutError to interrupt long-running operations, particularly AI API calls
    that might hang or take too long to respond.
    
    Args:
        signum: Signal number
        frame: Current stack frame
        
    Raises:
        TimeoutError: Always raises this exception to interrupt execution
    """
    raise TimeoutError("AI call timed out")

def get_ai_analysis(text, media_name):
    """
    Get AI analysis of Chinese text using OpenAI or DeepSeek API.
    
    This function sends Chinese text to an AI service for analysis and returns
    structured data including translation, word breakdowns, and explanations.
    It handles both OpenAI and DeepSeek APIs, manages timeouts, and processes
    the JSON response.
    
    The function uses threading to implement timeout handling and includes
    error recovery for various failure scenarios.
    
    Args:
        text (str): Chinese text to analyze
        media_name (str): Name of the media source for context
        
    Returns:
        dict: Analysis results with keys: translation, words, explanation
        
    Note:
        Returns empty results if API call fails or times out
    """
    prompt = build_prompt(text, media_name)

    def call_api():
        """
        Internal function to make the actual API call.
        
        This nested function handles the specific API calls to either OpenAI
        or DeepSeek. It's separated to allow for timeout handling via threading.
        
        Returns:
            str: Raw API response content
            
        Raises:
            Various exceptions from API calls or HTTP requests
        """
        if AI_SERVICE == "openai" and client is not None:
            # Make OpenAI API call with structured prompt
            response = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3  # Lower temperature for more consistent results
            )
            content = response.choices[0].message.content
            return content.strip() if content else ""
        else:
            # Make DeepSeek API call with same prompt structure
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
            }
            payload = {
                "model": "deepseek-chat",
                "messages": [{"role": "user", "content": prompt}]
            }
            res = requests.post("https://api.deepseek.com/v1/chat/completions", headers=headers, json=payload)
            res.raise_for_status()
            return res.json()["choices"][0]["message"]["content"].strip()

    try:
        # Use ThreadPoolExecutor to implement timeout handling
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(call_api)
            content = future.result(timeout=TIMEOUT_SECONDS)
    except concurrent.futures.TimeoutError:
        # Handle timeout gracefully with empty results
        print(f"\n⏰ Timeout on line: '{text}'")
        return {"translation": "", "words": [], "explanation": ""}
    except Exception as e:
        # Handle any other API errors gracefully
        print(f"\n🔥 API call failed on line: '{text}'")
        print("Error:", e)
        return {"translation": "", "words": [], "explanation": ""}

    # Clean up the response content
    # Remove markdown code blocks if present
    if content.startswith("```json"):
        content = content.removeprefix("```json").removesuffix("```").strip()
    elif content.startswith("````"):
        content = content.removeprefix("````").removesuffix("```").strip()

    # Remove trailing commas that might cause JSON parsing errors
    content = re.sub(r',\s*(\]|\})', r'\1', content)

    try:
        # Parse the cleaned JSON response
        return json.loads(content)
    except json.JSONDecodeError:
        # Handle JSON parsing errors gracefully
        print(f"\n❌ JSONDecodeError on line: '{text}'")
        print("Raw response:", content)
        return {"translation": "", "words": [], "explanation": ""}

def enrich_subtitles(srt_path):
    """
    Process a subtitle file and enrich it with AI-generated educational content.
    
    This is the main processing function that:
    1. Reads an SRT subtitle file
    2. Processes each subtitle line through AI analysis
    3. Adds pinyin transcriptions
    4. Combines all data into a structured JSON output
    
    The function processes subtitles sequentially and shows progress updates.
    It handles file I/O, AI API calls, and data transformation.
    
    Args:
        srt_path (str): Path to the input SRT file
        
    Note:
        Creates output file in OUTPUT_FOLDER with .enriched.json extension
    """
    # Check if input file exists
    if not os.path.exists(srt_path):
        print(f"⚠️ Skipping '{srt_path}' — SRT file not found.")
        return

    # Extract media name and create output path
    media_name = infer_media_name_from_path(srt_path)
    # media_name is already normalized by infer_media_name_from_path
    output_path = os.path.join(OUTPUT_FOLDER, f"{media_name}.enriched.json")

    # Parse the SRT file into subtitle objects
    with open(srt_path, "r", encoding="utf-8") as f:
        subs = list(srt.parse(f.read()))

    # Initialize output data structure
    output = []
    total = len(subs)
    limit = MAX_LINES if MAX_LINES is not None else total

    # Process each subtitle line
    for idx, sub in enumerate(subs[:limit], 1):
        # Extract the text content and remove whitespace
        line = sub.content.strip()
        
        # Get AI analysis of the line
        ai_data = get_ai_analysis(line, media_name)

        # Process word segmentation and pinyin
        word_data = []
        segmented_line = []
        for entry in ai_data.get("words", []):
            word = entry.get("word", "")
            segmented_line.append(word)
            # Generate pinyin for each word
            pinyin = get_pinyin(word)
            word_data.append({
                "word": word,
                "pinyin": pinyin
            })

        # Build the enriched subtitle entry
        output.append({
            "start": sub.start.total_seconds(),      # Start time in seconds
            "end": sub.end.total_seconds(),          # End time in seconds
            "text": line,                            # Original Chinese text
            "segmented": word_data,                  # Words with pinyin
            "translation": ai_data.get("translation", ""),  # English translation
            "explanation": ai_data.get("explanation", ""),  # Grammar/cultural notes
            "word_meanings": ai_data.get("words", [])      # Word-by-word meanings
        })

        # Show progress with segmented text preview
        segment_preview = " | ".join(segmented_line)
        print(f"\n[{idx}] {segment_preview}")

        # Update progress display
        percent = (idx / limit) * 100
        sys.stdout.write(f"Progress: {idx}/{limit} ({percent:.2f}%)\r")
        sys.stdout.flush()

    # Save the enriched data to JSON file
    print(f"\nSaving to {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print("✅ Done.")

if __name__ == "__main__":
    """
    Main execution block.
    
    This section handles the overall workflow:
    1. Ensures output directory exists
    2. Scans input directory for subtitle files
    3. Processes each file through the enrichment pipeline
    4. Handles errors and missing files gracefully
    """
    # Create output directory if it doesn't exist
    ensure_folder(OUTPUT_FOLDER)

    try:
        # Get list of subtitle files from input directory
        filenames = sorted([
            f for f in os.listdir(INPUT_FOLDER)
            if f.endswith(".srt") or f.endswith(".txt")
        ])
    except FileNotFoundError:
        # Handle missing input directory
        print(f"❌ Input folder not found: {INPUT_FOLDER}")
        sys.exit(1)

    # Process each subtitle file
    for fname in filenames:
        srt_path = os.path.join(INPUT_FOLDER, fname)
        
        # Skip missing files
        if not os.path.exists(srt_path):
            print(f"⚠️ Skipping missing file: {srt_path}")
            continue

        # Extract media name and create output path
        media_name = infer_media_name_from_path(srt_path)
        # media_name is already normalized by infer_media_name_from_path
        output_path = os.path.join(OUTPUT_FOLDER, f"{media_name}.enriched.json")

        # Process the subtitle file
        print(f"\n🔍 Processing: {media_name}")
        # patch global OUTPUT_JSON so your existing code uses it
        globals()["OUTPUT_JSON"] = output_path
        enrich_subtitles(srt_path)

