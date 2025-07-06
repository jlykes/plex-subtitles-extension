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

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
MAX_LINES = None
AI_SERVICE = "openai"
OPENAI_MODEL = "gpt-3.5-turbo"
TIMEOUT_SECONDS = 45

client = OpenAI(api_key=OPENAI_API_KEY) if AI_SERVICE == "openai" else None

def infer_media_name_from_path(path):
    name = os.path.basename(path)

    # Remove known suffixes in order
    name = re.sub(r'\.chi\.srt$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\.srt$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\.txt$', '', name, flags=re.IGNORECASE)

    return name.strip()

def ensure_folder(path):
    if not os.path.exists(path):
        os.makedirs(path)

def load_lingq_terms(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {entry["term"]: entry["status"] for entry in data if "term" in entry}

def get_pinyin(word):
    return " ".join(lazy_pinyin(word, style=Style.TONE))

def build_prompt(text, media_name):
    return f"""
You are processing Chinese subtitles from the movie \"{media_name}\".

This is the subtitle line to analyze:
{text}

Please follow these steps:

1. Provide a natural English translation of the sentence.
2. Break down the sentence, word by word (no phrases), giving each word’s 
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
    raise TimeoutError("AI call timed out")

def get_ai_analysis(text, media_name):
    prompt = build_prompt(text, media_name)

    def call_api():
        if AI_SERVICE == "openai":
            response = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        else:
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
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(call_api)
            content = future.result(timeout=TIMEOUT_SECONDS)
    except concurrent.futures.TimeoutError:
        print(f"\n⏰ Timeout on line: '{text}'")
        return {"translation": "", "words": [], "explanation": ""}
    except Exception as e:
        print(f"\n🔥 API call failed on line: '{text}'")
        print("Error:", e)
        return {"translation": "", "words": [], "explanation": ""}

    # Strip surrounding code blocks if needed
    if content.startswith("```json"):
        content = content.removeprefix("```json").removesuffix("```").strip()
    elif content.startswith("````"):
        content = content.removeprefix("````").removesuffix("```").strip()

    content = re.sub(r',\s*(\]|\})', r'\1', content)

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        print(f"\n❌ JSONDecodeError on line: '{text}'")
        print("Raw response:", content)
        return {"translation": "", "words": [], "explanation": ""}
    


def enrich_subtitles(srt_path):
    if not os.path.exists(srt_path):
        print(f"⚠️ Skipping '{srt_path}' — SRT file not found.")
        return

    media_name = infer_media_name_from_path(srt_path)
    normalized_name = media_name.replace(" ", "_")
    output_path = os.path.join(OUTPUT_FOLDER, f"{normalized_name}.enriched.json")

    with open(srt_path, "r", encoding="utf-8") as f:
        subs = list(srt.parse(f.read()))

    output = []
    total = len(subs)
    limit = MAX_LINES if MAX_LINES is not None else total

    for idx, sub in enumerate(subs[:limit], 1):
        line = sub.content.strip()
        ai_data = get_ai_analysis(line, media_name)

        word_data = []
        segmented_line = []
        for entry in ai_data.get("words", []):
            word = entry.get("word", "")
            segmented_line.append(word)
            pinyin = get_pinyin(word)
            word_data.append({
                "word": word,
                "pinyin": pinyin
            })

        output.append({
            "start": sub.start.total_seconds(),
            "end": sub.end.total_seconds(),
            "text": line,
            "segmented": word_data,
            "translation": ai_data.get("translation", ""),
            "explanation": ai_data.get("explanation", ""),
            "word_meanings": ai_data.get("words", [])
        })

        segment_preview = " | ".join(segmented_line)
        print(f"\n[{idx}] {segment_preview}")

        percent = (idx / limit) * 100
        sys.stdout.write(f"Progress: {idx}/{limit} ({percent:.2f}%)\r")
        sys.stdout.flush()

    print(f"\nSaving to {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print("✅ Done.")

if __name__ == "__main__":
    ensure_folder(OUTPUT_FOLDER)

    try:
        filenames = sorted([
            f for f in os.listdir(INPUT_FOLDER)
            if f.endswith(".srt") or f.endswith(".txt")
        ])
    except FileNotFoundError:
        print(f"❌ Input folder not found: {INPUT_FOLDER}")
        sys.exit(1)

    for fname in filenames:
        srt_path = os.path.join(INPUT_FOLDER, fname)
        if not os.path.exists(srt_path):
            print(f"⚠️ Skipping missing file: {srt_path}")
            continue

        media_name = infer_media_name_from_path(srt_path)
        normalized_name = media_name.replace(" ", "_")
        output_path = os.path.join(OUTPUT_FOLDER, f"{normalized_name}.enriched.json")

        print(f"\n🔍 Processing: {media_name}")
        # patch global OUTPUT_JSON so your existing code uses it
        globals()["OUTPUT_JSON"] = output_path
        enrich_subtitles(srt_path)

