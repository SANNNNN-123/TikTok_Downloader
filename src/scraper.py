from playwright.async_api import async_playwright
import time
from typing import Dict, Optional
import os
import logging

async def get_user_info(username: str) -> Optional[Dict]:
    try:
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
            if "BROWSER_PLAYWRIGHT_ENDPOINT" in os.environ:
                browser = await p.chromium.connect(os.environ["BROWSER_PLAYWRIGHT_ENDPOINT"])
                logging.debug("Using Railway Browser Endpoint")
            else:
                browser = await p.chromium.launch(**browser_options)

            context = await browser.new_context(
                viewport={'width': 800, 'height': 600},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                java_script_enabled=True,
                bypass_csp=True,
                ignore_https_errors=True
            )
            
            # Block unnecessary resources
            await context.route("**/*analytics*.js", lambda route: route.abort())
            await context.route("**/*tracking*.js", lambda route: route.abort())
            await context.route("**/*advertisement*.js", lambda route: route.abort())

            page = await context.new_page()
            page.set_default_timeout(5000)  # 5 seconds timeout

            try:
                profile_url = f"https://www.tiktok.com/@{username}"
                response = await page.goto(profile_url, wait_until="domcontentloaded")

                # More comprehensive response checking
                if not response:
                    logging.debug(f"No response received for {username}")
                    return None
                
                if response.status != 200:
                    logging.debug(f"User {username} not found (HTTP status: {response.status})")
                    return None

                # Wait for either error page or user profile indicators
                try:
                    await page.wait_for_selector('div[data-e2e="error-page"], h1[data-e2e="user-title"], h1[data-e2e="user-subtitle"]', timeout=5000)
                except Exception as e:
                    logging.debug(f"Timeout waiting for profile indicators: {str(e)}")
                    return None

                # Check for error page
                error_page = await page.locator('div[data-e2e="error-page"]').count()
                if error_page > 0:
                    logging.debug(f"User {username} does not exist (error page detected)")
                    return None

                # Initialize profile data
                profile_data = {
                    'username': username,
                    'name': username,  # Default value
                    'following': '0',
                    'followers': '0',
                    'likes': '0',
                    'is_private': False,
                    'is_verified': False,
                    'profile_pic': None
                }

                # Get display name with error handling
                try:
                    name_element = await page.wait_for_selector('h1[data-e2e="user-title"], h1[data-e2e="user-subtitle"]', timeout=3000)
                    if name_element:
                        profile_data['name'] = await name_element.text_content() or username
                except Exception:
                    logging.debug(f"Could not get display name for {username}")

                # Get stats with individual error handling
                try:
                    following = await page.locator('strong[data-e2e="following-count"]').text_content()
                    profile_data['following'] = following or '0'
                except Exception:
                    logging.debug("Could not get following count")

                try:
                    followers = await page.locator('strong[data-e2e="followers-count"]').text_content()
                    profile_data['followers'] = followers or '0'
                except Exception:
                    logging.debug("Could not get followers count")

                try:
                    likes = await page.locator('strong[data-e2e="likes-count"]').text_content()
                    profile_data['likes'] = likes or '0'
                except Exception:
                    logging.debug("Could not get likes count")

                # Check if account is private
                try:
                    private_indicators = [
                        await page.locator('svg[data-e2e="private-account"]').count(),
                        await page.locator('div[data-e2e="user-private"]').count(),
                        await page.get_by_text("This account is private").count()
                    ]
                    profile_data['is_private'] = any(count > 0 for count in private_indicators)
                except Exception:
                    logging.debug("Could not check private status")

                # Check verification status
                try:
                    verified_selectors = [
                        'svg[data-e2e] circle[fill="#20D5EC"]',
                        'svg[data-e2e] path[fill="white"][d*="M37.1213"]'
                    ]
                    
                    for selector in verified_selectors:
                        try:
                            count = await page.locator(selector).count()
                            if count > 0:
                                profile_data['is_verified'] = True
                                break
                        except Exception:
                            continue
                except Exception:
                    logging.debug("Could not check verification status")

                # Get profile picture
                try:
                    profile_pic = await page.locator('span img.css-1zpj2q-ImgAvatar').get_attribute('src')
                    profile_data['profile_pic'] = profile_pic
                except Exception:
                    logging.debug("Could not get profile picture")

                # Validate that we got at least some basic data
                if not any([
                    profile_data['following'] != '0',
                    profile_data['followers'] != '0',
                    profile_data['likes'] != '0',
                    profile_data['profile_pic'] is not None
                ]):
                    logging.debug(f"Could not get any profile data for {username}")
                    return None

                return profile_data

            except Exception as e:
                logging.error(f"Error processing profile for {username}: {str(e)}")
                return None

            finally:
                await page.close()
                end_time = time.time()
                logging.debug(f"Profile check completed in {end_time - start_time:.2f} seconds")

    except Exception as e:
        logging.error(f"An error occurred while checking profile {username}: {str(e)}")
        return None