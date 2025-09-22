import { updatePopup } from './statusUpdater.js';
import { showConfetti } from './confetti.js';
import { showCustomConfirm } from './customConfirm.js';

export function setupEventListeners() {
    // 监听设置变化
    chrome.storage.sync.onChanged.addListener((changes, namespace) => {
        for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
            if (key === 'enabled' || key === 'lastCheckedTime' || key === 'isChecking') {
                updatePopup();
            }
        }
    });

    // 监听消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'showConfetti') {
            showConfetti();
            sendResponse({ status: 'Confetti shown' });
        } else if (request.action === 'showUpdateConfirm') {
            showCustomConfirm(request.message, () => {
                chrome.runtime.sendMessage({ action: 'confirmUpdate' });
            }, () => {
                chrome.runtime.sendMessage({ action: 'cancelUpdate' });
            });
            sendResponse({ status: 'Update confirm shown' });
        } else if (request.action === 'updatePopup') {
            updatePopup();
            sendResponse({ status: 'Popup updated' });
        } else if (request.type === "showNotification") {
            // 处理来自 background.js 的通知消息
            showNotification(request.message, request.notificationType);
            sendResponse({ status: 'Notification shown' });
        }
    });

    // 监听 chrome.storage.local 的变化，用于实时更新UI
    chrome.storage.local.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.prizeMessages) {
            console.log('chrome.storage.local.prizeMessages changed, updating popup.');
            updatePopup();
        }
    });

    // 监听来自 background.js 的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === "showNotification") {
            showNotification(request.message, request.notificationType);
        } else if (request.type === "updateProgress") {
            // 处理进度更新消息
            updateProgress(request.status, request.message);
            if (request.newPrizeFound) {
                showConfetti(); // 如果发现新奖品，显示彩带
            }
        }
    });
}

// 显示通知的函数
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');

    if (notification && notificationText) {
        notification.className = `notification ${type}`;
        notificationText.textContent = message;

        // 强制浏览器重绘以确保动画生效
        void notification.offsetWidth;

        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}