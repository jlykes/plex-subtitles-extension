import requests
import browser_cookie3
import json
import sys

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

# === PATCH REQUEST FUNCTIONS ===
def patch_lingq_word(lingq_id, status, extended_status=None, cookies=None, headers=None):
    """
    Updates a LingQ word's status using PATCH request.
    
    Args:
        lingq_id (int): The LingQ ID of the word to update
        status (int): New status (0=New, 1=Learning, 2=Familiar, 3=Known)
        extended_status (int, optional): Extended status for status=3 words
        cookies (dict): Authentication cookies
        headers (dict): Request headers
    
    Returns:
        dict: Response data or error info
    """
    url = f"https://www.lingq.com/api/v3/zh/cards/{lingq_id}/"
    
    # Prepare the data to send
    data = {"status": status}
    if extended_status is not None:
        data["extended_status"] = extended_status
    
    print(f"🔄 Patching LingQ {lingq_id}: {data}")
    
    try:
        response = requests.patch(url, json=data, headers=headers, cookies=cookies)
        
        if response.ok:
            print(f"✅ Successfully updated LingQ {lingq_id}")
            return {"success": True, "data": response.json()}
        else:
            print(f"❌ Failed to update LingQ {lingq_id}: {response.status_code}")
            print(f"Response: {response.text}")
            return {"success": False, "status_code": response.status_code, "error": response.text}
            
    except Exception as e:
        print(f"❌ Exception updating LingQ {lingq_id}: {e}")
        return {"success": False, "error": str(e)}

def get_lingq_details(lingq_id, cookies=None, headers=None):
    """
    Gets details for a specific LingQ word.
    
    Args:
        lingq_id (int): The LingQ ID to fetch
        cookies (dict): Authentication cookies
        headers (dict): Request headers
    
    Returns:
        dict: Response data or error info
    """
    url = f"https://www.lingq.com/api/v3/zh/cards/{lingq_id}/"
    
    print(f"🔍 Fetching details for LingQ {lingq_id}")
    
    try:
        response = requests.get(url, headers=headers, cookies=cookies)
        
        if response.ok:
            data = response.json()
            print(f"✅ Retrieved LingQ {lingq_id}: status={data.get('status')}, extended_status={data.get('extended_status')}")
            return {"success": True, "data": data}
        else:
            print(f"❌ Failed to fetch LingQ {lingq_id}: {response.status_code}")
            return {"success": False, "status_code": response.status_code, "error": response.text}
            
    except Exception as e:
        print(f"❌ Exception fetching LingQ {lingq_id}: {e}")
        return {"success": False, "error": str(e)}

def search_lingq_cards(search_term, cookies=None, headers=None, page=1, page_size=25, search_criteria="contains", sort="alpha", statuses=None):
    """
    Searches for LingQ cards by term.
    
    Args:
        search_term (str): The search term (Chinese characters, pinyin, or English)
        cookies (dict): Authentication cookies
        headers (dict): Request headers
        page (int): Page number for pagination
        page_size (int): Number of results per page
        search_criteria (str): Search criteria ("contains", "exact", etc.)
        sort (str): Sort order ("alpha", "date", etc.)
        statuses (list): List of status values to include (0,1,2,3,4)
    
    Returns:
        dict: Response data or error info
    """
    url = "https://www.lingq.com/api/v3/zh/cards/"
    
    # Build query parameters
    params = {
        "page": page,
        "page_size": page_size,
        "search": search_term,
        "search_criteria": search_criteria,
        "sort": sort
    }
    
    # Add status filters if provided
    if statuses:
        for status in statuses:
            params[f"status"] = status
    
    print(f"🔍 Searching for: '{search_term}' with params: {params}")
    
    try:
        response = requests.get(url, params=params, headers=headers, cookies=cookies)
        
        if response.ok:
            data = response.json()
            results = data.get("results", [])
            count = data.get("count", 0)
            
            print(f"✅ Found {count} results (showing {len(results)} on this page)")
            
            # Display results in a nice format
            for i, card in enumerate(results, 1):
                term = card.get("term", "N/A")
                status = card.get("status", "N/A")
                extended_status = card.get("extended_status", "N/A")
                card_id = card.get("pk", "N/A")  # Use 'pk' field for the ID
                fragment = card.get("fragment", "N/A")
                print(f"  {i}. ID: {card_id} | Term: '{term}' | Status: {status} | Extended: {extended_status}")
                print(f"     Fragment: {fragment}")
            
            return {"success": True, "data": data, "count": count, "results": results}
        else:
            print(f"❌ Failed to search: {response.status_code}")
            print(f"Response: {response.text}")
            return {"success": False, "status_code": response.status_code, "error": response.text}
            
    except Exception as e:
        print(f"❌ Exception searching: {e}")
        return {"success": False, "error": str(e)}

# === TEST FUNCTIONS ===
def test_status_update(lingq_id, cookies, headers):
    """
    Test function to cycle through different statuses for a word.
    """
    print(f"\n🧪 Testing status updates for LingQ {lingq_id}")
    print("=" * 50)
    
    # Test different status combinations
    test_cases = [
        {"status": 0, "extended_status": None, "name": "New"},
        {"status": 1, "extended_status": None, "name": "Learning"},
        {"status": 2, "extended_status": None, "name": "Familiar"},
        {"status": 3, "extended_status": 0, "name": "Learned"},
        {"status": 3, "extended_status": 3, "name": "Known"},
    ]
    
    for test_case in test_cases:
        print(f"\n📝 Testing: {test_case['name']} (status={test_case['status']}, extended_status={test_case['extended_status']})")
        
        # Update the word
        result = patch_lingq_word(
            lingq_id, 
            test_case['status'], 
            test_case['extended_status'],
            cookies, 
            headers
        )
        
        if result["success"]:
            # Verify the update by fetching the word again
            verify_result = get_lingq_details(lingq_id, cookies, headers)
            if verify_result["success"]:
                data = verify_result["data"]
                print(f"✅ Verified: status={data.get('status')}, extended_status={data.get('extended_status')}")
            else:
                print(f"⚠️ Could not verify update: {verify_result.get('error')}")
        
        # Small delay between requests
        import time
        time.sleep(1)

def interactive_mode(cookies, headers):
    """
    Interactive mode for testing PATCH requests.
    """
    print("\n🎮 Interactive PATCH Testing Mode")
    print("=" * 40)
    print("Commands:")
    print("  get <id>     - Get details for a LingQ")
    print("  patch <id> <status> [extended_status] - Update a LingQ")
    print("  search <term> - Search for LingQ cards")
    print("  test <id>    - Run full status cycle test")
    print("  quit         - Exit")
    print()
    
    while True:
        try:
            command = input("> ").strip().split()
            if not command:
                continue
                
            cmd = command[0].lower()
            
            if cmd == "quit":
                print("👋 Goodbye!")
                break
                
            elif cmd == "get" and len(command) >= 2:
                lingq_id = int(command[1])
                get_lingq_details(lingq_id, cookies, headers)
                
            elif cmd == "patch" and len(command) >= 3:
                lingq_id = int(command[1])
                status = int(command[2])
                extended_status = int(command[3]) if len(command) > 3 else None
                patch_lingq_word(lingq_id, status, extended_status, cookies, headers)
                
            elif cmd == "search" and len(command) >= 2:
                search_term = " ".join(command[1:])
                search_lingq_cards(search_term, cookies, headers)
                
            elif cmd == "test" and len(command) >= 2:
                lingq_id = int(command[1])
                test_status_update(lingq_id, cookies, headers)
                
            else:
                print("❌ Invalid command. Use: get <id>, patch <id> <status> [extended_status], search <term>, test <id>, or quit")
                
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except ValueError as e:
            print(f"❌ Invalid number: {e}")
        except Exception as e:
            print(f"❌ Error: {e}")

# === MAIN ===
def main():
    print("🔧 LingQ PATCH Testing Tool")
    print("=" * 30)
    
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
        "Content-Type": "application/json",
        "X-CSRFToken": CSRF_TOKEN,
        "User-Agent": "Mozilla/5.0"
    }

    # Check if command line arguments are provided
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "get" and len(sys.argv) >= 3:
            lingq_id = int(sys.argv[2])
            get_lingq_details(lingq_id, cookies, HEADERS)
            
        elif command == "patch" and len(sys.argv) >= 4:
            lingq_id = int(sys.argv[2])
            status = int(sys.argv[3])
            extended_status = int(sys.argv[4]) if len(sys.argv) > 4 else None
            patch_lingq_word(lingq_id, status, extended_status, cookies, HEADERS)
            
        elif command == "search" and len(sys.argv) >= 3:
            search_term = " ".join(sys.argv[2:])
            search_lingq_cards(search_term, cookies, HEADERS)
            
        elif command == "test" and len(sys.argv) >= 3:
            lingq_id = int(sys.argv[2])
            test_status_update(lingq_id, cookies, HEADERS)
            
        else:
            print("Usage:")
            print("  python lingq_patch.py get <lingq_id>")
            print("  python lingq_patch.py patch <lingq_id> <status> [extended_status]")
            print("  python lingq_patch.py search <term>")
            print("  python lingq_patch.py test <lingq_id>")
            print("  python lingq_patch.py interactive")
    else:
        # Start interactive mode
        interactive_mode(cookies, HEADERS)

if __name__ == "__main__":
    main() 