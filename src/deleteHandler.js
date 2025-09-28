// src/deleteHandler.js

import { showCustomConfirm } from './customConfirm.js';

/**
 * 处理单个或批量删除中奖消息的逻辑。
 * @param {Array<string>} messageIds - 要删除的消息ID数组。
 * @param {Function} updateUI - 更新UI的回调函数，接受一个已删除消息ID的数组。
 * @param {Function} updateBatchActions - 更新批量操作按钮状态的回调函数。
 */
export async function handleDeletePrizeMessages(messageIds, updateUI, updateBatchActions) {
    if (!messageIds || messageIds.length === 0) {
        console.warn('没有选中任何消息进行删除。');
        return;
    }

    const confirmMessage = messageIds.length === 1 ?
        '确定要删除此中奖消息吗？' :
        `确定要删除选中的 ${messageIds.length} 条中奖消息吗？`;

    const confirmed = await showCustomConfirm(confirmMessage);

    if (confirmed) {
        chrome.runtime.sendMessage({
            action: 'deletePrizeMessages',
            messageIds: messageIds
        }, (response) => {
            if (response && response.status === "success") {
                console.log('[deleteHandler] 删除成功:', messageIds);
                // 调用UI更新函数，移除DOM元素
                if (updateUI && typeof updateUI === 'function') {
                    updateUI(messageIds);
                }
                // 更新批量操作按钮状态
                if (updateBatchActions && typeof updateBatchActions === 'function') {
                    updateBatchActions();
                }
            } else {
                console.error('[deleteHandler] 删除失败:', response);
                alert('删除失败，请稍后再试。');
            }
        });
    }
}

/**
 * 设置删除按钮的事件监听器。
 * @param {HTMLElement} containerElement - 包含删除按钮的DOM元素。
 * @param {Function} getSelectedPrizeIds - 获取当前选中消息ID的回调函数（用于批量删除）。
 * @param {Function} updateUI - 更新UI的回调函数。
 * @param {Function} updateBatchActions - 更新批量操作按钮状态的回调函数。
 */
export function setupDeleteEventListeners(containerElement, getSelectedPrizeIds, updateUI, updateBatchActions) {
    // 单个删除按钮的事件监听
    containerElement.addEventListener('click', async (event) => {
        const deleteButton = event.target.closest('.delete-button');
        if (deleteButton && !deleteButton.closest('#delete-selected-prizes')) { // 排除批量删除按钮
            const prizeId = deleteButton.dataset.id;
            if (prizeId) {
                await handleDeletePrizeMessages([prizeId], updateUI, updateBatchActions);
            }
        }
    });

    // 批量删除按钮的事件监听
    const deleteSelectedButton = containerElement.querySelector('#delete-selected-prizes');
    if (deleteSelectedButton) {
        deleteSelectedButton.addEventListener('click', async () => {
            const selectedPrizeIds = getSelectedPrizeIds();
            await handleDeletePrizeMessages(selectedPrizeIds, updateUI, updateBatchActions);
        });
    }
}