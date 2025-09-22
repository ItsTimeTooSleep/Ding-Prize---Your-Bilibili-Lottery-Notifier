import { showCustomConfirm } from './customConfirm.js';
import { updatePopup } from './statusUpdater.js';

export function bindMessageItemEvents(item, msg) {
    // 为删除按钮绑定事件
    item.querySelector('.delete-button').onclick = (event) => {
        event.stopPropagation(); // 阻止事件冒泡
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
        button.addEventListener('click', async (event) => {
            event.stopPropagation(); // 阻止事件冒泡
            const targetTitle = msg.title;
            const targetUid = msg.uid;
            const targetRawContent = msg.rawContent; // 获取原始消息内容
            const targetThumb = msg.thumb; // 获取 thumb 字段
            const senderUid = msg.senderUid || 'N/A';
            const senderName = msg.senderName || 'N/A';
            const messageContent = msg.messageContent || 'N/A';
            const timestamp = new Date(msg.timestamp).toLocaleString();

            let textToCopy = `标题: ${targetTitle}\nUID: ${targetUid}`;
            if (targetThumb) {
                textToCopy += `\n缩略图: ${targetThumb}`;
            }
            textToCopy += `\n发送者UID: ${senderUid}\n发送者昵称: ${senderName}\n消息内容: ${messageContent}\n时间: ${timestamp}`;
            if (targetRawContent && targetRawContent !== '无') {
                textToCopy += `\n原始消息: ${targetRawContent}`;
            }

            try {
                await navigator.clipboard.writeText(textToCopy);
                const originalIcon = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i> 已复制!';
                setTimeout(() => {
                    button.innerHTML = originalIcon;
                }, 1500);
            } catch (err) {
                console.error('复制失败:', err);
            }
        });
    });
}