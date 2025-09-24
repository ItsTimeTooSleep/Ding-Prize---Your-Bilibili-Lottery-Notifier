document.addEventListener('DOMContentLoaded', () => {
    const prizeMessagesList = document.getElementById('all-prize-messages-list');
    const backButton = document.getElementById('back-to-popup');

    // Custom Confirm Dialog elements
    const customConfirmDialog = document.getElementById('custom-confirm-dialog');
    const customConfirmMessage = document.getElementById('custom-confirm-message');
    const customConfirmOk = document.getElementById('custom-confirm-ok');
    const customConfirmCancel = document.getElementById('custom-confirm-cancel');
    const prizeCountDisplay = document.getElementById('prize-details');

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
        const checkbox = listItem.querySelector('.prize-checkbox');

        if (checkbox) {
            checkbox.addEventListener('change', () => handleCheckboxChange(checkbox, message.id));
        }

        deleteButton.addEventListener('click', () => {
            deletePrize(message.id);
        });

        copyButton.addEventListener('click', () => {
            copyPrizeInfo(message);
        });

        visitButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const uid = message.uid; // 使用 message.uid
            if (uid && uid !== '未知') {
                window.open(`https://message.bilibili.com/?spm_id_from=333.1007.0.0#/whisper/mid${uid}`, '_blank');
            } else {
                alert('UP主UID未知或无效，无法访问。');
            }
        });
    }

    function updateNoPrizesMessageVisibility() {
        chrome.storage.local.get(['prizeMessages'], (result) => {
            const allPrizeMessages = result.prizeMessages || [];

            // 更新详细信息
            if (prizeCountDisplay) {
                if (allPrizeMessages.length > 0) {
                    prizeCountDisplay.textContent = `共 ${allPrizeMessages.length} 条中奖消息`;
                } else {
                    prizeCountDisplay.textContent = '暂无中奖消息';
                }
            }

            if (allPrizeMessages.length === 0) {
                document.getElementById('no-prizes-message').style.display = 'block';
                prizeMessagesList.style.display = 'none';
                batchActionsContainer.style.display = 'none'; // Hide batch actions if no prizes
            } else {
                document.getElementById('no-prizes-message').style.display = 'none';
                prizeMessagesList.style.display = 'block';
                updateBatchActions(); // Update batch actions visibility
            }
        });
    }

    chrome.storage.local.get(['prizeMessages'], (result) => {
        const allPrizeMessages = result.prizeMessages || [];

        if (allPrizeMessages.length === 0) {
            document.getElementById('no-prizes-message').style.display = 'block';
            prizeMessagesList.style.display = 'none';
            batchActionsContainer.style.display = 'none'; // Hide batch actions if no prizes
        } else {
            document.getElementById('no-prizes-message').style.display = 'none';
            prizeMessagesList.style.display = 'block';
            allPrizeMessages.forEach((message) => {
                const listItem = renderPrizeMessage(message);
                prizeMessagesList.prepend(listItem); // Prepend to show newest first
                // No need to call bindMessageItemEvents here, as renderPrizeMessage already binds the checkbox
                // Other buttons (delete, copy, visit) are still bound by bindMessageItemEvents
                bindMessageItemEvents(listItem, message);
            });
            updateBatchActions(); // Initial update of batch actions
        }
    });

    backButton.addEventListener('click', () => {
        window.close();
    });


    function copyPrizeInfo(prize) {
        const prizeInfo = `
标题: ${prize.title}
UID: ${prize.uid}
缩略图: ${prize.thumb || 'N/A'}
发送者昵称: ${prize.senderName || 'N/A'}
消息内容: ${prize.messageContent || 'N/A'}
时间: ${new Date(prize.timestamp).toLocaleString()}
原始消息: ${prize.rawContent || 'N/A'}
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
                        const itemToRemove = document.querySelector(`.prize-item input[data-prize-id="${prizeId}"]`).closest('.prize-item');
                        if (itemToRemove) {
                            itemToRemove.classList.add('deleting');
                            setTimeout(() => {
                                itemToRemove.remove();
                                // Remove from selectedPrizeIds if it was selected
                                selectedPrizeIds = selectedPrizeIds.filter(id => id !== prizeId);
                                updateNoPrizesMessageVisibility();
                                updateBatchActions(); // Update batch actions after deletion
                            }, 200); // Match CSS animation duration, changed from 400 to 200
                        }
                    }
                });
            }
        });
    }

    // 添加批量操作相关变量
    const batchActionsContainer = document.querySelector('.batch-actions');
    const selectAllCheckbox = document.getElementById('select-all-prizes');
    const deleteSelectedButton = document.getElementById('delete-selected-prizes');
    let selectedPrizeIds = [];
    
    // 更新批量操作按钮状态
    function updateBatchActions() {
        if (selectedPrizeIds.length >= 2) {
            batchActionsContainer.style.display = 'flex';
            deleteSelectedButton.disabled = false;
        } else {
            batchActionsContainer.style.display = 'none';
            deleteSelectedButton.disabled = true;
        }
        
        // 更新全选复选框状态
        const allCheckboxes = document.querySelectorAll('.prize-checkbox');
        const allChecked = allCheckboxes.length > 0 && Array.from(allCheckboxes).every(checkbox => checkbox.checked);
        selectAllCheckbox.checked = allChecked;

        // 如果没有中奖消息，也隐藏批量操作栏
        chrome.storage.local.get(['prizeMessages'], (result) => {
            const prizeMessages = result.prizeMessages || [];
            if (prizeMessages.length === 0) {
                batchActionsContainer.style.display = 'none';
            }
        });
    }
    
    // 修改渲染逻辑，添加复选框
    function renderPrizeMessage(message) {
        const listItem = document.createElement('li');
        listItem.className = 'prize-item';

        let displayTitle = message.title;
        try {
            const parsedTitle = JSON.parse(message.title);
            if (parsedTitle && parsedTitle.title) {
                displayTitle = parsedTitle.title;
            }
        } catch (e) {
            console.error("Failed to parse message.title as JSON:", e);
        }
        let originalMessageContent = message.rawContent || '无';
        try {
            const parsedRawContent = JSON.parse(originalMessageContent);
            if (parsedRawContent && parsedRawContent.content) {
                originalMessageContent = parsedRawContent.content;
            }
        } catch (e) {
            // Not a JSON string, or doesn't contain 'content' field, use as is.
        }
        const thumbDisplay = message.thumb ? `<img src="${message.thumb}" alt="缩略图" class="prize-thumb">` : '';

        // 检查当前消息是否已被选中，以设置复选框的初始状态
        const isSelected = selectedPrizeIds.includes(message.id);

        listItem.innerHTML = `
            <div class="prize-item-header">
                <input type="checkbox" class="prize-checkbox" data-prize-id="${message.id}" ${isSelected ? 'checked' : ''}>
                <p><strong>标题:</strong> ${displayTitle}</p>
            </div>
            <div class="message-content">
                <p><strong>UID:</strong> ${message.uid}</p>
                <p><strong>原始消息:</strong> ${originalMessageContent}</p>
                <p><strong>时间:</strong> ${new Date(message.timestamp).toLocaleString()}</p>
                ${thumbDisplay}
            </div>
            <div class="actions">
                <button class="delete-button" data-id="${message.id}"><i class="fas fa-trash-alt"></i> 删除</button>
                <button class="copy-button" data-id="${message.id}"><i class="fas fa-copy"></i> 复制</button>
                <button class="visit-button" data-uid="${message.uid}"><i class="fas fa-external-link-alt"></i> 访问</button>
            </div>
        `;

        // 移除此处的复选框事件绑定，因为 bindMessageItemEvents 会处理
        // const checkbox = listItem.querySelector('.prize-checkbox');
        // if (checkbox) {
        //     checkbox.addEventListener('change', () => handleCheckboxChange(checkbox, message.id));
        // }

        return listItem;
    }
    
    // 处理单个复选框变化
    function handleCheckboxChange(checkbox, prizeId) {
        if (checkbox.checked) {
            if (!selectedPrizeIds.includes(prizeId)) {
                selectedPrizeIds.push(prizeId);
            }
        } else {
            selectedPrizeIds = selectedPrizeIds.filter(id => id !== prizeId);
        }
        console.log('Selected Prize IDs:', selectedPrizeIds); // Add console log for debugging
        updateBatchActions();
    }
    
    // 处理全选复选框
    selectAllCheckbox.addEventListener('change', (e) => {
        console.log('selectAllCheckbox change event fired.'); // Add this line
        const isChecked = e.target.checked;

        const allCheckboxes = document.querySelectorAll('.prize-checkbox');
        allCheckboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });

        selectedPrizeIds = Array.from(allCheckboxes)
                               .filter(checkbox => checkbox.checked)
                               .map(checkbox => checkbox.dataset.prizeId);

        console.log('After selectAllCheckbox change, selectedPrizeIds:', selectedPrizeIds);
        updateBatchActions();
    });

    // 处理删除选中按钮
    deleteSelectedButton.addEventListener('click', () => {
        console.log('deleteSelectedButton click event fired.'); // Add this line
        showCustomConfirm(`确定要删除选中的 ${selectedPrizeIds.length} 条中奖消息吗？`).then(confirmed => {
            if (confirmed) {
                console.log('Before sending deletePrizeMessages, selectedPrizeIds:', selectedPrizeIds);
                chrome.runtime.sendMessage({
                    action: 'deletePrizeMessages',
                    messageIds: selectedPrizeIds
                }, (response) => {
                    if (response && response.success) {
                        // Remove all selected items from the DOM
                        selectedPrizeIds.forEach(prizeId => {
                            const itemToRemove = document.querySelector(`.prize-item input[data-prize-id="${prizeId}"]`)?.closest('.prize-item');
                            if (itemToRemove) {
                                itemToRemove.classList.add('deleting');
                                setTimeout(() => {
                                    itemToRemove.remove();
                                }, 200);
                            }
                        });
                        
                        selectedPrizeIds = [];
                        updateNoPrizesMessageVisibility();
                        updateBatchActions();
                    }
                });
            }
        });
    });
});