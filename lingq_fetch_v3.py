# lingq_fetch_v3.py
# This script fetches LingQ data from the LingQ v3 API and saves it to a file.
# It uses the browser_cookie3 library to extract cookies from Chrome.
# It then makes a request to the LingQ v3 API and saves the response to a file.
# The script is a Python script that can be run from the command line.

import requests
import browser_cookie3
import json

# === AUTOMATIC COOKIE EXTRACTION ===
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

# === V3 API CONFIGURATION ===
def get_v3_api_url(page=1, page_size=25, search_criteria="startsWith", sort="alpha", statuses=None):
    """
    Builds the v3 API URL with configurable parameters.
    
    Args:
        page (int): Page number (default: 1)
        page_size (int): Number of items per page (default: 25)
        search_criteria (str): Search criteria (default: "startsWith")
        sort (str): Sort order (default: "alpha")
        statuses (list): List of status codes to include (default: [4, 0, 2, 1, 3])
    
    Returns:
        str: Complete API URL
    """
    if statuses is None:
        statuses = [4, 0, 2, 1, 3]  # Default statuses from your URL
    
    base_url = "https://www.lingq.com/api/v3/zh/cards/"
    
    # Build query parameters as a list to handle multiple values for same key
    query_params = [
        f'page={page}',
        f'page_size={page_size}',
        f'search_criteria={search_criteria}',
        f'sort={sort}'
    ]
    
    # Add status parameters (multiple values for the same key)
    for status in statuses:
        query_params.append(f'status={status}')
    
    # Build query string
    query_string = '&'.join(query_params)
    return f"{base_url}?{query_string}"

# === MAIN ===
def main():
    # Try to get cookies automatically
    cookies = get_lingq_cookies()
    if cookies:
        print("✅ Successfully extracted cookies from Chrome.")
        CSRF_TOKEN = cookies['csrftoken']
    else:
        print("⚠️  Could not extract cookies automatically. Please enter them manually below.")
        # === MANUAL FALLBACK ===
        CSRF_TOKEN = "YOUR_CSRF_TOKEN_HERE"  # Paste your CSRF token here
        cookies = {
            "csrftoken": CSRF_TOKEN,
            "wwwlingqcomsa": "YOUR_SESSION_COOKIE_HERE"  # Paste your session cookie here
        }

    HEADERS = {
        "Accept": "application/json",
        "X-CSRFToken": CSRF_TOKEN,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    # === V3 API URL ===
    url = get_v3_api_url()
    print(f"🔗 Using v3 API URL: {url}")

    # === MAKE THE REQUEST ===
    print("📡 Making request to LingQ v3 API...")
    response = requests.get(url, headers=HEADERS, cookies=cookies)

    # === SAVE TO FILE ===
    if response.ok:
        # Save raw response
        with open("lingqs_v3.json", "w", encoding="utf-8") as f:
            f.write(response.text)
        print("✅ Downloaded LingQ v3 data to lingqs_v3.json")
        
        # Parse and display some info
        try:
            data = response.json()
            print(f"📊 Response contains {len(data)} items")
            
            # Display first few items if available
            if isinstance(data, list) and len(data) > 0:
                print(f"📝 First item keys: {list(data[0].keys())}")
                print(f"📝 Sample item: {json.dumps(data[0], indent=2, ensure_ascii=False)}")
            elif isinstance(data, dict):
                print(f"📝 Response keys: {list(data.keys())}")
                if 'results' in data:
                    print(f"📊 Found {len(data['results'])} results")
                    if len(data['results']) > 0:
                        print(f"📝 First result keys: {list(data['results'][0].keys())}")
            
        except json.JSONDecodeError as e:
            print(f"⚠️  Could not parse JSON response: {e}")
            print("📄 Raw response preview:")
            print(response.text[:500] + "..." if len(response.text) > 500 else response.text)
            
    else:
        print(f"❌ Failed to fetch data: {response.status_code}")
        print(f"📄 Response text: {response.text}")

# === UTILITY FUNCTIONS ===
def test_different_parameters():
    """
    Test function to try different API parameters.
    """
    print("🧪 Testing different API parameters...")
    
    # Test different page sizes
    for page_size in [10, 25, 50]:
        url = get_v3_api_url(page_size=page_size)
        print(f"📄 Page size {page_size}: {url}")
    
    # Test different status combinations
    status_combinations = [
        [4],  # Only status 4
        [0, 1],  # Status 0 and 1
        [4, 0, 2, 1, 3]  # All statuses
    ]
    
    for statuses in status_combinations:
        url = get_v3_api_url(statuses=statuses)
        print(f"🏷️  Statuses {statuses}: {url}")

if __name__ == "__main__":
    main()
    
    # Uncomment the line below to test different parameters
    # test_different_parameters() 