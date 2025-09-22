import { updatePopup } from './statusUpdater.js';
import { setupEventListeners } from './eventListeners.js';

document.addEventListener('DOMContentLoaded', () => {
    // 初始化时更新弹窗状态，这会触发 statusUpdater.js 中的 updatePopup 函数
    updatePopup();
    // 设置所有事件监听器，包括 chrome.storage.sync.onChanged 和 chrome.runtime.onMessage
    setupEventListeners();

    // 为“打开设置页面”按钮添加点击事件监听器
    document.getElementById('open-options').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // 为“立即检测”按钮添加点击事件监听器
    document.getElementById('check-now').addEventListener('click', () => {
        // 向 background.js 发送消息，请求执行奖品检测
        chrome.runtime.sendMessage({ action: 'checkMessagesNow' });
    });

    // 为“查看所有奖品”按钮添加点击事件监听器
    document.getElementById('view-all-prizes').addEventListener('click', () => {
        // 在新标签页中打开 prize_results.html 页面
        chrome.tabs.create({ url: chrome.runtime.getURL('prize_results.html') });
    });

    // bindMessageItemEvents 函数不再直接在此处调用，它由 statusUpdater.js 中的 updatePopup 函数在更新消息列表时调用。
});

// 以下是已迁移函数的注释，提醒它们现在位于其他文件，以保持 popup.js 的简洁和模块化：
// updatePopup 函数已迁移到 statusUpdater.js，负责更新弹窗的UI状态。
// showConfetti 函数已迁移到 confetti.js，负责显示彩带动画。它通过 eventListeners.js 中的 chrome.runtime.onMessage 监听器间接调用。
// showCustomConfirm 函数已迁移到 customConfirm.js，负责显示自定义确认弹窗。它通过 eventListeners.js 中的 chrome.runtime.onMessage 监听器和 messageHandler.js 间接调用。
// bindMessageItemEvents 函数已迁移到 messageHandler.js，负责处理消息列表项的事件（如删除和复制）。
// chrome.storage.sync.onChanged 和 chrome.runtime.onMessage 监听器已迁移到 eventListeners.js，负责集中管理扩展的事件响应。