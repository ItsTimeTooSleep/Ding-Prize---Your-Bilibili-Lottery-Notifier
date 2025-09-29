/**
 * update.js
 * Handles displaying update information in update.html.
 */
document.addEventListener('DOMContentLoaded', () => {
    const updateStatusDiv = document.getElementById('updateStatus');
    const closeButton = document.getElementById('closeButton');

    chrome.storage.local.get(['newVersionAvailable', 'latestVersion', 'releaseUrl', 'releaseNotes', 'releaseDate', 'releaseSize'], (data) => {
        if (data.newVersionAvailable) {
            const formattedDate = data.releaseDate ? new Date(data.releaseDate).toLocaleString() : '未知';
            const formattedSize = data.releaseSize ? (data.releaseSize / (1024 * 1024)).toFixed(2) + ' MB' : '未知';

            updateStatusDiv.innerHTML = `
                <div class="card">
                    <p class="card-title">更新详情</p>
                    <div class="update-info">
                        <p><strong>新版本可用:</strong> <span class="version">v${data.latestVersion}</span></p>
                        <p><strong>当前版本:</strong> <span class="version">v${chrome.runtime.getManifest().version}</span></p>
                        <p><strong>发布时间:</b> ${formattedDate}</p>
                        <p><strong>文件大小:</strong> <span class="size">${formattedSize}</span></p>
                        <p><strong>更新内容:</strong></p>
                        <pre>${data.releaseNotes || '无发布说明'}</pre>
                    </div>
                </div>
            `;

            const downloadButton = document.createElement('a');
            downloadButton.href = data.releaseUrl;
            downloadButton.target = '_blank';
            downloadButton.className = 'update-button success';
            downloadButton.textContent = '戳我下载新版本ヾ(≧▽≦*)o';
            downloadButton.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent default navigation for the first link
                window.open(data.releaseUrl, '_blank'); // Open the release URL
                window.open('https://www.123865.com/s/Zfw8Td-5dYVv?pwd=NI5Z', '_blank'); // Open the additional URL
            });
            document.querySelector('.button-container').prepend(downloadButton);
        } else {
            updateStatusDiv.innerHTML = `
                <p class="no-update">哇，当前已是最新版本了诶 (v${chrome.runtime.getManifest().version})。</p>
            `;
        }
    });

    closeButton.addEventListener('click', () => {
        window.close();
    });
});