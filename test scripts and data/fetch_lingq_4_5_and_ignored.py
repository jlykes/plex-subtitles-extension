#!/usr/bin/env python3
"""
LingQ Status Report Generator
Fetches all words with status 3 (Known), 4 (Extended Known), and -1 (Ignored) from LingQ V3 API
and saves them to a dated file with summary statistics.
"""

import requests
import json
import sys
from datetime import datetime
import os

# Try to import tqdm for progress bars, fall back gracefully if not available
try:
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except ImportError:
    TQDM_AVAILABLE = False
    print("💡 Install tqdm for progress bars: pip install tqdm")

def get_lingq_cookies():
    """
    Extracts LingQ cookies from Chrome browser.
    Returns dict of cookies or None if extraction fails.
    """
    try:
        import browser_cookie3
        cookies = browser_cookie3.chrome(domain_name='lingq.com')
        cookie_dict = {cookie.name: cookie.value for cookie in cookies}
        
        # Check if we have the required cookies
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

def search_lingq_cards_v3(search_term, cookies=None, headers=None, page=1, page_size=1000, statuses=None):
    """
    Searches for LingQ cards using V3 API with status filtering.
    
    Args:
        search_term (str): The search term (empty for all words)
        cookies (dict): Authentication cookies
        headers (dict): Request headers
        page (int): Page number for pagination
        page_size (int): Number of results per page (max 1000)
        statuses (list): List of status values to include (3, 4, -1)
    
    Returns:
        dict: Response data or error info
    """
    url = "https://www.lingq.com/api/v3/zh/cards/"
    
    # Build query parameters
    params = {
        "page": page,
        "page_size": page_size,
        "search": search_term,
        "search_criteria": "contains",
        "sort": "alpha"
    }
    
    # Add status filters if provided
    if statuses:
        for status in statuses:
            params[f"status"] = status
    
    try:
        response = requests.get(url, params=params, headers=headers, cookies=cookies)
        
        if response.ok:
            data = response.json()
            results = data.get("results", [])
            count = data.get("count", 0)
            
            return {"success": True, "data": data, "count": count, "results": results}
        else:
            print(f"❌ Failed to search: {response.status_code}")
            return {"success": False, "status_code": response.status_code, "error": response.text}
            
    except Exception as e:
        print(f"❌ Exception searching: {e}")
        return {"success": False, "error": str(e)}

def fetch_all_words_by_status(cookies=None, headers=None, statuses=[3, 4, -1], page_size=1000):
    """
    Fetches all words with specified statuses from LingQ V3 API.
    Makes separate API calls for each status since the API doesn't support multiple statuses in one request.
    
    Args:
        cookies (dict): Authentication cookies
        headers (dict): Request headers
        statuses (list): List of status values to fetch (3, 4, -1)
        page_size (int): Number of results per page (max 1000)
    
    Returns:
        dict: Dictionary with words organized by status
    """
    print(f"🔍 Fetching all words with statuses: {statuses}")
    
    all_words = {status: [] for status in statuses}
    
    # Status labels for progress bars - showing both API and LingQ website status
    status_labels = {
        3: "Learned (API: 3, LingQ: 4)",  # API Status 3 = LingQ Website Status 4
        4: "Known (API: 4, LingQ: ✓)",    # API Status 4 = LingQ Website Checkmark
        -1: "Ignored (API: -1, LingQ: -1)"  # API Status -1 = LingQ Website Ignored
    }
    
    # Fetch each status separately
    for status in statuses:
        status_label = status_labels.get(status, f"Status {status}")
        print(f"\n📊 Fetching {status_label}...")
        
        # First, get the total count for this status
        initial_result = search_lingq_cards_v3(
            search_term="",
            cookies=cookies,
            headers=headers,
            page=1,
            page_size=1,  # Just get count, not data
            statuses=[status]
        )
        
        if not initial_result["success"]:
            print(f"❌ Failed to get count for status {status}: {initial_result.get('error', 'Unknown error')}")
            continue
        
        total_count = initial_result["data"].get("count", 0)
        if total_count == 0:
            print(f"📭 No words found for status {status}")
            continue
        
        # Calculate total pages needed
        total_pages = (total_count + page_size - 1) // page_size
        
        status_words = []
        
        # Create progress bar for this status
        if TQDM_AVAILABLE:
            pbar = tqdm(total=total_count, desc=f"  {status_label}", unit="words")
        else:
            print(f"  Total: {total_count} words across {total_pages} pages")
        
        page = 1
        total_fetched = 0
        
        while True:
            # Make API call for this specific status
            result = search_lingq_cards_v3(
                search_term="",  # Empty search to get all words
                cookies=cookies,
                headers=headers,
                page=page,
                page_size=page_size,
                statuses=[status]  # Single status only
            )
            
            if not result["success"]:
                if TQDM_AVAILABLE:
                    pbar.close()
                print(f"❌ Failed to fetch page {page} for status {status}: {result.get('error', 'Unknown error')}")
                break
            
            data = result["data"]
            results = data.get("results", [])
            
            if not results:
                if TQDM_AVAILABLE:
                    pbar.close()
                print(f"📭 No more results on page {page} for status {status}")
                break
            
            status_words.extend(results)
            total_fetched += len(results)
            
            # Update progress bar
            if TQDM_AVAILABLE:
                pbar.update(len(results))
            else:
                print(f"  Page {page}: Got {len(results)} words (Total: {total_fetched}/{total_count})")
            
            # Check if we've got everything
            if total_fetched >= total_count:
                if TQDM_AVAILABLE:
                    pbar.close()
                break
            
            # Check if there's a next page
            if not data.get("next"):
                if TQDM_AVAILABLE:
                    pbar.close()
                break
            
            page += 1
        
        all_words[status] = status_words
        print(f"✅ Completed {status_label}: {len(status_words)} words")
    
    return all_words

def save_words_to_file(all_words, filename):
    """
    Saves words to a text file - just the terms, one per line.
    
    Args:
        all_words (dict): Dictionary with words organized by status
        filename (str): Output filename
    """
    print(f"💾 Saving words to {filename}...")
    
    with open(filename, "w", encoding="utf-8") as f:
        # Write words by status in order: Known, Extended Known, Ignored
        for status in [3, 4, -1]:
            if status in all_words and all_words[status]:
                for word in all_words[status]:
                    term = word.get("term", "")
                    if term:
                        f.write(term + "\n")
    
    print(f"✅ Saved to {filename}")

def print_summary(all_words):
    """
    Prints a summary of word counts by status.
    
    Args:
        all_words (dict): Dictionary with words organized by status
    """
    print("\n" + "=" * 50)
    print("📊 STATUS BREAKDOWN")
    print("=" * 50)
    
    status_labels = {
        3: "Learned (API: 3, LingQ: 4)",  # API Status 3 = LingQ Website Status 4
        4: "Known (API: 4, LingQ: ✓)",    # API Status 4 = LingQ Website Checkmark
        -1: "Ignored (API: -1, LingQ: -1)"  # API Status -1 = LingQ Website Ignored
    }
    
    total_words = 0
    
    for status in [3, 4, -1]:
        count = len(all_words.get(status, []))
        total_words += count
        print(f"{status_labels[status]:<25}: {count:>6} words")
    
    print("-" * 40)
    print(f"{'TOTAL':<25}: {total_words:>6} words")
    print("=" * 50)

def main():
    """
    Main function to run the LingQ status report generator.
    """
    print("📋 LingQ Status Report Generator")
    print("=" * 40)
    
    # Get cookies
    cookies = get_lingq_cookies()
    if not cookies:
        print("❌ Could not get cookies. Please make sure you're logged into LingQ in Chrome.")
        print("💡 Alternative: You can manually set cookies in the script.")
        return
    
    print("✅ Successfully extracted cookies from Chrome.")
    CSRF_TOKEN = cookies['csrftoken']
    
    # Set up headers
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRFToken": CSRF_TOKEN,
        "User-Agent": "Mozilla/5.0"
    }
    
    # Fetch all words with status 3, 4, and -1
    all_words = fetch_all_words_by_status(cookies, headers, statuses=[3, 4, -1])
    
    # Generate filename with current date
    current_date = datetime.now().strftime("%y%m%d")
    filename = f"{current_date} LingQ Learned + Known + Ignored.txt"
    
    # Save to file
    save_words_to_file(all_words, filename)
    
    # Print summary
    print_summary(all_words)
    
    print(f"\n🎉 Report complete! Check {filename} for the full word list.")

if __name__ == "__main__":
    main() 