document.addEventListener('DOMContentLoaded', function () {

    // Highlight the current page in the navigation
    const currentPage = window.location.pathname.split('/').pop();
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.getAttribute('data-page') === currentPage) {
            item.classList.add('active');
        }
    });


    // Comments form
    if (currentPage === 'comments') {
        const form = document.getElementById('feedbackForm');
        const stars = document.querySelectorAll('.star-rating input');
        const popup = document.getElementById('popup');
        const popupMessage = document.getElementById('popup-message');
        const closePopup = document.querySelector('.close');

        if (form && stars.length && popup && popupMessage && closePopup) {
            stars.forEach((star) => {
                star.addEventListener('change', () => {
                    const rating = star.value;
                    stars.forEach((s, index) => {
                        if (index < rating) {
                            s.nextElementSibling.style.color = '#ffca08';
                        } else {
                            s.nextElementSibling.style.color = '#ddd';
                        }
                    });
                });
            });

            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const formData = new FormData(form);
                
                fetch('/comments', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    popupMessage.textContent = data.message;
                    popup.style.display = 'block';
                    popup.querySelector('.popup-content').className = `popup-content ${data.status}`;
                    
                    if (data.status === 'success') {
                        form.reset();
                        stars.forEach(s => s.nextElementSibling.style.color = '#ddd');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    popupMessage.textContent = 'An unexpected error occurred. Please try again.';
                    popup.style.display = 'block';
                    popup.querySelector('.popup-content').className = 'popup-content error';
                });
            });

            closePopup.addEventListener('click', function() {
                popup.style.display = 'none';
            });

            window.addEventListener('click', function(event) {
                if (event.target === popup) {
                    popup.style.display = 'none';
                }
            });
        }
    }
    
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
    // Search functionality
    // Search functionality
    if (searchButton && searchInput && searchResults) {

        searchButton.addEventListener('click', async function (e) {
            e.preventDefault()
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
                            // Success case - profile found with videos
                            const successMessage = document.createElement('div');
                            successMessage.className = 'alert alert-success';
                            const sourceText = data.source === 'cache' ? 
                                'Retrieved from cache' : 
                                'Fetched new data';
                            successMessage.textContent = `Found profile data for @${username}`;
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
                            // Handle different error cases
                            const messageElement = document.createElement('div');
                            
                            if (data.isPrivate) {
                                // Private profile case
                                messageElement.className = 'alert alert-warning';
                                messageElement.innerHTML = `
                                    <h4 class="alert-heading">Private Profile</h4>
                                    <p>The profile @${username} is private.</p>
                                `;
                                
                                // Still show profile info if available
                                if (data.profile) {
                                    updateProfileDisplay(data.profile);
                                }
                            } else if (data.exists === false) {
                                // Non-existent user case
                                messageElement.className = 'alert alert-danger';
                                messageElement.innerHTML = `
                                    <h4 class="alert-heading">User Not Found</h4>
                                    <p>The user @${username} does not exist.</p>
                                `;
                            } else {
                                // Generic error case
                                messageElement.className = 'alert alert-danger';
                                messageElement.textContent = data.message || 'An error occurred while fetching the profile.';
                            }
                            
                            searchResults.appendChild(messageElement);
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

    // Analytic page functionality
    if (currentPage === 'analytics') {
        // const isNewSession = !sessionStorage.getItem('sessionStarted');
        
        // if (isNewSession) {
        //     sessionStorage.setItem('sessionStarted', 'true');
        //     localStorage.removeItem('currentUsername');
        // }
        
        const username = localStorage.getItem('currentUsername');
        
        if (username) {
            loadAnalyticsData(username);
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
        const durationBreakdownContainer = document.getElementById('durationBreakdown');
        const activeDaysChartContainer = document.getElementById('activeDaysChart');
        const engagementStatContainer = document.getElementById('engagementStats')

        showLoading(); 

        try {
            //console.log('Fetching overview data for:', username);
            const response = await fetch(`/api/overview/${encodeURIComponent(username)}`);
            const data = await response.json();
            //console.log('Received overview data:', data);

            if (data.status === 'success') {
                // console.log('Profile data:', data.user_info);
                // console.log('Performance Trends:', data.trends);
                // console.log('Top Videos:', data.topVideos);
                // console.log('Duration Breakdown:', data.duration_breakdown);
                // console.log('Active Days:', data.active_days);
                // console.log('Engagement data:', data.engagement_section);

                // Update profile quick info
                if (data.user_info) {
                    // Profile Picture
                    const profilePicOverview = document.getElementById('profilePic');
                    const profileNameOverview = document.getElementById('profileName');
                    const verifiedBadgeOverview = document.getElementById('verifiedBadge');

                    if (profilePicOverview) {
                        profilePicOverview.src = data.user_info.profile_pic || '/static/default-profile.png';
                        profilePicOverview.alt = data.user_info.username || 'Profile Picture';
                    }

                    // Profile Name
                    if (profileNameOverview) {
                        profileNameOverview.textContent = data.user_info.name || data.user_info.username;
                    }

                    // Verified Badge
                    if (verifiedBadgeOverview) {
                        if (data.user_info.is_verified) {
                            verifiedBadgeOverview.classList.remove('hidden');
                        } else {
                            verifiedBadgeOverview.classList.add('hidden');
                        }
                    }

                    // Rest of the existing profile display logic remains the same
                    updateProfileDisplay(data.user_info);
                }

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
                        //console.log('activeDaysData', activeDaysData)
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
                        //console.log('durationData', durationData)
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

    async function loadAnalyticsData(username) {
        const statsContainer = document.querySelector('.stats-container');
        const graphContainer = document.querySelector('.graph-container');
        const analyticsGrid = document.querySelector('.analytics-grid');
    
        showLoading();
    
        try {
            const response = await fetch(`/api/analytics/${encodeURIComponent(username)}`);
            const data = await response.json();
    
            if (data.status === 'success') {
                // Update profile information
                updateProfileInfo(data.user_info,data.trends);
    
                // Update metrics
                updateMetrics(data.trends);
    
                // Update graph container (placeholder for now)
                updateGraphContainer(data.user_info,data.trends);
    
                // Update analytics grid
                updateAnalyticsGrid(data.trends);
    
            } else {
                console.error('Failed to load analytics data:', data.message);
                showError(data.message || 'Failed to load analytics data');
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            showError('An error occurred while loading analytics data');
        } finally {
            hideLoading();
        }
    }

    function updateProfileInfo(userInfo,userVideos) {
        const usernameElement = document.querySelector('.username');
        const videoCountElement = document.querySelector('.video-count');
        const profileIcon = document.querySelector('.profile-icon');
    
        if (userInfo && userVideos) {
            usernameElement.textContent = `@${userInfo.username}`;
            videoCountElement.textContent = `${userVideos.total_video || 0} videos analyzed`;
            if (userInfo.profile_pic) {
                profileIcon.src = userInfo.profile_pic;
                profileIcon.alt = `${userInfo.username}'s profile picture`;
            }
        }
    }

    
    function updateMetrics(trends) {
        const metricCards = document.querySelectorAll('.metric-card');
        
        const metrics = [
            { label: 'Viral Videos', value: trends.viral_video_count || 0, subtext: `${(trends.viral_percentage || 0).toFixed(2)}%` },
            { label: 'Avg Views', value: formatNumberV2(trends.avg_views || 0) },
            { label: 'Median Views', value: formatNumberV2(trends.median_views || 0) },
            { label: 'Most Viewed', value: formatNumberV2(trends.most_views || 0) }
        ];
    
        metricCards.forEach((card, index) => {
            const metric = metrics[index];
            card.querySelector('h3').textContent = metric.label;
            card.querySelector('.metric-value').textContent = metric.value;
            if (metric.subtext) {
                let subtextElement = card.querySelector('.metric-subtext');
                if (!subtextElement) {
                    subtextElement = document.createElement('div');
                    subtextElement.className = 'metric-subtext';
                    card.appendChild(subtextElement);
                }
                subtextElement.textContent = metric.subtext;
            }
        });
        lucide.createIcons();
    }

    function updateGraphContainer(userinfo, trends) {
        if (!trends || !trends.videos) {
            document.querySelector('.graph-container').innerHTML = '<p>No video data available</p>';
            return;
        }
    
        const tableBody = document.getElementById('videosTableBody');
        let currentSort = {
            column: null,
            ascending: true
        };
    
        function formatNumber(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toString();
        }
    
        function getMultiplierClass(multiplier, multiplier_color) {
            let valueClass;
            if (multiplier >= 2) {
                valueClass = 'high';
            } else if (multiplier >= 1) {
                valueClass = 'medium';
            } else {
                valueClass = 'low';
            }
    
            let colorClass;
            switch (multiplier_color.toLowerCase()) {
                case 'red':
                    colorClass = 'text-red-500';
                    break;
                case 'green':
                    colorClass = 'text-green-500';
                    break;
                default:
                    colorClass = 'text-gray-500';
            }
    
            return `${valueClass} ${colorClass}`;
        }
    
        function getDurationClass(seconds) {
            if (!seconds || seconds === '-') return '-';
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
    
        function getSortValue(video, column) {
            switch (column) {
                case 'views':
                    return video.views;
                case 'likes':
                    return video.like_count;
                case 'comments':
                    return video.comment_count;
                case 'shares':
                    return video.shares;
                case 'multiplier':
                    return video.multiplier;
                case 'date':
                    const [day, month, year] = video.upload_date.split('-').map(Number);
                    return new Date(year, month - 1, day).getTime();
                case 'length':
                    return video.duration || 0;
                default:
                    return 0;
            }
        }
    
        function renderTable(data, sortColumn = null, ascending = true) {
            const sortedData = [...data];
    
            if (sortColumn) {
                sortedData.sort((a, b) => {
                    const aVal = getSortValue(a, sortColumn);
                    const bVal = getSortValue(b, sortColumn);
    
                    if (aVal === bVal) return 0;
                    return ascending ? (aVal - bVal) : (bVal - aVal);
                });
            }
    
            tableBody.innerHTML = sortedData.map(video => `
                <tr class="video-row" data-original-url="${video.original_url || ''}">
                    <td>
                        <div class="username-cell">
                            <img src="${video.firstthumbnail}" alt="" class="thumbnail">
                            <span class="username">${userinfo.username}</span>
                        </div>
                    </td>
                    <td>${formatNumber(video.views)}</td>
                    <td>${formatNumber(video.like_count)}</td>
                    <td>${formatNumber(video.comment_count)}</td>
                    <td>${formatNumber(video.shares)}</td>
                    <td>
                        <span class="multiplier ${getMultiplierClass(video.multiplier, video.multiplier_color)}">
                            x${video.multiplier.toFixed(1)}
                        </span>
                    </td>
                    <td>${video.upload_date}</td>
                    <td>${getDurationClass(video.duration)}</td>
                </tr>
            `).join('');
    
            // Add click event listeners to video rows
            document.querySelectorAll('.video-row').forEach(videoRow => {
                videoRow.addEventListener('click', () => {
                    const originalUrl = videoRow.dataset.originalUrl;
                    if (originalUrl) {
                        window.open(originalUrl, '_blank');
                    }
                });
            });
    
            // Update sort indicators
            document.querySelectorAll('.analytics-table th.sortable').forEach(th => {
                const headerText = th.textContent.replace(' ↑', '').replace(' ↓', '');
                th.textContent = headerText;
                if (th.dataset.sort === sortColumn) {
                    th.textContent += ascending ? ' ↑' : ' ↓';
                }
            });
        }
    
        // Initial render
        renderTable(trends.videos);
    
        // Add click event listeners to sortable headers
        document.querySelectorAll('.analytics-table th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.sort;
                
                if (currentSort.column === column) {
                    currentSort.ascending = !currentSort.ascending;
                } else {
                    currentSort.column = column;
                    currentSort.ascending = true;
                }
    
                renderTable(trends.videos, column, currentSort.ascending);
            });
        });
    }

    function calculateOptimalLength(videos) {
        if (!videos || videos.length === 0) return '0.0s';
    
        // Group videos by duration ranges (rounded to nearest second)
        const durationGroups = {};
        videos.forEach(video => {
            const duration = Math.round(video.duration);
            if (!durationGroups[duration]) {
                durationGroups[duration] = {
                    totalViews: 0,
                    count: 0
                };
            }
            durationGroups[duration].totalViews += video.views;
            durationGroups[duration].count++;
        });
    
        // Calculate average views for each duration
        let maxAverageViews = 0;
        let optimalDuration = 0;
    
        Object.entries(durationGroups).forEach(([duration, data]) => {
            const averageViews = data.totalViews / data.count;
            if (averageViews > maxAverageViews) {
                maxAverageViews = averageViews;
                optimalDuration = parseInt(duration);
            }
        });
    
        return `${optimalDuration.toFixed(1)}s`;
    }
    
    function updateAnalyticsGrid(trends) {
        if (!trends || !trends.videos) {
            console.error('No video data available');
            return;
        }
    
        const dateRange = '';
    
        // Find most viral video
        const mostViralVideo = trends.videos.reduce((max, video) => 
            (video.multiplier > (max?.multiplier || 0)) ? video : max, null);
    
        // Calculate distributions
        const multiplierRanges = {
            'Below 1x': 0,
            '1x-5x': 0,
            '5x-10x': 0,
            '10x-25x': 0,
            '25x-50x': 0,
            '50x-100x': 0,
            '100x+': 0
        };
    
        const durationRanges = {
            '0-10': { count: 0, views: 0 },
            '10-15': { count: 0, views: 0 },
            '15-25': { count: 0, views: 0 },
            '25-40': { count: 0, views: 0 },
            '40-60': { count: 0, views: 0 },
            '60+': { count: 0, views: 0 }
        };
    
        // Process videos
        trends.videos.forEach(video => {
            // Multiplier distribution
            if (video.multiplier < 1) multiplierRanges['Below 1x']++;
            else if (video.multiplier < 5) multiplierRanges['1x-5x']++;
            else if (video.multiplier < 10) multiplierRanges['5x-10x']++;
            else if (video.multiplier < 25) multiplierRanges['10x-25x']++;
            else if (video.multiplier < 50) multiplierRanges['25x-50x']++;
            else if (video.multiplier < 100) multiplierRanges['50x-100x']++;
            else multiplierRanges['100x+']++;
    
            // Duration distribution
            const duration = video.duration;
            if (duration <= 10) durationRanges['0-10'].views += video.views;
            else if (duration <= 15) durationRanges['10-15'].views += video.views;
            else if (duration <= 25) durationRanges['15-25'].views += video.views;
            else if (duration <= 40) durationRanges['25-40'].views += video.views;
            else if (duration <= 60) durationRanges['40-60'].views += video.views;
            else durationRanges['60+'].views += video.views;
        });
    
        // Calculate max values for scaling
        const maxMultiplierCount = Math.max(...Object.values(multiplierRanges));
        const maxViews = Math.max(...Object.values(durationRanges).map(d => d.views));
    
        

        // Update Most Viral Video card
        const mostViralCard = document.querySelector('.analytics-card:nth-child(1)');
        if (mostViralVideo && mostViralCard) {
            mostViralCard.innerHTML = `
                <h3>Most Viral Video</h3>
                <div class="date-range">${dateRange}</div>
                <div class="viral-video">
                    <img src="${mostViralVideo.firstthumbnail}" alt="Thumbnail">
                    <div class="viral-video-info">
                        <div class="viral-video-header">
                            <div class="upload-info">Uploaded ${mostViralVideo.upload_date}</div>
                            <span class="multiplier-badge">x${mostViralVideo.multiplier.toFixed(1)}</span>
                        </div>
                        <div class="stats-list">
                            <div class="stat-item">
                                <span class="stat-label">Views</span>
                                <span class="stat-value">${formatNumber(mostViralVideo.views)}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Likes</span>
                                <span class="stat-value">${formatNumber(mostViralVideo.like_count)}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Comments</span>
                                <span class="stat-value">${formatNumber(mostViralVideo.comment_count)}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Shares</span>
                                <span class="stat-value">${formatNumber(mostViralVideo.shares)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            mostViralCard.addEventListener('click', () => {
                if (mostViralVideo.original_url) {
                    window.open(mostViralVideo.original_url, '_blank');
                }
            });
        }
    
        // Update Virality Median Analysis card
        const viralityCard = document.querySelector('.analytics-card:nth-child(2)');
        if (viralityCard) {
            const totalVideos = Object.values(multiplierRanges).reduce((a, b) => a + b, 0);
            viralityCard.innerHTML = `
                <h3>Virality Median Analysis</h3>
                <div class="date-range">${dateRange}</div>
                <div class="distribution-container">
                    <div class="distribution-header">
                        <span>Total Videos</span>
                        <span>${totalVideos}</span>
                    </div>
                    ${Object.entries(multiplierRanges).map(([range, count]) => `
                        <div class="distribution-row">
                            <span class="distribution-label">${range}</span>
                            <div class="distribution-bar-container">
                                <div class="distribution-bar" style="width: ${(count/maxMultiplierCount*100)}%"></div>
                            </div>
                            <span class="distribution-value">${count}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    
        // Update Duration Analysis card
        const durationCard = document.querySelector('.analytics-card:nth-child(3)');
        if (durationCard) {
            const optimalLength = calculateOptimalLength(trends.videos);
            durationCard.innerHTML = `
                <h3>Duration Analysis</h3>
                <div class="date-range">${dateRange}</div>
                <div class="distribution-container">
                    <div class="distribution-header">
                        <span>Video Duration Range (in seconds)</span>
                        <span>Average Views</span>
                    </div>
                    ${Object.entries(durationRanges).map(([range, data]) => `
                        <div class="distribution-row">
                            <span class="distribution-label">${range}</span>
                            <div class="distribution-bar-container">
                                <div class="distribution-bar" style="width: ${(data.views/maxViews*100)}%"></div>
                            </div>
                            <span class="distribution-value">${formatNumber(data.views)}</span>
                        </div>
                    `).join('')}
                    <div class="optimal-length">
                        <span>Optimal Length</span>
                        <span class="optimal-length-value">${optimalLength}</span>
                    </div>
                </div>
            `;
        }
    }

    // Render top videos function
    function renderTopVideos(videos) {
        const videosContainer = document.getElementById('topVideos');
        if (!videosContainer) {
            console.error('Videos container not found');
            return;
        }

        //console.log('Rendering top videos:', videos);

        if (!Array.isArray(videos) || videos.length === 0) {
            console.log('No videos found or invalid data');
            videosContainer.innerHTML = '<p>No videos found</p>';
            return;
        }

        videosContainer.innerHTML = '';

        videos.forEach((video, index) => {
            //console.log(`Rendering video ${index + 1}:`, video);
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

    function formatNumber(num) {
        if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    function formatNumberV2(num) {
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }

    // Download  button handler
    const downloadButton = document.getElementById('downloadButton');
    if (downloadButton) {
        downloadButton.addEventListener('click', function () {
            const username = localStorage.getItem('currentUsername');
            if (username) {
                window.location.href = `/download?username=${encodeURIComponent(username)}`;
            } else {
                showError('Please search for a profile first.');
            }
        });
        
        // Initially disable the analyze button
        downloadButton.disabled = true;
    }

    // Download functionality
    const formatCards = document.querySelectorAll('.format-card');
    formatCards.forEach(card => {
        card.addEventListener('click', function() {
            const format = this.getAttribute('data-format');
            downloadData(format);
        });
    });

    function downloadData(format) {
        const username = localStorage.getItem('currentUsername');
        if (!username) {
            showErrorMessage('Please search for a profile before downloading data.');
            return;
        }

        showLoadingIndicator();

        fetch(`/download/${encodeURIComponent(username)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `format=${format}`
        })  
        .then(response => {
            if (response.ok) {
                return response.blob();
            }
            return response.json().then(err => {
                throw new Error(err.message || 'Download failed');
            });
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            
            const filename = `${username}_data.${format}`;
            a.download = filename;
            
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            updateDownloadHistory(filename, format);
            showSuccessMessage(`Data downloaded successfully in ${format.toUpperCase()} format.`);
        })
        .catch(error => {
            console.error('Download error:', error);
            showErrorMessage(error.message);
        })
        .finally(() => {
            hideLoadingIndicator();
        });
    }

    function updateDownloadHistory(filename, format) {
        const historyList = document.getElementById('downloadHistory');
        const emptyHistory = historyList.querySelector('.empty-history');
        if (emptyHistory) {
            emptyHistory.remove();
        }
        
        const historyItem = document.createElement('div');
        historyItem.classList.add('history-item');
        historyItem.innerHTML = `
            <span class="history-filename">${filename}</span>
            <span class="history-format">${format.toUpperCase()}</span>
            <span class="history-date">${new Date().toLocaleString()}</span>
        `;
        
        historyList.insertBefore(historyItem, historyList.firstChild);
        
        while (historyList.children.length > 5) {
            historyList.removeChild(historyList.lastChild);
        }
        
        saveDownloadHistory();
    }
    
    function saveDownloadHistory() {
        const historyList = document.getElementById('downloadHistory');
        const historyItems = Array.from(historyList.querySelectorAll('.history-item'))
            .map(item => ({
                filename: item.querySelector('.history-filename').textContent,
                format: item.querySelector('.history-format').textContent,
                date: item.querySelector('.history-date').textContent
            }));
        
        localStorage.setItem('downloadHistory', JSON.stringify(historyItems));
    }

    function clearDownloadHistory() {
        localStorage.removeItem('downloadHistory');
        sessionStorage.removeItem('sessionStarted');
        const historyList = document.getElementById('downloadHistory');
        if (historyList) {
            historyList.innerHTML = `
                <div class="empty-history">
                    <p>No recent downloads</p>
                </div>
            `;
        }
    }

    function loadDownloadHistory() {
        const historyList = document.getElementById('downloadHistory');
        if (!historyList) return; // Exit if element doesn't exist
    
        const isNewSession = !sessionStorage.getItem('sessionStarted');
        if (isNewSession) {
            clearDownloadHistory();
            sessionStorage.setItem('sessionStarted', 'true');
            return;
        }
    
        const savedHistory = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
        
        // If no saved history, ensure empty state
        if (savedHistory.length === 0) {
            historyList.innerHTML = `
                <div class="empty-history">
                    <p>No recent downloads</p>
                </div>
            `;
            return;
        }
    
        // Clear existing content
        historyList.innerHTML = '';
        
        // Add history items
        savedHistory.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.classList.add('history-item');
            historyItem.innerHTML = `
                <span class="history-filename">${item.filename}</span>
                <span class="history-format">${item.format}</span>
                <span class="history-date">${item.date}</span>
            `;
            historyList.appendChild(historyItem);
        });
    }
    
    function showLoadingIndicator() {
        const formatCards = document.querySelectorAll('.format-card');
        formatCards.forEach(card => {
            card.classList.add('loading');
            const icon = card.querySelector('.format-icon');
            if (icon) {
                icon.innerHTML = '<div class="spinner"></div>';
            }
        });
    }
    
    function hideLoadingIndicator() {
        const formatCards = document.querySelectorAll('.format-card');
        formatCards.forEach(card => {
            card.classList.remove('loading');
            const icon = card.querySelector('.format-icon');
            if (icon) {
                icon.innerHTML = card.getAttribute('data-original-icon');
            }
        });
    }

    function showErrorMessage(message) {
        const errorContainer = document.createElement('div');
        errorContainer.classList.add('error-message');
        errorContainer.textContent = message;
        document.body.appendChild(errorContainer);
        
        setTimeout(() => {
            errorContainer.remove();
        }, 5000);
    }
    
    function showSuccessMessage(message) {
        const successContainer = document.createElement('div');
        successContainer.classList.add('success-message');
        successContainer.textContent = message;
        document.body.appendChild(successContainer);
        
        setTimeout(() => {
            successContainer.remove();
        }, 5000);
    }
    
    // Initialize download history and format card icons
    loadDownloadHistory();
    formatCards.forEach(card => {
        const icon = card.querySelector('.format-icon');
        if (icon) {
            card.setAttribute('data-original-icon', icon.innerHTML);
        }
    });

    // Clear history on page load/refresh
    if (currentPage === 'download') {
        // Clear history on page load/refresh
        const isNewSession = !sessionStorage.getItem('sessionStarted');
        if (isNewSession) {
            clearDownloadHistory();
            sessionStorage.setItem('sessionStarted', 'true');
        }

        // Load any persisting history
        loadDownloadHistory();
        const formatCards = document.querySelectorAll('.format-card');
        formatCards.forEach(card => {
            const icon = card.querySelector('.format-icon');
            if (icon) {
                card.setAttribute('data-original-icon', icon.innerHTML);
            }
        });
    }

    function getMultiplierClass(multiplier, multiplier_color) {
        let valueClass;
        if (multiplier >= 2) {
            valueClass = 'high';
        } else if (multiplier >= 1) {
            valueClass = 'medium';
        } else {
            valueClass = 'low';
        }

        let colorClass;
        switch (multiplier_color.toLowerCase()) {
            case 'red':
                colorClass = 'text-red-500';
                break;
            case 'green':
                colorClass = 'text-green-500';
                break;
            default:
                colorClass = 'text-gray-500';
        }

        return `${valueClass} ${colorClass}`;
    }
    
});



