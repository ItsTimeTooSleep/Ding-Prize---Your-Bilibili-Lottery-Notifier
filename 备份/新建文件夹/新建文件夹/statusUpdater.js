// statusUpdater.js
import { bindMessageItemEvents } from './messageHandler.js';

export function updatePopup() {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const lastCheckedTimeSpan = document.getElementById('last-checked-time');
    const checkNowButton = document.getElementById('check-now');

    chrome.storage.sync.get(['enabled', 'lastCheckedTime', 'isChecking'], (syncItems) => {
        chrome.storage.local.get(['prizeMessages'], (localItems) => {
            const items = { ...syncItems, ...localItems };

            if (items.enabled) {
                statusDot.className = 'status-indicator status-normal';
                statusText.textContent = '守候中...';
            } else {
                statusDot.className = 'status-indicator status-error';
                statusText.textContent = '已禁用';
            }

            if (items.lastCheckedTime) {
                lastCheckedTimeSpan.textContent = new Date(items.lastCheckedTime).toLocaleString();
            } else {
                lastCheckedTimeSpan.textContent = 'N/A';
            }

            // 处理检测中状态
            if (items.isChecking) {
                statusDot.className = 'status-indicator status-checking';
                statusText.textContent = '检测中...';
                checkNowButton.classList.add('loading');
                checkNowButton.disabled = true;
            } else {
                checkNowButton.classList.remove('loading');
                checkNowButton.disabled = false;
            }

            // 更新中奖消息列表
            const prizeMessages = items.prizeMessages || [];
            const prizeMessagesList = document.getElementById('prize-messages-list');
            if (prizeMessagesList) {
                // 获取当前显示的消息
                const currentMessages = Array.from(prizeMessagesList.children).map(item => {
                    const titleElement = item.querySelector('.message-content strong:first-child');
                    const uidElement = item.querySelector('.message-content p:last-child');
                    return {
                        title: titleElement ? titleElement.textContent.replace('标题:', '').trim() : '',
                        uid: uidElement ? uidElement.textContent.replace('UID:', '').trim() : ''
                    };
                });

                // 找出需要添加、删除或更新的消息
                const newMessages = prizeMessages.slice(0, 3);

                // 移除不再存在的消息
                currentMessages.forEach((currentMsg, index) => {
                    if (!newMessages.some(newMsg => newMsg.title === currentMsg.title && newMsg.uid === currentMsg.uid)) {
                        prizeMessagesList.children[index].remove();
                    }
                });

                // 添加或更新消息
                newMessages.forEach((newMsg, index) => {
                    const existingItem = Array.from(prizeMessagesList.children).find(item => {
                        const titleElement = item.querySelector('.message-content strong:first-child');
                        const uidElement = item.querySelector('.message-content p:last-child');
                        const title = titleElement ? titleElement.textContent.replace('标题:', '').trim() : '';
                        const uid = uidElement ? uidElement.textContent.replace('UID:', '').trim() : '';
                        return title === newMsg.title && uid === newMsg.uid;
                    });

                    if (existingItem) {
                        // 如果消息已存在，更新其内容（如果需要）
                        existingItem.querySelector('.message-content').innerHTML = `
                            <p title="${newMsg.title}"><strong>标题:</strong> ${newMsg.title}</p>
                            <p><strong>UID:</strong> ${newMsg.uid}</p>
                        `;
                        // 重新绑定事件监听器，确保是最新的
                        bindMessageItemEvents(existingItem, newMsg);
                    } else {
                        // 如果消息不存在，创建并添加新消息
                        const listItem = document.createElement('li');
                        listItem.className = 'message-item';
                        listItem.dataset.uid = newMsg.uid; // 添加 uid 到 dataset
                        listItem.innerHTML = `
                            <div class="message-content">
                                <p title="${newMsg.title}"><strong>标题:</strong> ${newMsg.title}</p>
                                <p><strong>UID:</strong> ${newMsg.uid}</p>
                            </div>
                            <div class="actions">
                                <button class="delete-button" data-title="${newMsg.title}" data-uid="${newMsg.uid}"><i class="fas fa-trash-alt"></i> 删除</button>
                                <button class="copy-button" data-title="${newMsg.title}" data-uid="${newMsg.uid}"><i class="fas fa-copy"></i> 复制</button>
                            </div>
                        `;
                        prizeMessagesList.insertBefore(listItem, prizeMessagesList.children[index]);
                        bindMessageItemEvents(listItem, newMsg);

                        // 添加点击事件，跳转到私信页面
                        listItem.addEventListener('click', () => {
                            const uid = listItem.dataset.uid;
                            if (uid) {
                                const url = `https://message.bilibili.com/?spm_id_from=333.1007.0.0#/whisper/mid${uid}`;
                                chrome.tabs.create({ url: url });
                            }
                        });
                    }
                });

                // 如果没有消息，显示“暂无中奖消息”
                if (newMessages.length === 0 && prizeMessagesList.children.length === 0) {
                    const noMessagesItem = document.createElement('div');
                    noMessagesItem.className = 'no-results';
                    noMessagesItem.innerHTML = `
                        <i class="fas fa-box-open"></i>
                        <p>暂无中奖消息</p>
                    `;
                    prizeMessagesList.appendChild(noMessagesItem);
                } else if (newMessages.length > 0 && prizeMessagesList.querySelector('.no-results')) {
                    // 如果有消息了，移除“暂无中奖消息”
                    prizeMessagesList.querySelector('.no-results').remove();
                }
            }
        });
    });
}