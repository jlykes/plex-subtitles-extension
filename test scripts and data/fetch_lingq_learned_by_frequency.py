#!/usr/bin/env python3
"""
Fetch LingQ 'Learned' words (status 3) and output them sorted by frequency to Excel.
Excel columns: word, frequency, tag
"""

import requests
import json
from datetime import datetime
import os
import pandas as pd

# Try to import tqdm for progress bars, fall back gracefully if not available
try:
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except ImportError:
    TQDM_AVAILABLE = False
    print("💡 Install tqdm for progress bars: pip install tqdm")

def get_lingq_cookies():
    try:
        import browser_cookie3
        cookies = browser_cookie3.chrome(domain_name='lingq.com')
        cookie_dict = {cookie.name: cookie.value for cookie in cookies}
        required_cookies = ['csrftoken', 'wwwlingqcomsa']
        if all(cookie in cookie_dict for cookie in required_cookies):
            return cookie_dict
        else:
            print("⚠️  Missing required cookies. Found:", list(cookie_dict.keys()))
            return None
    except ImportError:
        print("⚠️  browser_cookie3 not installed. Install with: pip install browser-cookie3")
        return None
    except Exception as e:
        print(f"⚠️  Error extracting cookies: {e}")
        return None

def search_lingq_cards_v3(cookies=None, headers=None, page=1, page_size=1000, status=3):
    url = "https://www.lingq.com/api/v3/zh/cards/"
    params = {
        "page": page,
        "page_size": page_size,
        "search": "",
        "search_criteria": "contains",
        "sort": "alpha",
        "status": status
    }
    try:
        response = requests.get(url, params=params, headers=headers, cookies=cookies)
        if response.ok:
            data = response.json()
            return data.get("results", []), data.get("count", 0), data.get("next", None)
        else:
            print(f"❌ Failed to search: {response.status_code}")
            return [], 0, None
    except Exception as e:
        print(f"❌ Exception searching: {e}")
        return [], 0, None

def fetch_learned_words(cookies, headers, page_size=1000):
    print("🔍 Fetching all 'Learned' words (status 3)...")
    all_words = []
    page = 1
    total_count = None
    pbar = None
    while True:
        results, count, next_url = search_lingq_cards_v3(
            cookies=cookies, headers=headers, page=page, page_size=page_size, status=3
        )
        if total_count is None:
            total_count = count
            if TQDM_AVAILABLE:
                pbar = tqdm(total=total_count, desc="Learned words", unit="words")
        if not results:
            break
        all_words.extend(results)
        if TQDM_AVAILABLE and pbar:
            pbar.update(len(results))
        if not next_url or len(all_words) >= total_count:
            break
        page += 1
    if TQDM_AVAILABLE and pbar:
        pbar.close()
    print(f"✅ Fetched {len(all_words)} 'Learned' words.")
    return all_words

def get_tag_name(tags):
    """Return the tag if it is 'characters known' or 'partial characters known', else 'No tags'"""
    if tags and len(tags) > 0:
        for tag in tags:
            tag_clean = tag.strip().lower().replace('  ', ' ')
            if tag_clean == 'characters known' or tag_clean == 'partial characters known':
                return tag_clean
    return "No tags"

def main():
    # Get cookies
    cookies = get_lingq_cookies()
    if not cookies:
        print("❌ Could not get cookies. Please make sure you're logged into LingQ in Chrome.")
        return
    CSRF_TOKEN = cookies['csrftoken']
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRFToken": CSRF_TOKEN,
        "User-Agent": "Mozilla/5.0"
    }
    # Fetch learned words
    learned_words = fetch_learned_words(cookies, headers)
    # Load word frequency data
    freq_path = os.path.join("cache", "word_frequency.json")
    with open(freq_path, "r", encoding="utf-8") as f:
        freq_data = json.load(f)
    # Build list of dictionaries for DataFrame
    learned_data = []
    for word_data in learned_words:
        term = word_data.get("term", "")
        if term:
            tags = word_data.get("tags", [])
            tag_name = get_tag_name(tags)
            frequency = freq_data.get(term, 0)
            learned_data.append({
                "word": term,
                "frequency": frequency,
                "tag": tag_name
            })
    # Create DataFrame and sort by frequency descending, then alphabetically
    df = pd.DataFrame(learned_data)
    df = df.sort_values(by=["frequency", "word"], ascending=[False, True])
    # Output to Excel file
    current_date = datetime.now().strftime("%y%m%d")
    out_path = f"{current_date}_LingQ_Learned_by_Frequency.xlsx"
    df.to_excel(out_path, index=False)
    print(f"🎉 Output written to {out_path}")

if __name__ == "__main__":
    main() 