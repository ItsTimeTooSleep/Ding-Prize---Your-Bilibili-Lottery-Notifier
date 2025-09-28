// options.js
document.addEventListener('DOMContentLoaded', () => {
    const enabledSwitch = document.getElementById('enabled-switch');
    const checkIntervalInput = document.getElementById('check-interval');
    const prizeKeywordsTextarea = document.getElementById('prize-keywords');
    const blacklistKeywordsTextarea = document.getElementById('blacklist-keywords');
    const saveSettingsButton = document.getElementById('save-settings');
    const statusMessage = document.getElementById('status-message');

    // 新增屏蔽UID相关DOM元素
    const blockedUidInput = document.getElementById('blocked-uid-input');

    // let blockedUids = []; // 用于存储屏蔽UID的数组

    // 加载设置
    function loadSettings() {
        chrome.storage.sync.get(['enabled', 'checkInterval', 'prizeKeywords', 'blacklistKeywords', 'blockedUids'], (items) => {
            enabledSwitch.checked = items.enabled !== false; // 默认启用
            checkIntervalInput.value = items.checkInterval || 24; // 默认24小时 (每天一次)
            prizeKeywordsTextarea.value = items.prizeKeywords || '中奖\n恭喜\n获奖\n抽奖\n填写地址\n收货地址\n奖品\n礼物';
            blacklistKeywordsTextarea.value = items.blacklistKeywords || '';
            blockedUidInput.value = (items.blockedUids && items.blockedUids.length > 0) ? items.blockedUids.join('\n') : '';
        });
    }

    // 移除渲染已屏蔽UID列表的函数
    // function renderBlockedUids() {
    //     blockedUidsList.innerHTML = '';
    //     if (blockedUids.length === 0) {
    //         blockedUidsList.innerHTML = '<li class="hint">暂无屏蔽UID</li>';
    //         return;
    //     }
    //     blockedUids.forEach(uid => {
    //         const listItem = document.createElement('li');
    //         listItem.className = 'tag-item';
    //         listItem.innerHTML = `
    //             <span>${uid}</span>
    //             <button class="remove-tag" data-uid="${uid}"><i class="fas fa-times"></i></button>
    //         `;
    //         blockedUidsList.appendChild(listItem);
    //     });
    // }

    // 移除添加屏蔽UID的逻辑
    // addBlockedUidButton.addEventListener('click', () => {
    //     const uid = blockedUidInput.value.trim();
    //     if (uid && !blockedUids.includes(uid)) {
    //         blockedUids.push(uid);
    //         blockedUidInput.value = '';
    //         renderBlockedUids();
    //         saveSettings(); // 保存设置
    //     } else if (uid && blockedUids.includes(uid)) {
    //         statusMessage.textContent = '该UID已在屏蔽列表中！';
    //         statusMessage.style.color = 'orange';
    //         statusMessage.style.opacity = '1';
    //         setTimeout(() => {
    //             statusMessage.style.opacity = '0';
    //         }, 3000);
    //     }
    // });

    // 移除移除屏蔽UID的逻辑
    // blockedUidsList.addEventListener('click', (event) => {
    //     if (event.target.classList.contains('remove-tag') || event.target.closest('.remove-tag')) {
    //         const uidToRemove = event.target.dataset.uid || event.target.closest('.remove-tag').dataset.uid;
    //         blockedUids = blockedUids.filter(uid => uid !== uidToRemove);
    //         renderBlockedUids();
    //         saveSettings(); // 保存设置
    //     }
    // });

    // 统一保存设置的函数
    function saveSettings() {
        const enabled = enabledSwitch.checked;
        const checkInterval = parseInt(checkIntervalInput.value);
        const prizeKeywords = prizeKeywordsTextarea.value;
        const blacklistKeywords = blacklistKeywordsTextarea.value;
        const blockedUids = blockedUidInput.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);

        if (isNaN(checkInterval) || checkInterval < 1 || checkInterval > 168) {
            statusMessage.textContent = '检测频率必须是1到168之间的数字（即最多7天）！';
            statusMessage.style.color = 'red';
            statusMessage.style.opacity = '1';
            setTimeout(() => {
                statusMessage.style.opacity = '0';
            }, 3000);
            return;
        }

        if (prizeKeywords.trim() === '') {
            statusMessage.textContent = '中奖关键词不能为空！';
            statusMessage.style.color = 'red';
            statusMessage.style.opacity = '1';
            setTimeout(() => {
                statusMessage.style.opacity = '0';
            }, 3000);
            return;
        }

        chrome.storage.sync.set({
            enabled: enabled,
            checkInterval: checkInterval,
            prizeKeywords: prizeKeywords,
            blacklistKeywords: blacklistKeywords,
            blockedUids: blockedUids // 保存屏蔽UID列表
        }, () => {
            statusMessage.textContent = '设置已保存！';
            statusMessage.style.color = 'green';
            statusMessage.style.opacity = '1';
            setTimeout(() => {
                statusMessage.style.opacity = '0';
            }, 3000);
        });
    }

    // 修改保存按钮的事件监听器，调用统一的 saveSettings 函数
    saveSettingsButton.addEventListener('click', saveSettings);

    // 输入框动画效果
    const inputGroups = document.querySelectorAll('.input-group input, .input-group textarea');
    inputGroups.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentNode.classList.add('focused');
        });
        input.addEventListener('blur', () => {
            if (input.value === '') {
                input.parentNode.classList.remove('focused');
            }
        });
    });

    // 初始化加载设置
    loadSettings();
});