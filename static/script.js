document.getElementById('scrapeForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const messageDiv = document.getElementById('message');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const results = document.getElementById('results');

    messageDiv.textContent = '';
    progressContainer.style.display = 'block';
    results.style.display = 'none';

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
                messageDiv.textContent = data.message;
                messageDiv.style.color = 'green';
                document.getElementById('videoCount').textContent = data.videoCount;
                results.style.display = 'block';
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

function downloadData(format) {
    const username = document.getElementById('username').value;
    window.location.href = `/download/${format}?username=${encodeURIComponent(username)}`;
}

