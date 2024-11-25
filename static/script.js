document.addEventListener('DOMContentLoaded', function () {
    
    // Sidebar menu open and close
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const content = document.querySelector('.content');

    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        
        if (sidebar.classList.contains('collapsed')) {
            content.style.marginLeft = `${getComputedStyle(document.documentElement).getPropertyValue('--sidebar-collapsed-width')}`;
        } else {
            content.style.marginLeft = `${getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')}`;
        }
    });
    
    
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
    const loadingState = document.getElementById('loading-state');

    // Initialize Lucide icons
    lucide.createIcons();

    // Search functionality
    if (searchButton && searchInput && searchResults) {
        searchButton.addEventListener('click', async function (e) {
            e.preventDefault();
            const username = searchInput.value.trim();
    
            if (username) {
                // Reset and show loading elements
                searchButton.disabled = true;
                const loadingContainer = document.getElementById('loading-container');
                const progressBar = document.getElementById('progress-bar');
                const progressText = document.getElementById('progress-text');
                
                loadingContainer.style.display = 'block';
                searchResults.textContent = '';
                if (profileInfo) profileInfo.style.display = 'none';
    
                // Simulate progress while waiting for API response
                let progress = 0;
                const progressInterval = setInterval(() => {
                    if (progress < 90) {  // Only go up to 90% until we get actual response
                        progress += Math.random() * 3;  // Random increment for more natural feel
                        progress = Math.min(progress, 90);  // Don't exceed 90%
                        progressBar.style.width = `${progress}%`;
                        progressText.textContent = `${Math.round(progress)}%`;
                    }
                }, 200);
    
                try {
                    const formData = new FormData();
                    formData.append('name', username);
    
                    const response = await fetch('/api/search', {
                        method: 'POST',
                        body: formData
                    });
    
                    const data = await response.json();
                    
                    // Complete the progress bar
                    clearInterval(progressInterval);
                    progressBar.style.width = '100%';
                    progressText.textContent = '100%';
                    
                    // Hide loading container after a short delay
                    setTimeout(() => {
                        loadingContainer.style.display = 'none';
                        
                        if (data.status === 'success') {
                            // Display success message
                            const successMessage = document.createElement('div');
                            successMessage.className = 'alert alert-success';
                            const sourceText = data.source === 'cache' ? 
                                'Retrieved from cache' : 
                                'Fetched new data';
                            successMessage.textContent = `${sourceText}: Found profile data for @${username}`;
                            searchResults.appendChild(successMessage);
    
                            // Update profile information
                            if (data.profile) {
                                updateProfileDisplay(data.profile);
                                
                                if (dataSource) {
                                    dataSource.textContent = `Data source: ${data.source === 'cache' ? 'Database Cache' : 'Fresh Data'}`;
                                    dataSource.className = `badge ${data.source === 'cache' ? 'bg-info' : 'bg-success'}`;
                                }
                            }
    
                            // Store username and enable analyze button
                            localStorage.setItem('currentUsername', username);
                            const analyzeButton = document.getElementById('analyze-profile');
                            if (analyzeButton) {
                                analyzeButton.disabled = false;
                            }
                        } else {
                            // Display an error message
                            //console.log('Failed to retreived data', data.message);
                            const errorMessage = document.createElement('div');
                            errorMessage.className = 'alert alert-danger';
                            errorMessage.textContent = data.message;
                            searchResults.appendChild(errorMessage);
                        }
                    }, 500);
    
                } catch (error) {
                    clearInterval(progressInterval);
                    console.error('Error:', error);
                    loadingContainer.style.display = 'none';
                    showError('An error occurred while searching. Please try again.');
                } finally {
                    searchButton.disabled = false;
                }
            }
        });
    }

    // Profile display update function
    function updateProfileDisplay(userInfo) {
        if (profilePic) profilePic.src = userInfo.profile_pic || '/static/default-profile.png';
        if (profileName) profileName.textContent = userInfo.name || userInfo.username;
        if (following) following.textContent = `Following: ${userInfo.following?.toLocaleString() || '0'}`;
        if (followers) followers.textContent = `Followers: ${userInfo.followers?.toLocaleString() || '0'}`;
        if (likes) likes.textContent = `Likes: ${userInfo.likes?.toLocaleString() || '0'}`;

        if (verifiedIcon) {
            verifiedIcon.style.display = userInfo.is_verified ? 'inline-flex' : 'none';
        }

        if (profileInfo) {
            profileInfo.style.display = 'block';
        }
    }

    // Overview page functionality
    if (window.location.pathname === '/overview') {
        const urlParams = new URLSearchParams(window.location.search);
        const username = urlParams.get('username');
        
        if (username) {
            loadOverviewData(username);
        } else {
            hideLoading();
            window.location.href = '/';
        }
    }

    function showLoading() {
        if (loadingState) {
            loadingState.style.display = 'flex';
            loadingState.classList.remove('hidden');
        }
    }
    
    function hideLoading() {
        if (loadingState) {
            loadingState.style.display = 'none';
            loadingState.classList.add('hidden');
        }
    }


    // Load overview data function
    async function loadOverviewData(username) {
        const trendsContainer = document.getElementById('performanceGraph');
        const topVideosContainer = document.getElementById('topVideos');
        //const performanceStatsContainer = document.getElementById('performanceStats');
        const durationBreakdownContainer = document.getElementById('durationBreakdown');
        const activeDaysChartContainer = document.getElementById('activeDaysChart');
        const engagementStatContainer = document.getElementById('engagementStats')

        showLoading(); 

        try {
            console.log('Fetching overview data for:', username);
            const response = await fetch(`/api/overview/${encodeURIComponent(username)}`);
            const data = await response.json();
            console.log('Received overview data:', data);

            if (data.status === 'success') {
                console.log('Profile data:', data.user_info);
                console.log('Performance Trends:', data.trends);
                console.log('Top Videos:', data.topVideos);
                console.log('Duration Breakdown:', data.duration_breakdown);
                console.log('Active Days:', data.active_days);
                console.log('Engagement data:', data.engagement_section);

                // Render performance stats
                if (data.engagement_section && engagementStatContainer) {
                    renderEngagementStats(data.engagement_section,data.user_info );
                } else {
                    console.log('Engagement stats data is missing or invalid');
                    engagementStatContainer.innerHTML = '<p>No engagement stats available</p>';
                }

                // Render performance trends graph
                if (data.trends && data.trends.graph && trendsContainer) {
                    const graphData = data.trends.graph;
                    Plotly.newPlot('performanceGraph', graphData.data, graphData.layout);
                }

                // Render top videos
                if (data.topVideos && data.topVideos.videos && topVideosContainer) {
                    renderTopVideos(data.topVideos.videos);
                }

                // Render active days chart
                if (data.active_days && activeDaysChartContainer) {
                    try {
                        const activeDaysData = data.active_days;
                        console.log('activeDaysData', activeDaysData)
                        Plotly.newPlot('activeDaysChart', activeDaysData.graph.data, activeDaysData.graph.layout);
                    } catch (error) {
                        console.error('Error parsing active days data:', error);
                        activeDaysChartContainer.innerHTML = '<p>Error loading active days chart</p>';
                    }
                } else {
                    console.log('Active days data is missing or invalid');
                    activeDaysChartContainer.innerHTML = '<p>No active days data available</p>';
                }

                // Render duration breakdown
                if (data.duration_breakdown && durationBreakdownContainer) {
                    try {
                        const durationData = data.duration_breakdown;
                        console.log('durationData', durationData)
                        Plotly.newPlot('durationBreakdown', durationData.graph.data, durationData.graph.layout);
                    } catch (error) {
                        console.error('Error parsing duration breakdown data:', error);
                        durationBreakdownContainer.innerHTML = '<p>Error loading duration breakdown</p>';
                    }
                } else {
                    console.log('Duration breakdown data is missing or invalid');
                    durationBreakdownContainer.innerHTML = '<p>No duration breakdown available</p>';
                }

                
            } else {
                console.error('Failed to load overview data:', data.message);
                showError(data.message || 'Failed to load overview data');
            }
        } catch (error) {
            console.error('Error loading overview:', error);
            showError('An error occurred while loading overview data');
        } finally {
            hideLoading(); // Hide loading state regardless of success or failure
        }
    }

    // Render top videos function
    function renderTopVideos(videos) {
        const videosContainer = document.getElementById('topVideos');
        if (!videosContainer) {
            console.error('Videos container not found');
            return;
        }

        console.log('Rendering top videos:', videos);

        if (!Array.isArray(videos) || videos.length === 0) {
            console.log('No videos found or invalid data');
            videosContainer.innerHTML = '<p>No videos found</p>';
            return;
        }

        videosContainer.innerHTML = '';

        videos.forEach((video, index) => {
            console.log(`Rendering video ${index + 1}:`, video);
            const videoCard = document.createElement('div');
            videoCard.className = 'video-card';
            videoCard.style.cursor = 'pointer';
            videoCard.innerHTML = `
                <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail">
                <div class="video-info">
                    <h4 class="video-title">${video.title || 'Untitled Video'}</h4>
                    <div class="video-stats">
                        <div class="stat-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                            </svg>
                            ${formatNumber(video.like_count || 0)}
                        </div>
                        <div class="stat-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                            </svg>
                            ${formatNumber(video.comment_count || 0)}
                        </div>
                    </div>
                </div>
            `;

            videoCard.addEventListener('click', () => {
                if (video.original_url) {
                    window.open(video.original_url, '_blank');
                }
            });

            videosContainer.appendChild(videoCard);
        });
    }

    function renderEngagementStats(stats,userstats) {
        const engagementStats = stats.performance;
        const engagementContainer = document.getElementById('engagementStats');
        if (!engagementContainer) {
            console.error('Engagement stats container not found');
            return;
        }
    
        if (!engagementStats || Object.keys(engagementStats).length === 0) {
            engagementContainer.innerHTML = '<p>No engagement stats available</p>';
            return;
        }

        // Function to get rating badge class
        function getRatingClass(rating) {
            const ratingMap = {
                'High': 'rating-high',
                'Medium': 'rating-medium',
                'Low': 'rating-low'
            };
            return ratingMap[rating] || '';
        }
    
        engagementContainer.innerHTML = `
            <div class="engagement-stat">
                <div class="stat-card">
                    <div class="icon-wrapper orange">
                        <i data-lucide="flame"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">
                            ${engagementStats.engagement_rate.toFixed(2)}%
                            <span class="rating-badge ${getRatingClass(engagementStats.profile_rating)}">
                                ${engagementStats.profile_rating}
                            </span>
                        </div>
                        <div class="stat-label">
                        Engagement rate
                        <span class="info-icon">
                            <i data-lucide="info"></i>
                            <span class="tooltip">Engagement rate is calculated based on average likes, comments, and shares per post relative to follower count</span>
                        </span>
                    </div>
                    </div>
                </div>  
                <div class="stat-card">
                    <div class="icon-wrapper blue">
                        <i data-lucide="users"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${userstats.followers}</div>
                        <div class="stat-label">Followers</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="icon-wrapper pink">
                        <i data-lucide="heart"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${formatNumber(engagementStats.avg_likes_per_post)}</div>
                        <div class="stat-label">Average likes per post</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="icon-wrapper purple">
                        <i data-lucide="message-circle"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${formatNumber(engagementStats.avg_comments_per_post)}</div>
                        <div class="stat-label">Average comments per post</div>
                    </div>
                </div>
            </div>
        `;
    
        // Refresh Lucide icons
        lucide.createIcons();
    }

    // Error display function
    function showError(message) {
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
    
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';
        errorDiv.textContent = message;
        
        const container = document.querySelector('.container');
        if (container) {
            if (container.firstChild) {
                container.insertBefore(errorDiv, container.firstChild);
            } else {
                container.appendChild(errorDiv);
            }
        }
    
        // Remove error after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    // Analyze profile button handler
    const analyzeButton = document.getElementById('analyze-profile');
    if (analyzeButton) {
        analyzeButton.addEventListener('click', function () {
            const username = localStorage.getItem('currentUsername');
            if (username) {
                window.location.href = `/overview?username=${encodeURIComponent(username)}`;
            } else {
                showError('Please search for a profile first.');
            }
        });
        
        // Initially disable the analyze button
        analyzeButton.disabled = true;
    }

    // Helper function to format numbers
    function formatNumber(num) {
        if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
});

