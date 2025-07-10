import requests
import browser_cookie3

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