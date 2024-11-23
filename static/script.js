let typingTimer;
const doneTypingInterval = 500; // milliseconds

document.getElementById('scrapeForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const messageDiv = document.getElementById('message');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const results = document.getElementById('results');
    const userProfile = document.getElementById('user-profile');

    messageDiv.textContent = '';
    progressContainer.style.display = 'block';
    results.style.display = 'none';  // Hide results initially
    userProfile.style.display = 'none';

    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 5;
        if (progress > 90) {
            clearInterval(progressInterval);
        }
        progressBar.style.width = `${progress}%`;
    }, 500);

    fetch('/scrape', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `username=${encodeURIComponent(username)}`
    })
    .then(response => response.json())
    .then(data => {
        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        
        setTimeout(() => {
            progressContainer.style.display = 'none';
            if (data.success) {
                displayUserProfile(data.userInfo);
                userProfile.style.display = 'flex';
                document.getElementById('videoCount').textContent = data.videoCount;
                // Remove the results.style.display = 'block' from here
            } else {
                messageDiv.textContent = data.message;
                messageDiv.style.color = 'red';
            }
        }, 500);
    })
    .catch(error => {
        clearInterval(progressInterval);
        progressContainer.style.display = 'none';
        messageDiv.textContent = 'An error occurred while scraping data.';
        messageDiv.style.color = 'red';
        console.error('Error:', error);
    });
});

function displayUserProfile(userInfo) {
    document.getElementById('profile-pic').src = userInfo.profile_pic;
    document.getElementById('profile-name').textContent = userInfo.name;
    document.getElementById('following').textContent = `Following: ${userInfo.following}`;
    document.getElementById('followers').textContent = `Followers: ${userInfo.followers}`;
    document.getElementById('likes').textContent = `Likes: ${userInfo.likes}`;
}

document.getElementById('select-profile').addEventListener('click', function() {
    const results = document.getElementById('results');
    // Simply show the results section - the videoCount is already set from the fetch
    results.style.display = 'block';
});

function downloadData(format) {
    const username = document.getElementById('username').value.trim();
    window.location.href = `/download/${format}?username=${encodeURIComponent(username)}`;
}