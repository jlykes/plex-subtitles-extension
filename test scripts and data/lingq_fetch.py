# lingq_fetch.py
# This script fetches LingQ data from the LingQ API and saves it to a file.
# It uses the browser_cookie3 library to extract cookies from Chrome.
# It then makes a request to the LingQ API and saves the response to a file.
# The script is a Python script that can be run from the command line.

import requests
import browser_cookie3
import os

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

# === FILE-BASED COOKIE FALLBACK ===
def get_lingq_cookies_from_file(cookie_file="lingq_cookies.txt"):
    """
    Reads LingQ cookies from a text file.
    Expected format: one cookie per line as 'name=value'
    Returns a dict with the cookies, or None if not found.
    """
    try:
        if not os.path.exists(cookie_file):
            print(f"[!] Cookie file '{cookie_file}' not found.")
            return None
            
        cookies = {}
        with open(cookie_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and '=' in line and not line.startswith('#'):
                    name, value = line.split('=', 1)
                    cookies[name.strip()] = value.strip()
        
        csrftoken = cookies.get('csrftoken')
        wwwlingqcomsa = cookies.get('wwwlingqcomsa')
        
        if csrftoken and wwwlingqcomsa:
            return {
                'csrftoken': csrftoken,
                'wwwlingqcomsa': wwwlingqcomsa
            }
        else:
            print(f"[!] Missing required cookies in '{cookie_file}'. Need 'csrftoken' and 'wwwlingqcomsa'.")
            return None
            
    except Exception as e:
        print(f"[!] Error reading cookie file: {e}")
        return None

# === MAIN ===
def main():
    # Try to get cookies automatically
    cookies = get_lingq_cookies()
    if cookies:
        print("✅ Successfully extracted cookies from Chrome.")
        CSRF_TOKEN = cookies['csrftoken']
    else:
        print("⚠️  Could not extract cookies automatically. Trying file fallback...")
        
        # Try to get cookies from file
        cookies = get_lingq_cookies_from_file()
        if cookies:
            print("✅ Successfully loaded cookies from file.")
            CSRF_TOKEN = cookies['csrftoken']
        else:
            print("❌ Could not load cookies from file either.")
            print("Please create a 'lingq_cookies.txt' file with the following format:")
            print("csrftoken=YOUR_CSRF_TOKEN_HERE")
            print("wwwlingqcomsa=YOUR_SESSION_COOKIE_HERE")
            return

    HEADERS = {
        "Accept": "application/json",
        "X-CSRFToken": CSRF_TOKEN,
        "User-Agent": "Mozilla/5.0"
    }

    # === API URL (edit params as needed) ===
    url = "https://www.lingq.com/api/languages/zh/lingqs/"

    # === MAKE THE REQUEST ===
    response = requests.get(url, headers=HEADERS, cookies=cookies)

    # === SAVE TO FILE ===
    if response.ok:
        with open("lingqs.json", "w", encoding="utf-8") as f:
            f.write(response.text)
        print("✅ Downloaded LingQ data to lingqs.json")
    else:
        print(f"❌ Failed to fetch data: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    main() 