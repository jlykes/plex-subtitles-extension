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

def import_lingq_word(text, cookies=None, headers=None):
    """
    Imports a new word into LingQ.
    
    Args:
        text (str): The Chinese word or text to import
        cookies (dict): Authentication cookies
        headers (dict): Request headers
    
    Returns:
        dict: Response data or error info
    """
    url = "https://www.lingq.com/api/v2/zh/cards/import/"
    
    # Prepare the data to send
    data = {"text": text}
    
    print(f"📥 Importing word: '{text}'")
    
    try:
        response = requests.post(url, json=data, headers=headers, cookies=cookies)
        
        print(f"   Status: {response.status_code}")
        
        if response.ok:
            # Import successful - POST requests often don't return response body
            print(f"✅ Successfully imported '{text}'")
            return {"success": True, "data": None}
        else:
            print(f"❌ Failed to import '{text}': {response.status_code}")
            if response.text:
                print(f"Response: {response.text}")
            return {"success": False, "status_code": response.status_code, "error": response.text}
            
    except Exception as e:
        print(f"❌ Exception importing '{text}': {e}")
        return {"success": False, "error": str(e)}

def search_or_import_word(text, cookies=None, headers=None):
    """
    Searches for a word and imports it if not found.
    
    Args:
        text (str): The word to search for or import
        cookies (dict): Authentication cookies
        headers (dict): Request headers
    
    Returns:
        dict: Result info with word details and whether it was imported
    """
    print(f"🔍 Searching for word: '{text}'")
    
    # First, search for the word
    search_result = search_lingq_cards(text, cookies, headers, page_size=5)
    
    if search_result["success"] and search_result["count"] > 0:
        # Word found, return the first result
        first_result = search_result["results"][0]
        print(f"✅ Word '{text}' found in database")
        return {
            "found": True,
            "imported": False,
            "word_data": first_result,
            "pk": first_result.get("pk")
        }
    else:
        # Word not found, import it
        print(f"❌ Word '{text}' not found, importing...")
        import_result = import_lingq_word(text, cookies, headers)
        
        if import_result["success"]:
            # Try to search again to get the newly imported word's details
            search_again = search_lingq_cards(text, cookies, headers, page_size=5)
            if search_again["success"] and search_again["count"] > 0:
                new_word = search_again["results"][0]
                return {
                    "found": True,
                    "imported": True,
                    "word_data": new_word,
                    "pk": new_word.get("pk")
                }
        
        return {
            "found": False,
            "imported": False,
            "error": import_result.get("error", "Unknown error")
        }

def update_word_status_by_characters(characters, status, extended_status=None, cookies=None, headers=None):
    """
    Updates a word's status by Chinese characters. Searches first, imports if not found, then updates.
    
    Args:
        characters (str): The Chinese characters to search for
        status (int): New status (0=New, 1=Learning, 2=Familiar, 3=Known)
        extended_status (int, optional): Extended status for status=3 words
        cookies (dict): Authentication cookies
        headers (dict): Request headers
    
    Returns:
        dict: Result info with word details and what actions were taken
    """
    print(f"🎯 Updating status for characters: '{characters}' to status={status}")
    if extended_status is not None:
        print(f"   Extended status: {extended_status}")
    print("=" * 50)
    
    # Step 1: Search for the word
    print("🔍 Step 1: Searching for word...")
    search_result = search_lingq_cards(characters, cookies, headers, page_size=5)
    
    word_pk = None
    was_imported = False
    
    if search_result["success"] and search_result["count"] > 0:
        # Word found
        first_result = search_result["results"][0]
        word_pk = first_result.get("pk")
        term = first_result.get("term", "N/A")
        current_status = first_result.get("status", "N/A")
        current_extended = first_result.get("extended_status", "N/A")
        
        print(f"✅ Found existing word: '{term}' (ID: {word_pk})")
        print(f"   Current status: {current_status}, extended: {current_extended}")
        was_imported = False
    else:
        # Word not found, import it
        print("❌ Word not found, importing...")
        import_result = import_lingq_word(characters, cookies, headers)
        
        if import_result["success"]:
            # Search again to get the newly imported word's details
            print("🔍 Searching for newly imported word...")
            search_again = search_lingq_cards(characters, cookies, headers, page_size=5)
            
            if search_again["success"] and search_again["count"] > 0:
                new_word = search_again["results"][0]
                word_pk = new_word.get("pk")
                term = new_word.get("term", "N/A")
                current_status = new_word.get("status", "N/A")
                current_extended = new_word.get("extended_status", "N/A")
                
                print(f"✅ Successfully imported: '{term}' (ID: {word_pk})")
                print(f"   Initial status: {current_status}, extended: {current_extended}")
                was_imported = True
            else:
                print("❌ Failed to find newly imported word")
                return {
                    "success": False,
                    "error": "Could not find word after import",
                    "imported": True,
                    "updated": False
                }
        else:
            print("❌ Failed to import word")
            return {
                "success": False,
                "error": import_result.get("error", "Import failed"),
                "imported": False,
                "updated": False
            }
    
    # Step 2: Update the word's status
    if word_pk:
        print(f"\n🔄 Step 2: Updating status...")
        update_data = {"status": status}
        if extended_status is not None:
            update_data["extended_status"] = extended_status
        
        patch_result = patch_lingq_word(word_pk, status, extended_status, cookies, headers)
        
        if patch_result["success"]:
            print(f"✅ Successfully updated word status!")
            return {
                "success": True,
                "word_pk": word_pk,
                "term": term,
                "imported": was_imported,
                "updated": True,
                "old_status": current_status,
                "old_extended": current_extended,
                "new_status": status,
                "new_extended": extended_status
            }
        else:
            print(f"❌ Failed to update word status")
            return {
                "success": False,
                "word_pk": word_pk,
                "term": term,
                "imported": was_imported,
                "updated": False,
                "error": patch_result.get("error", "Update failed")
            }
    else:
        return {
            "success": False,
            "error": "No word ID found",
            "imported": was_imported,
            "updated": False
        }

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
    print("  import <term> - Import a new word")
    print("  find <term>  - Search and import if not found")
    print("  update <characters> <status> [extended_status] - Search/import/update by Chinese characters")
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
                
            elif cmd == "import" and len(command) >= 2:
                import_term = " ".join(command[1:])
                import_lingq_word(import_term, cookies, headers)
                
            elif cmd == "find" and len(command) >= 2:
                find_term = " ".join(command[1:])
                result = search_or_import_word(find_term, cookies, headers)
                if result["found"]:
                    print(f"✅ Word ready: ID {result['pk']} (imported: {result['imported']})")
                else:
                    print(f"❌ Failed to find or import word: {result.get('error')}")
                
            elif cmd == "update" and len(command) >= 3:
                characters = command[1]
                status = int(command[2])
                extended_status = int(command[3]) if len(command) > 3 else None
                result = update_word_status_by_characters(characters, status, extended_status, cookies, headers)
                if result["success"]:
                    print(f"✅ Complete! Word '{result['term']}' (ID: {result['word_pk']})")
                    print(f"   Imported: {result['imported']}, Updated: {result['updated']}")
                    print(f"   Status: {result['old_status']} → {result['new_status']}")
                else:
                    print(f"❌ Failed: {result.get('error')}")
                
            elif cmd == "test" and len(command) >= 2:
                lingq_id = int(command[1])
                test_status_update(lingq_id, cookies, headers)
                
            else:
                print("❌ Invalid command. Use: get <id>, patch <id> <status> [extended_status], search <term>, import <term>, find <term>, update <pinyin> <status> [extended_status], test <id>, or quit")
                
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
            
        elif command == "import" and len(sys.argv) >= 3:
            import_term = " ".join(sys.argv[2:])
            import_lingq_word(import_term, cookies, HEADERS)
            
        elif command == "find" and len(sys.argv) >= 3:
            find_term = " ".join(sys.argv[2:])
            result = search_or_import_word(find_term, cookies, HEADERS)
            if result["found"]:
                print(f"✅ Word ready: ID {result['pk']} (imported: {result['imported']})")
            else:
                print(f"❌ Failed to find or import word: {result.get('error')}")
            
        elif command == "update" and len(sys.argv) >= 4:
            characters = sys.argv[2]
            status = int(sys.argv[3])
            extended_status = int(sys.argv[4]) if len(sys.argv) > 4 else None
            result = update_word_status_by_characters(characters, status, extended_status, cookies, HEADERS)
            if result["success"]:
                print(f"✅ Complete! Word '{result['term']}' (ID: {result['word_pk']})")
                print(f"   Imported: {result['imported']}, Updated: {result['updated']}")
                print(f"   Status: {result['old_status']} → {result['new_status']}")
            else:
                print(f"❌ Failed: {result.get('error')}")
            
        elif command == "test" and len(sys.argv) >= 3:
            lingq_id = int(sys.argv[2])
            test_status_update(lingq_id, cookies, HEADERS)
            
        else:
            print("Usage:")
            print("  python lingq_patch.py get <lingq_id>")
            print("  python lingq_patch.py patch <lingq_id> <status> [extended_status]")
            print("  python lingq_patch.py search <term>")
            print("  python lingq_patch.py import <term>")
            print("  python lingq_patch.py find <term>")
            print("  python lingq_patch.py update <characters> <status> [extended_status]")
            print("  python lingq_patch.py test <lingq_id>")
            print("  python lingq_patch.py interactive")
    else:
        # Start interactive mode
        interactive_mode(cookies, HEADERS)

if __name__ == "__main__":
    main() 