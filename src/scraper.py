from playwright.async_api import async_playwright
import time
from typing import Dict, Optional
import os
import logging

async def get_user_info(username: str) -> Optional[Dict]:
    try:
        #print(f"Starting scraping for username: {username}")
        start_time = time.time()

        browser_options = {
            "headless": True,
            "args": [
                "--disable-gpu",
                "--disable-dev-shm-usage",
                "--disable-setuid-sandbox",
                "--no-first-run",
                "--no-sandbox",
                "--no-zygote",
                "--deterministic-fetch",
                "--disable-features=IsolateOrigins",
                "--disable-site-isolation-trials",
                "--disable-features=BlockInsecurePrivateNetworkRequests"
            ]
        }

        async with async_playwright() as p:

            ##documentation to deploy at Railway
            #https://railway.app/template/browserless
            #https://github.com/brody192/playwright-example-python

            if "BROWSER_PLAYWRIGHT_ENDPOINT" in os.environ:
                browser = await p.chromium.connect(os.environ["BROWSER_PLAYWRIGHT_ENDPOINT"])
                print("Using Railway Browser Endpoint")
                logging.debug(f"Using Railway Browser Endpoint")
            else:
                browser = await p.chromium.launch(**browser_options)
                
            #browser = await p.chromium.launch(**browser_options)
            #print("Browser launched successfully.")

            context = await browser.new_context(
                viewport={'width': 800, 'height': 600},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                java_script_enabled=True,
                bypass_csp=True,
                ignore_https_errors=True
            )
            
            await context.route("**/*analytics*.js", lambda route: route.abort())
            await context.route("**/*tracking*.js", lambda route: route.abort())
            await context.route("**/*advertisement*.js", lambda route: route.abort())

            page = await context.new_page()

            profile_url = f"https://www.tiktok.com/@{username}"
            #print(f"Navigating to {profile_url}...")
            await page.goto(profile_url, wait_until="domcontentloaded")

            #print("Extracting profile information...")
            profile_data = {
                'username': username
            }

            try:
                try:
                    profile_data['name'] = await page.locator('h1[data-e2e="user-title"]').text_content()
                except:
                    try:
                        profile_data['name'] = await page.locator('h1[data-e2e="user-subtitle"]').text_content()
                    except:
                        profile_data['name'] = username
                profile_data['following'] = await page.locator('strong[data-e2e="following-count"]').text_content()
                profile_data['followers'] = await page.locator('strong[data-e2e="followers-count"]').text_content()
                profile_data['likes'] = await page.locator('strong[data-e2e="likes-count"]').text_content()
                
                # Check if account is private
                private_lock = await page.locator('svg[data-e2e="private-account"]').count()
                private_text = await page.locator('div[data-e2e="user-private"]').count()
                private_message = await page.get_by_text("This account is private").count()
                profile_data['is_private'] = (private_lock > 0) or (private_text > 0) or (private_message > 0)

                # Blue Check (Verification)
                verified_selectors = [
                    'svg[data-e2e] circle[fill="#20D5EC"]',  # Blue circle of verification badge
                    'svg[data-e2e] path[fill="white"][d*="M37.1213"]',  # White checkmark inside
                ]
                
                is_verified = False
                for selector in verified_selectors:
                    count = await page.locator(selector).count()
                    if count > 0:
                        is_verified = True
                        break   
                profile_data['is_verified'] = is_verified

                profile_data['profile_pic'] = await page.locator('span img.css-1zpj2q-ImgAvatar').get_attribute('src')
            except Exception as e:
                print(f"Error extracting data: {e}")
                return None

            #print("Closing browser...")
            #await context.close()
            #await browser.close()
            # Clean up resources
            await page.close()  # Explicitly close the page to free up memory

            end_time = time.time()
            print(f"Time completed in {end_time - start_time:.2f} seconds")

            return profile_data
        
    except Exception as e:
        print(f"An error occurred: {e}")
        return None