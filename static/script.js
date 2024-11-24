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

    // Search button click event listener
    if (searchButton && searchInput && searchResults) {
        searchButton.addEventListener('click', async function (e) {
            e.preventDefault();
            const username = searchInput.value.trim();

            if (username) {
                // Display a loading state
                searchButton.disabled = true;
                searchResults.textContent = 'Searching...';

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

                    if (data.success) {
                        // Display a success message
                        const successMessage = document.createElement('div');
                        successMessage.className = 'alert alert-success';
                        successMessage.textContent = data.message;
                        searchResults.appendChild(successMessage);

                        // Update the profile information if userInfo exists
                        if (data.userInfo) {
                            updateProfileDisplay(data.userInfo);
                        }
                    } else {
                        // Display an error message
                        const errorMessage = document.createElement('div');
                        errorMessage.className = 'alert alert-danger';
                        errorMessage.textContent = data.message;
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
        profilePic.src = userInfo.profile_pic;
        profileName.textContent = userInfo.name;
        following.textContent = `Following: ${userInfo.following}`;
        followers.textContent = `Followers: ${userInfo.followers}`;
        likes.textContent = `Likes: ${userInfo.likes}`;

        // Toggle the visibility of the verified icon
        if (userInfo.is_verified) {
            verifiedIcon.style.display = 'inline-flex';
        } else {
            verifiedIcon.style.display = 'none';
        }

        // Ensure the profile info section is visible
        profileInfo.style.display = 'block';
    }

    document.getElementById('analyze-profile').addEventListener('click', function () {
        // Redirect to overview.html
        window.location.href = '/overview';
    });
    
});


