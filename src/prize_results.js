import { setupDeleteEventListeners } from './deleteHandler.js';

document.addEventListener('DOMContentLoaded', () => {
    const prizeMessagesList = document.getElementById('all-prize-messages-list');
    console.log('prizeMessagesList element:', prizeMessagesList); // Add this line
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

        // deleteButton.addEventListener('click', () => {
        //     deletePrize(message.id);
        // });

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
                console.log('updateNoPrizesMessageVisibility: No prize messages. Displaying "no-prizes-message".'); // Add this line
                document.getElementById('no-prizes-message').style.display = 'block';
                prizeMessagesList.style.display = 'none';
                batchActionsContainer.style.display = 'none'; // Hide batch actions if no prizes
            } else {
                console.log('updateNoPrizesMessageVisibility: Prize messages exist. Hiding "no-prizes-message".'); // Add this line
                document.getElementById('no-prizes-message').style.display = 'none';
                prizeMessagesList.style.display = 'block';
                updateBatchActions(); // Update batch actions visibility
            }
        });
    }

    // 添加批量操作相关变量
    const batchActionsContainer = document.querySelector('.batch-actions');
    const selectAllCheckbox = document.getElementById('select-all-prizes');
    const deleteSelectedButton = document.getElementById('delete-selected-prizes');
    let selectedPrizeIds = [];

    // 新增函数：加载并渲染中奖消息
    function loadAndRenderPrizeMessages() {
        console.log('loadAndRenderPrizeMessages called.'); // Add this line
        prizeMessagesList.innerHTML = ''; // 清空现有列表
        console.log('prizeMessagesList cleared. Current innerHTML:', prizeMessagesList.innerHTML); // Add this line
        selectedPrizeIds = []; // 清空选中项

        chrome.storage.local.get(['prizeMessages'], (result) => {
            const allPrizeMessages = result.prizeMessages || [];

            if (allPrizeMessages.length === 0) {
                console.log('No prize messages found. Displaying "no-prizes-message".'); // Add this line
                document.getElementById('no-prizes-message').style.display = 'block';
                prizeMessagesList.style.display = 'none';
                batchActionsContainer.style.display = 'none';
            } else {
                document.getElementById('no-prizes-message').style.display = 'none';
                prizeMessagesList.style.display = 'block';
                allPrizeMessages.forEach((message) => {
                    const listItem = renderPrizeMessage(message);
                    prizeMessagesList.prepend(listItem);
                    bindMessageItemEvents(listItem, message);
                });
            }
            updateNoPrizesMessageVisibility();
            updateBatchActions();
        });
    }

    // 初始加载和渲染
    loadAndRenderPrizeMessages();

    // 监听来自 background.js 的刷新消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === "refreshPrizeResults") {
            console.log('[prize_results.js] Received refreshPrizeResults message. Reloading...');
            loadAndRenderPrizeMessages();
            sendResponse({ status: "refreshed" });
        }
    });

    backButton.addEventListener('click', () => {
        window.close();
    });


    function copyPrizeInfo(prize) {
        const prizeInfo = `\n标题: ${prize.title}\nUID: ${prize.uid}\n缩略图: ${prize.thumb || 'N/A'}\n发送者昵称: ${prize.senderName || 'N/A'}\n消息内容: ${prize.messageContent || 'N/A'}\n时间: ${new Date(prize.timestamp).toLocaleString()}\n原始消息: ${prize.rawContent || 'N/A'}\n`;
        navigator.clipboard.writeText(prizeInfo).then(() => {
            alert('完整中奖信息已复制到剪贴板！');
        }).catch(err => {
            console.error('复制失败:', err);
        });
    }


    // 获取DOM元素
    // const prizeMessagesList = document.getElementById('prize-messages-list');
    // const noPrizesMessage = document.getElementById('no-prizes-message');
    // const selectAllCheckbox = document.getElementById('select-all-prizes');
    // const batchActionsContainer = document.getElementById('batch-actions');
    // const deleteSelectedButton = document.getElementById('delete-selected-prizes');

    // 修改渲染逻辑，添加复选框
    function renderPrizeMessage(message) {
        console.log('[prize_results.js] renderPrizeMessage - message.id:', message.id, 'Type:', typeof message.id);
        const listItem = document.createElement('li');
        listItem.className = 'prize-item';

        let displayTitle = message.title;
        // 移除 JSON.parse，因为 message.title 预期是普通字符串
        // try {
        //     const parsedTitle = JSON.parse(message.title);
        //     if (parsedTitle && parsedTitle.title) {
        //         displayTitle = parsedTitle.title;
        //     }
        // } catch (e) {
        //     console.error("Failed to parse message.title as JSON:", e);
        // }
        let originalMessageContent = message.rawContent || '无';
        // 移除 JSON.parse，因为 originalMessageContent 预期是普通字符串
        // try {
        //     const parsedRawContent = JSON.parse(originalMessageContent);
        //     if (parsedRawContent && parsedRawContent.content) {
        //         originalMessageContent = parsedRawContent.content;
        //     }
        // } catch (e) {
        //     // Not a JSON string, or doesn't contain 'content' field, use as is.
        // }
        const thumbDisplay = message.thumb ? `<img src="${message.thumb}" alt="缩略图" class="prize-thumb">` : '';

        // 检查当前消息是否已被选中，以设置复选框的初始状态
        const isSelected = selectedPrizeIds.includes(message.id);

        listItem.innerHTML = `\n            <div class="prize-item-header">\n                <input type="checkbox" class="prize-checkbox" data-prize-id="${message.id}" ${isSelected ? 'checked' : ''}>\n                <p><strong>标题:</strong> ${displayTitle}</p>\n            </div>\n            <div class="message-content">\n                <p><strong>UID:</strong> ${message.uid}</p>\n                <p><strong>原始消息:</strong> ${originalMessageContent}</p>\n                <p><strong>时间:</strong> ${new Date(message.timestamp).toLocaleString()}</p>\n                ${thumbDisplay}\n            </div>\n            <div class="actions">\n                <button class="delete-button" data-id="${message.id}"><i class="fas fa-trash-alt"></i> 删除</button>\n                <button class="copy-button" data-id="${message.id}"><i class="fas fa-copy"></i> 复制</button>\n                <button class="visit-button" data-uid="${message.uid}"><i class="fas fa-external-link-alt"></i> 访问</button>\n            </div>\n        `;

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

    // 移除处理删除选中按钮的逻辑
    // deleteSelectedButton.addEventListener('click', () => { ... });

    // 定义 updateBatchActions 函数
    function updateBatchActions() {
        if (selectedPrizeIds.length > 0) {
            batchActionsContainer.style.display = 'flex';
            deleteSelectedButton.disabled = false;
        } else {
            batchActionsContainer.style.display = 'none';
            deleteSelectedButton.disabled = true;
        }
    }

    // 初始化删除事件监听器
    setupDeleteEventListeners(
        document, // 监听整个文档，因为删除按钮可能动态添加
        () => selectedPrizeIds, // 获取选中ID的函数
        (deletedIds) => {
            // UI更新逻辑：移除DOM元素
            deletedIds.forEach(prizeId => {
                const itemToRemove = document.querySelector(`.prize-item input[data-prize-id="${prizeId}"]`)?.closest('.prize-item');
                if (itemToRemove) {
                    itemToRemove.classList.add('deleting');
                    setTimeout(() => {
                        itemToRemove.remove();
                        // 从 selectedPrizeIds 中移除已删除的ID
                        selectedPrizeIds = selectedPrizeIds.filter(id => id !== prizeId);
                        updateNoPrizesMessageVisibility();
                    }, 200);
                }
            });
        },
        updateBatchActions // 更新批量操作按钮状态
    );
});