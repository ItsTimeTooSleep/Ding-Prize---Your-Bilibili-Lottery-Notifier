// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const lastCheckedTimeSpan = document.getElementById('last-checked-time');
    const recentResultsDiv = document.getElementById('recent-results');
    const openOptionsButton = document.getElementById('open-options');
    const checkNowButton = document.getElementById('check-now');

    // 加载并显示插件状态和最近检测时间
    function updatePopup(status, lastChecked, prizeMessages) {
        const statusIndicator = document.getElementById('status-dot');
        const statusTextElement = document.getElementById('status-text'); // 重命名以避免冲突
        const lastCheckedSpan = document.getElementById('last-checked-time');
        const prizeMessagesContainer = document.getElementById('prize-messages');
        const noResultsMessage = document.getElementById('no-results-message');

        // 清除所有状态类
        statusIndicator.classList.remove('status-normal', 'status-error', 'status-checking');

        // 根据状态设置样式和文本
        // if (status === 'normal') {
        //     statusIndicator.classList.add('status-normal');
        //     statusTextElement.textContent = '正常运行';
        // } else if (status === 'error') {
        //     statusIndicator.classList.add('status-error');
        //     statusTextElement.textContent = '出现错误';
        // } else if (status === 'checking') {
        //     statusIndicator.classList.add('status-checking');
        //     statusTextElement.textContent = '正在检测...';
        // }

        chrome.storage.sync.get(['enabled', 'lastCheckedTime', 'isChecking'], (syncItems) => {
            chrome.storage.local.get(['prizeMessages'], (localItems) => {
                const items = { ...syncItems, ...localItems };

                if (items.enabled) {
                    statusDot.className = 'status-indicator status-normal';
                    statusText.textContent = '正常';
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
                // if (items.isChecking) {
                //     statusDot.className = 'status-indicator status-checking';
                //     statusText.textContent = '检测中...';
                //     checkNowButton.classList.add('loading');
                //     checkNowButton.disabled = true;
                // } else {
                //     checkNowButton.classList.remove('loading');
                //     checkNowButton.disabled = false;
                // }

                // 更新中奖消息列表
                 const prizeMessages = items.prizeMessages || [];
                 const prizeMessagesList = document.getElementById('prize-messages-list');
                 if (prizeMessagesList) {
                     // 获取当前显示的消息
                     const currentMessages = Array.from(prizeMessagesList.children).map(item => ({
                         title: item.querySelector('.message-content strong:first-child').textContent.replace('标题:', '').trim(),
                         uid: item.querySelector('.message-content p:last-child').textContent.replace('UID:', '').trim()
                     }));

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
                             const title = item.querySelector('.message-content strong:first-child').textContent.replace('标题:', '').trim();
                             const uid = item.querySelector('.message-content p:last-child').textContent.replace('UID:', '').trim();
                             return title === newMsg.title && uid === newMsg.uid;
                         });

                         if (existingItem) {
                             // 如果消息已存在，更新其内容（如果需要）
                             const truncatedTitle = newMsg.title.length > 20 ? newMsg.title.substring(0, 20) + '...' : newMsg.title;
                             existingItem.querySelector('.message-content').innerHTML = `
                                 <p><strong>标题:</strong> ${truncatedTitle}</p>
                                 <p><strong>UID:</strong> ${newMsg.uid}</p>
                             `;
                             // 重新绑定事件监听器，确保是最新的
                             bindMessageItemEvents(existingItem, newMsg);
                         } else {
                             // 如果消息不存在，创建并添加新消息
                             const listItem = document.createElement('li');
                             listItem.className = 'message-item';
                             const truncatedTitle = newMsg.title.length > 20 ? newMsg.title.substring(0, 20) + '...' : newMsg.title;
                             listItem.innerHTML = `
                                 <div class="message-content">
                                     <p><strong>标题:</strong> ${truncatedTitle}</p>
                                     <p><strong>UID:</strong> ${newMsg.uid}</p>
                                 </div>
                                 <div class="actions">
                                     <button class="delete-button" data-title="${newMsg.title}" data-uid="${newMsg.uid}"><i class="fas fa-trash-alt"></i> 删除</button>
                                     <button class="copy-button" data-title="${newMsg.title}" data-uid="${newMsg.uid}"><i class="fas fa-copy"></i> 复制</button>
                                 </div>
                             `;
                             prizeMessagesList.insertBefore(listItem, prizeMessagesList.children[index]);
                             bindMessageItemEvents(listItem, newMsg);
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

                     // 辅助函数：绑定消息项的事件
                     function bindMessageItemEvents(item, msg) {
                         // 为删除按钮绑定事件
                         item.querySelector('.delete-button').onclick = () => {
                             showCustomConfirm('确定要删除这条中奖记录吗？', () => {
                                 chrome.storage.local.get(['prizeMessages'], (items) => {
                                     let currentPrizeMessages = items.prizeMessages || [];
                                     currentPrizeMessages = currentPrizeMessages.filter(m => !(m.title === msg.title && m.uid === msg.uid));
                                     chrome.storage.local.set({ prizeMessages: currentPrizeMessages }, () => {
                                         updatePopup(); // Refresh popup to reflect changes
                                     });
                                 });
                             });
                         };

                         // 为复制按钮绑定事件
                         item.querySelectorAll('.copy-button').forEach(button => {
                             button.addEventListener('click', (event) => {
                                 const targetTitle = event.target.dataset.title;
                                 const targetUid = event.target.dataset.uid;
                                 const targetRawContent = event.target.dataset.rawContent; // 获取原始消息内容
                                 let textToCopy = `标题: ${targetTitle}\nUID: ${targetUid}`;
                                 if (targetRawContent && targetRawContent !== '无') {
                                     textToCopy += `\n原始消息: ${targetRawContent}`;
                                 }
                                 navigator.clipboard.writeText(textToCopy).then(() => {
                                     const originalText = event.target.textContent;
                                     event.target.textContent = '已复制!';
                                     setTimeout(() => {
                                         event.target.textContent = originalText;
                                     }, 1500);
                                 }).catch(err => {
                                     console.error('复制失败:', err);
                                 });
                             });
                         });
                     }
                 }
             });
         });
     }

     updatePopup();

     // 监听设置变化，实时更新Popup
     chrome.storage.onChanged.addListener((changes, namespace) => {
         if (namespace === 'sync' && (changes.enabled || changes.lastCheckedTime || changes.isChecking)) {
             updatePopup();
         } else if (namespace === 'local' && changes.prizeMessages) {
             updatePopup();
         }
     });

     // 打开设置页面
     openOptionsButton.addEventListener('click', () => {
         chrome.runtime.openOptionsPage();
     });

     // 立即检测
     checkNowButton.addEventListener('click', () => {
         checkNowButton.disabled = true; // 禁用按钮
         checkNowButton.classList.add('loading'); // 添加加载动画类
         statusText.textContent = '检测中...'; // 更新状态文本
         lastCheckedTimeSpan.textContent = '更新中...'; // 更新时间文本

         chrome.runtime.sendMessage({ action: "checkMessagesNow" }, (response) => {
             if (response && response.status === "started") {
                 console.log("手动检测已启动");
                 chrome.storage.sync.set({ isChecking: true }); // 设置检测中状态
                 updatePopup();
             } else {
                 console.error("手动检测启动失败或插件已禁用");
                 chrome.storage.sync.set({ isChecking: false }); // 取消检测中状态
                 updatePopup();
             }
         });
     });

     // 监听来自 background.js 的进度更新消息
     chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
         if (request.type === "updateProgress") {
             const statusDot = document.getElementById('status-dot');
             const statusText = document.getElementById('status-text');
             const lastCheckedTimeElement = document.getElementById('last-checked-time');
             const checkNowButton = document.getElementById('check-now');
     
             if (request.status === "started") {
                 chrome.storage.sync.set({ isChecking: true }); // 设置检测中状态
                 if (statusDot) statusDot.className = 'status-indicator status-checking';
                 if (statusText) statusText.textContent = request.message || '正在检测...'; // 使用 request.message 或默认值
                 if (checkNowButton) {
                     checkNowButton.classList.add('loading');
                     checkNowButton.disabled = true;
                 }
             } else if (request.status === "completed") {
                 chrome.storage.sync.set({ isChecking: false }); // 取消检测中状态
                 if (statusDot) statusDot.className = 'status-indicator status-normal';
                 if (statusText) statusText.textContent = request.message || '检测完成'; // 使用 request.message 或默认值
                 // 修复：检测完成后，从 storage.sync 获取 lastCheckedTime
                 chrome.storage.sync.get(['lastCheckedTime'], (items) => {
                     if (lastCheckedTimeElement) {
                         lastCheckedTimeElement.textContent = items.lastCheckedTime ? new Date(items.lastCheckedTime).toLocaleString() : 'N/A';
                     }
                 });
                 if (checkNowButton) {
                     checkNowButton.classList.remove('loading');
                     checkNowButton.disabled = false;
                 }
                 updatePopup(); // 检测完成后更新中奖消息列表
                 if (request.newPrizeFound) {
                     showConfetti(); // 检测到新的中奖消息时触发彩带动画
                 }
             } else if (request.status === "error") {
                 chrome.storage.sync.set({ isChecking: false }); // 取消检测中状态
                 if (statusDot) statusDot.className = 'status-indicator status-error';
                 if (statusText) statusText.textContent = request.message || '出现错误'; // 使用 request.message 或默认值
                 if (checkNowButton) {
                     checkNowButton.classList.remove('loading');
                     checkNowButton.disabled = false;
                 }
             }
         } else if (request.type === "showNotification") {
             // 处理通知显示
             showConfetti();
         }
     });
     document.getElementById('check-now').addEventListener('click', () => {
         chrome.runtime.sendMessage({ action: 'checkMessagesNow' }); // 修改为 action: 'checkMessagesNow'
     });

     document.getElementById('view-all-prizes').addEventListener('click', () => {
         chrome.windows.create({
             url: chrome.runtime.getURL('prize_results.html'),
             type: 'popup',
             state: 'fullscreen' // 设置为全屏
         });
     });

     // 彩带动画函数
     function showConfetti() {
         const confettiContainer = document.createElement('div');
         confettiContainer.className = 'confetti-container';
         document.body.appendChild(confettiContainer);
     
         const colors = ['bilibili-pink', 'bilibili-blue', 'yellow', 'green'];
     
         for (let i = 0; i < 100; i++) {
             const confetti = document.createElement('div');
             confetti.className = `confetti ${colors[Math.floor(Math.random() * colors.length)]}`;
             confetti.style.left = `${Math.random() * 100}vw`;
             confetti.style.animationDelay = `${Math.random() * 2}s`;
             confettiContainer.appendChild(confetti);
         }
     
         setTimeout(() => {
             confettiContainer.remove();
         }, 3000); // 3秒后移除彩带容器
     }

     // 处理来自 background.js 的消息
     // chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
     //     if (request.type === "updateProgress") {
     //         updatePopup(); // 调用 updatePopup() 来刷新整个界面
     //         if (request.status === "completed" && request.newPrizeFound) {
     //             showConfetti(); // 检测到新的中奖消息时触发彩带动画
     //         }
     //     } else if (request.type === "showNotification") {
     //         // 处理通知显示
     //         showConfetti();
     //     }
     // });
})

// 显示自定义确认弹窗
function showCustomConfirm(message, onConfirm) {
    const dialog = document.getElementById('custom-confirm-dialog');
    const msgElement = document.getElementById('custom-confirm-message');
    const confirmBtn = document.getElementById('custom-confirm-ok');
    const cancelBtn = document.getElementById('custom-confirm-cancel');

    msgElement.textContent = message;
    dialog.classList.add('show');

    confirmBtn.onclick = () => {
        dialog.classList.remove('show');
        onConfirm();
    };

    cancelBtn.onclick = () => {
        dialog.classList.remove('show');
    };
}
