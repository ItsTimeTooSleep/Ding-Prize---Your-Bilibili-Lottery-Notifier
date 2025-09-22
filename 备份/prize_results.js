document.addEventListener('DOMContentLoaded', () => {
    const prizeMessagesList = document.getElementById('all-prize-messages-list');
    const backButton = document.getElementById('back-to-popup');

    // Custom Confirm Dialog elements
    const customConfirmDialog = document.getElementById('custom-confirm-dialog');
    const customConfirmMessage = document.getElementById('custom-confirm-message');
    const customConfirmOk = document.getElementById('custom-confirm-ok');
    const customConfirmCancel = document.getElementById('custom-confirm-cancel');

    // Function to show custom confirm dialog
    function showCustomConfirm(message) {
        return new Promise((resolve) => {
            customConfirmMessage.textContent = message;
            customConfirmDialog.classList.add('show');

            const onOkClick = () => {
                customConfirmDialog.classList.remove('show');
                customConfirmOk.removeEventListener('click', onOkClick);
                customConfirmCancel.removeEventListener('click', onCancelClick);
                resolve(true);
            };

            const onCancelClick = () => {
                customConfirmDialog.classList.remove('show');
                customConfirmOk.removeEventListener('click', onOkClick);
                customConfirmCancel.removeEventListener('click', onCancelClick);
                resolve(false);
            };

            customConfirmOk.addEventListener('click', onOkClick);
            customConfirmCancel.addEventListener('click', onCancelClick);
        });
    }

    function bindMessageItemEvents(listItem, message) {
        const deleteButton = listItem.querySelector('.delete-button');
        const copyButton = listItem.querySelector('.copy-button');

        deleteButton.addEventListener('click', async () => {
    const confirmDelete = await showCustomConfirm(`确定要删除 "${message.title}" 的中奖消息吗？`);
    if (confirmDelete) {
        // 添加删除动画类
        listItem.classList.add('deleting');
        
        // 等待动画完成后再执行删除
        setTimeout(() => {
            chrome.runtime.sendMessage({ action: 'deletePrizeMessage', messageId: message.id }, (response) => {
                if (response && response.success) {
                    listItem.remove();
                    updateNoPrizesMessageVisibility();
                }
            });
        }, 400); // 与CSS动画时间匹配
    }
});

        copyButton.addEventListener('click', () => {
            const textToCopy = `标题: ${message.title}\nUID: ${message.uid}\n时间: ${new Date(message.timestamp).toLocaleString()}`;
            navigator.clipboard.writeText(textToCopy).then(() => {
                alert('中奖信息已复制到剪贴板！');
            }).catch(err => {
                console.error('复制失败:', err);
            });
        });
    }

    function updateNoPrizesMessageVisibility() {
        chrome.storage.local.get(['prizeMessages'], (result) => {
            const prizeMessages = result.prizeMessages || [];
            if (prizeMessages.length === 0) {
                document.getElementById('no-prizes-message').style.display = 'block';
                prizeMessagesList.style.display = 'none';
            } else {
                document.getElementById('no-prizes-message').style.display = 'none';
                prizeMessagesList.style.display = 'block';
            }
        });
    }

    chrome.storage.local.get(['prizeMessages'], (result) => {
        const prizeMessages = result.prizeMessages || [];

        if (prizeMessages.length === 0) {
            document.getElementById('no-prizes-message').style.display = 'block';
            prizeMessagesList.style.display = 'none';
        } else {
            document.getElementById('no-prizes-message').style.display = 'none';
            prizeMessagesList.style.display = 'block';
            prizeMessages.forEach((message) => {
                const listItem = document.createElement('li');
                listItem.className = 'prize-item';
                const truncatedTitle = message.title.length > 20 ? message.title.substring(0, 20) + '...' : message.title;
                listItem.innerHTML = `
                    <div class="message-content">
                        <p><strong>标题:</strong> ${truncatedTitle}</p>
                        <p><strong>UID:</strong> ${message.uid}</p>
                        <p class="time">${new Date(message.timestamp).toLocaleString()}</p>
                    </div>
                    <div class="actions">
                        <button class="delete-button" data-id="${message.id}"><i class="fas fa-trash-alt"></i> 删除</button>
                        <button class="copy-button" data-id="${message.id}"><i class="fas fa-copy"></i> 复制</button>
                    </div>
                `;
                prizeMessagesList.prepend(listItem); // Prepend to show newest first
                bindMessageItemEvents(listItem, message);
            });
        }
    });

    backButton.addEventListener('click', () => {
        window.close();
    });
});