#!/usr/bin/env python3
"""
Test script to fetch LingQ data outside of the Chrome extension.
Mimics the background script's fetchLingqData function to test API responses.
"""

import requests
import browser_cookie3
import json
import sys
from datetime import datetime

def get_lingq_cookies():
    """
    Attempts to extract csrftoken and wwwlingqcomsa cookies for lingq.com from Chrome.
    Returns a dict with the cookies, or None if not found.
    """
    try:
        cj = browser_cookie3.chrome(domain_name='lingq.com')
        cookies = {cookie.name: cookie.value for cookie in cj}
        csrftoken = cookies.get('csrftoken')
        wwwlingqcomsa = cookies.get('wwwlingqcomsa')
        if csrftoken and wwwlingqcomsa:
            return {
                'csrftoken': csrftoken,
                'wwwlingqcomsa': wwwlingqcomsa
            }
    except Exception as e:
        print(f"[!] Error extracting cookies: {e}")
    return None

def test_fetch_lingq_data():
    """
    Test function that mimics the background script's fetchLingqData logic.
    """
    print("🔧 Testing LingQ Data Fetch (Background Script Logic)")
    print("=" * 60)
    
    # Get cookies
    print("🔑 Step 1: Extracting cookies from Chrome...")
    cookies = get_lingq_cookies()
    if not cookies:
        print("❌ Failed to extract cookies. Make sure you're logged into LingQ in Chrome.")
        return
    
    print(f"✅ Cookies extracted successfully")
    print(f"   csrftoken: {cookies['csrftoken'][:20]}...")
    print(f"   wwwlingqcomsa: {cookies['wwwlingqcomsa'][:20]}...")
    
    # Set up headers
    headers = {
        "Accept": "application/json",
        "X-CSRFToken": cookies['csrftoken']
    }
    
    print("\n📡 Step 2: Fetching regular LingQ data (v1 API)...")
    print("URL: https://www.lingq.com/api/languages/zh/lingqs/")
    
    try:
        # Fetch regular data (v1 API)
        response = requests.get(
            "https://www.lingq.com/api/languages/zh/lingqs/",
            headers=headers,
            cookies=cookies
        )
        
        if response.ok:
            regular_data = response.json()
            print(f"✅ Successfully fetched {len(regular_data)} regular words")
            
            # Show sample format
            if regular_data:
                print(f"\n📋 Sample regular word format:")
                sample = regular_data[0]
                print(f"   {json.dumps(sample, indent=2, ensure_ascii=False)}")
                
                # Show field names
                print(f"\n📝 Regular word fields:")
                for field in sample.keys():
                    print(f"   - {field}: {type(sample[field]).__name__}")
            else:
                print("⚠️  No regular words found")
                
        else:
            print(f"❌ Failed to fetch regular data: {response.status_code}")
            print(f"Response: {response.text}")
            return
            
    except Exception as e:
        print(f"❌ Error fetching regular data: {e}")
        return
    
    print("\n📡 Step 3: Fetching ignored words (v3 API) with pagination...")
    
    try:
        # Fetch all ignored words with pagination
        all_ignored_results = []
        page = 1
        page_size = 1000
        total_fetched = 0
        
        while True:
            print(f"📄 Fetching page {page}...")
            
            ignored_response = requests.get(
                f"https://www.lingq.com/api/v3/zh/cards/?page={page}&page_size={page_size}&status=-1",
                headers=headers,
                cookies=cookies
            )
            
            if ignored_response.ok:
                ignored_data = ignored_response.json()
                ignored_count = ignored_data.get('count', 0)
                ignored_results = ignored_data.get('results', [])
                
                if not ignored_results:
                    print(f"📭 No more results on page {page}")
                    break
                
                all_ignored_results.extend(ignored_results)
                total_fetched += len(ignored_results)
                
                print(f"✅ Page {page}: Got {len(ignored_results)} ignored words (Total: {total_fetched}/{ignored_count})")
                
                # Check if we've got everything
                if total_fetched >= ignored_count:
                    print(f"🎉 Got all {total_fetched} ignored words!")
                    break
                
                # Check if there's a next page
                if not ignored_data.get('next'):
                    print(f"🏁 No more pages available")
                    break
                
                page += 1
            else:
                print(f"❌ Failed to fetch page {page}: {ignored_response.status_code}")
                print(f"Response: {ignored_response.text}")
                break
        
        print(f"✅ Successfully fetched {len(all_ignored_results)} ignored words total")
        
        # Show sample format
        if all_ignored_results:
            print(f"\n📋 Sample ignored word format:")
            sample = all_ignored_results[0]
            print(f"   {json.dumps(sample, indent=2, ensure_ascii=False)}")
            
            # Show field names
            print(f"\n📝 Ignored word fields:")
            for field in sample.keys():
                print(f"   - {field}: {type(sample[field]).__name__}")
        else:
            print("⚠️  No ignored words found")
            
    except Exception as e:
        print(f"❌ Error fetching ignored data: {e}")
        return
    
    print("\n🔄 Step 4: Testing data combination...")
    
    try:
        # Convert ignored words to match regular format
        converted_ignored = []
        for word in all_ignored_results:
            converted_word = {
                'term': word.get('term'),
                'status': word.get('status'),
                'extended_status': word.get('extended_status'),
                'tags': word.get('tags', [])
            }
            converted_ignored.append(converted_word)
        
        # Combine data
        combined_data = regular_data + converted_ignored
        
        print(f"✅ Successfully combined data:")
        print(f"   Regular words: {len(regular_data)}")
        print(f"   Ignored words: {len(converted_ignored)}")
        print(f"   Total combined: {len(combined_data)}")
        
        # Show sample of converted ignored word
        if converted_ignored:
            print(f"\n📋 Sample converted ignored word:")
            sample = converted_ignored[0]
            print(f"   {json.dumps(sample, indent=2, ensure_ascii=False)}")
            
        # Save combined data to file for inspection
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"test_lingq_data_{timestamp}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(combined_data, f, ensure_ascii=False, indent=2)
        
        print(f"\n💾 Saved combined data to: {filename}")
        
        # Show some statistics
        print(f"\n📊 Data Statistics:")
        status_counts = {}
        for word in combined_data:
            status = word.get('status', 'unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
        
        for status, count in sorted(status_counts.items()):
            status_name = {
                -1: "Ignored",
                0: "New",
                1: "Learning", 
                2: "Familiar",
                3: "Known"
            }.get(status, f"Status {status}")
            print(f"   {status_name} (status {status}): {count} words")
        
    except Exception as e:
        print(f"❌ Error combining data: {e}")
        return
    
    print(f"\n🎉 Test completed successfully!")
    print(f"Check {filename} for the full combined dataset.")

if __name__ == "__main__":
    test_fetch_lingq_data() 