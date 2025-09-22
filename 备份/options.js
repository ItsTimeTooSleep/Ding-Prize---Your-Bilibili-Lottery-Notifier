// options.js
document.addEventListener('DOMContentLoaded', () => {
    const enabledSwitch = document.getElementById('enabled-switch');
    const checkIntervalInput = document.getElementById('check-interval');
    const prizeKeywordsTextarea = document.getElementById('prize-keywords');
    const blacklistKeywordsTextarea = document.getElementById('blacklist-keywords');
    const saveSettingsButton = document.getElementById('save-settings');
    const statusMessage = document.getElementById('status-message');

    // 加载设置
    function loadSettings() {
        chrome.storage.sync.get(['enabled', 'checkInterval', 'prizeKeywords', 'blacklistKeywords'], (items) => {
            enabledSwitch.checked = items.enabled !== false; // 默认启用
            checkIntervalInput.value = items.checkInterval || 5; // 默认5分钟
            prizeKeywordsTextarea.value = items.prizeKeywords || '中奖\n恭喜\n获奖\n抽奖\n填写地址\n收货地址\n奖品\n礼物';
            blacklistKeywordsTextarea.value = items.blacklistKeywords || '';
        });
    }

    // 保存设置
    saveSettingsButton.addEventListener('click', () => {
        const enabled = enabledSwitch.checked;
        const checkInterval = parseInt(checkIntervalInput.value);
        const prizeKeywords = prizeKeywordsTextarea.value;
        const blacklistKeywords = blacklistKeywordsTextarea.value;

        if (isNaN(checkInterval) || checkInterval < 1 || checkInterval > 1440) {
            statusMessage.textContent = '检测频率必须是1到1440之间的数字！';
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
            prizeKeywords: prizeKeywords
        }, () => {
            statusMessage.textContent = '设置已保存！';
            statusMessage.style.color = 'green';
            statusMessage.style.opacity = '1';
            setTimeout(() => {
                statusMessage.style.opacity = '0';
            }, 3000);
        });
    });

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