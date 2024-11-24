document.addEventListener('DOMContentLoaded', function () {
    // Highlight the current page in the navigation
    const currentPage = window.location.pathname.split('/').pop();
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.getAttribute('data-page') === currentPage) {
            item.classList.add('active');
        }
    });

    // Elements related to the search functionality
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const profileInfo = document.getElementById('profile-info');
    const profilePic = document.getElementById('profile-pic');
    const profileName = document.getElementById('profile-name');
    const verifiedIcon = document.getElementById('verified-icon');
    const following = document.getElementById('following');
    const followers = document.getElementById('followers');
    const likes = document.getElementById('likes');
    const dataSource = document.getElementById('data-source');

    // Search button click event listener
    if (searchButton && searchInput && searchResults) {
        searchButton.addEventListener('click', async function (e) {
            e.preventDefault();
            const username = searchInput.value.trim();

            if (username) {
                // Display a loading state
                searchButton.disabled = true;
                searchResults.textContent = 'Searching...';
                profileInfo.style.display = 'none';

                try {
                    const formData = new FormData();
                    formData.append('name', username);

                    // Send a POST request to the API
                    const response = await fetch('/api/search', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();
                    searchResults.textContent = ''; // Clear search results

                    if (data.status === 'success') {
                        // Display a success message
                        const successMessage = document.createElement('div');
                        successMessage.className = 'alert alert-success';
                        
                        // Customize message based on data source
                        const sourceText = data.source === 'cache' ? 
                            'Retrieved from database' : 
                            'Fetched new data';
                        
                        successMessage.textContent = `${sourceText}: Found profile data for @${username}`;
                        searchResults.appendChild(successMessage);

                        // Update the profile information
                        if (data.profile) {
                            updateProfileDisplay(data.profile);
                            
                            // Display data source indicator
                            if (dataSource) {
                                dataSource.textContent = `Data source: ${data.source === 'cache' ? 'Database Cache' : 'Fresh Data'}`;
                                dataSource.className = `badge ${data.source === 'cache' ? 'bg-info' : 'bg-success'}`;
                            }
                        }

                        // Store the username in localStorage for the overview page
                        localStorage.setItem('currentUsername', username);
                        
                        // Enable the analyze button
                        const analyzeButton = document.getElementById('analyze-profile');
                        if (analyzeButton) {
                            analyzeButton.disabled = false;
                        }
                    } else {
                        // Display an error message
                        const errorMessage = document.createElement('div');
                        errorMessage.className = 'alert alert-danger';
                        errorMessage.textContent = data.message || 'An error occurred while searching.';
                        searchResults.appendChild(errorMessage);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    const errorElement = document.createElement('div');
                    errorElement.className = 'alert alert-danger';
                    errorElement.textContent =
                        'An error occurred while searching. Please try again.';
                    searchResults.appendChild(errorElement);
                } finally {
                    searchButton.disabled = false; // Re-enable the button
                }
            }
        });
    }

    // Update the profile information display
    function updateProfileDisplay(userInfo) {
        if (profilePic) profilePic.src = userInfo.profile_pic || '/static/default-profile.png';
        if (profileName) profileName.textContent = userInfo.name || userInfo.username;
        if (following) following.textContent = `Following: ${userInfo.following?.toLocaleString() || '0'}`;
        if (followers) followers.textContent = `Followers: ${userInfo.followers?.toLocaleString() || '0'}`;
        if (likes) likes.textContent = `Likes: ${userInfo.likes?.toLocaleString() || '0'}`;

        // Toggle the visibility of the verified icon
        if (verifiedIcon) {
            verifiedIcon.style.display = userInfo.is_verified ? 'inline-flex' : 'none';
        }

        // Ensure the profile info section is visible
        if (profileInfo) {
            profileInfo.style.display = 'block';
        }
    }

    // Analyze profile button click handler
    const analyzeButton = document.getElementById('analyze-profile');
    if (analyzeButton) {
        analyzeButton.addEventListener('click', function () {
            const username = localStorage.getItem('currentUsername');
            if (username) {
                window.location.href = `/overview?username=${encodeURIComponent(username)}`;
            } else {
                // Show error if no username is stored
                const errorElement = document.createElement('div');
                errorElement.className = 'alert alert-danger';
                errorElement.textContent = 'Please search for a profile first.';
                searchResults.appendChild(errorElement);
            }
        });
        
        // Initially disable the analyze button
        analyzeButton.disabled = true;
    }
});