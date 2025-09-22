document.addEventListener('DOMContentLoaded', () => {
    const prizeMessagesList = document.getElementById('all-prize-messages-list');
    const backButton = document.getElementById('back-to-popup');

    // Custom Confirm Dialog elements
    const customConfirmDialog = document.getElementById('custom-confirm-dialog');
    const customConfirmMessage = document.getElementById('custom-confirm-message');
    const customConfirmOk = document.getElementById('custom-confirm-ok');
    const customConfirmCancel = document.getElementById('custom-confirm-cancel');
    const prizeDetails = document.getElementById('prize-details');

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
        const visitButton = listItem.querySelector('.visit-button');

        deleteButton.addEventListener('click', () => {
            deletePrize(message.id);
        });

        copyButton.addEventListener('click', () => {
            copyPrizeInfo(message);
        });

        visitButton.addEventListener('click', () => {
            window.open(`https://message.bilibili.com/whisper/mid${message.senderUid}`, '_blank');
        });
    }

    function updateNoPrizesMessageVisibility() {
        chrome.storage.local.get(['prizeMessages'], (result) => {
            const prizeMessages = result.prizeMessages || [];

            // 更新详细信息
            if (prizeMessages.length > 0) {
                prizeDetails.textContent = `共 ${prizeMessages.length} 条中奖消息`;
            } else {
                prizeDetails.textContent = '暂无中奖消息';
            }

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
                // 提取纯净标题，去除可能包含的thumb信息
                const titleMatch = message.title.match(/标题:\s*(.*?)(?:,"thumb":|$)/);
                const truncatedTitle = titleMatch && titleMatch[1] ? titleMatch[1].trim() : message.title;
                const originalMessageContent = message.rawContent || '无';
                const thumbDisplay = message.thumb ? `<img src="${message.thumb}" alt="缩略图" class="prize-thumb">` : '';

                listItem.innerHTML = `
                    <div class="message-content">
                        <p><strong>标题:</strong> ${truncatedTitle}</p>
                        ${thumbDisplay}
                        <p><strong>UID:</strong> ${message.uid}</p>
                        <p><strong>原始消息:</strong> ${originalMessageContent}</p>
                    </div>
                    <div class="actions">
                        <button class="delete-button" data-id="${message.id}"><i class="fas fa-trash-alt"></i> 删除</button>
                        <button class="copy-button" data-id="${message.id}"><i class="fas fa-copy"></i> 复制</button>
                        <button class="visit-button" data-uid="${message.senderUid}"><i class="fas fa-external-link-alt"></i> 访问</button>
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


function renderPrizeMessages(prizes) {
    const prizeList = document.getElementById('all-prize-messages-list');

    prizes.forEach((prize) => {
        const listItem = document.createElement('li');
        listItem.className = 'prize-item';

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.style.cssText = 'width: 100px !important; padding: 4px 12px !important; height: 30px !important; display: inline-flex; align-items: center; justify-content: center; margin-right: 5px;';
        copyButton.innerHTML = '<i class="fas fa-copy" style="margin-right: 5px;"></i>复制';
        copyButton.onclick = () => copyPrizeInfo(prize);
        buttonContainer.appendChild(copyButton);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.style.cssText = 'width: 100px !important; padding: 4px 12px !important; height: 30px !important; display: inline-flex; align-items: center; justify-content: center;';
        deleteButton.innerHTML = '<i class="fas fa-trash" style="margin-right: 5px;"></i>删除';
        deleteButton.onclick = () => deletePrize(prize.id);
        buttonContainer.appendChild(deleteButton);

        const visitButton = document.createElement('button');
        visitButton.className = 'visit-button';
        visitButton.style.cssText = 'width: 100px !important; padding: 4px 12px !important; height: 30px !important; display: inline-flex; align-items: center; justify-content: center; margin-left: 5px;';
        visitButton.innerHTML = '<i class="fas fa-external-link-alt" style="margin-right: 5px;"></i>访问';
        visitButton.onclick = () => window.open(`https://message.bilibili.com/whisper/mid${prize.senderUid}`, '_blank');
        buttonContainer.appendChild(visitButton);

        listItem.appendChild(buttonContainer);

        prizeList.appendChild(listItem);
    });

    updateNoPrizesMessageVisibility(prizes.length);
}


function copyPrizeInfo(prize) {
    const prizeInfo = `
标题: ${prize.title}
UID: ${prize.uid}
缩略图: ${prize.thumb || 'N/A'}
发送者UID: ${prize.senderUid || 'N/A'}
发送者昵称: ${prize.senderName || 'N/A'}
消息内容: ${prize.messageContent || 'N/A'}
时间: ${new Date(prize.timestamp).toLocaleString()}
原始消息: ${JSON.stringify(prize.originalMessage)}
`;
    navigator.clipboard.writeText(prizeInfo).then(() => {
        alert('完整中奖信息已复制到剪贴板！');
    }).catch(err => {
        console.error('复制失败:', err);
    });
}


function deletePrize(prizeId) {
    showCustomConfirm(`确定要删除此中奖消息吗？`).then(confirmed => {
        if (confirmed) {
            chrome.runtime.sendMessage({ action: 'deletePrizeMessage', messageId: prizeId }, (response) => {
                if (response && response.success) {
                    // Remove the item from the DOM
                    const itemToRemove = document.querySelector(`.prize-item button[data-id="${prizeId}"]`).closest('.prize-item');
                    if (itemToRemove) {
                        itemToRemove.classList.add('deleting');
                        setTimeout(() => {
                            itemToRemove.remove();
                            updateNoPrizesMessageVisibility();
                        }, 400); // Match CSS animation duration
                    }
                }
            });
        }
    });
}