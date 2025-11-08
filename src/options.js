// options.js
document.addEventListener('DOMContentLoaded', () => {
    const enabledSwitch = document.getElementById('enabled-switch');
    const checkIntervalInput = document.getElementById('check-interval');
    const prizeKeywordsTextarea = document.getElementById('prize-keywords');
    const blacklistKeywordsTextarea = document.getElementById('blacklist-keywords');
    const saveSettingsButton = document.getElementById('save-settings');
    const statusMessage = document.getElementById('status-message');
    const autoUpdateSwitch = document.getElementById('auto-update-switch'); // Get reference to the new switch
    const manualCheckUpdateButton = document.getElementById('manual-check-update'); // Get reference to the new button

    // 新增黑名单模式相关DOM元素
    const defaultBlacklistModeRadio = document.getElementById('default-blacklist-mode');
    const manualBlacklistModeRadio = document.getElementById('manual-blacklist-mode');

    // 新增屏蔽UID相关DOM元素
    const blockedUidInput = document.getElementById('blocked-uid-input');

    // let blockedUids = []; // 用于存储屏蔽UID的数组

    // 加载设置
    function loadSettings() {
        chrome.storage.sync.get(['enabled', 'checkInterval', 'prizeKeywords', 'blacklistKeywords', 'blockedUids', 'autoUpdateCheck', 'blacklistMode', 'defaultBlacklistKeywords'], (items) => { // Add autoUpdateCheck, blacklistMode and defaultBlacklistKeywords
            enabledSwitch.checked = items.enabled !== false; // 默认启用
            checkIntervalInput.value = items.checkInterval || 24; // 默认24小时 (每天一次)
            prizeKeywordsTextarea.value = items.prizeKeywords || '中奖\n恭喜\n获奖\n抽奖\n填写地址\n收货地址\n奖品\n礼物';
            // blacklistKeywordsTextarea.value = items.blacklistKeywords || ''; // This line will be updated
            blockedUidInput.value = (items.blockedUids && items.blockedUids.length > 0) ? items.blockedUids.join('\n') : '';
            autoUpdateSwitch.checked = items.autoUpdateCheck !== false; // Default to true

            // 设置黑名单模式单选按钮
            const currentBlacklistMode = items.blacklistMode || 'default';
            if (currentBlacklistMode === 'default') {
                defaultBlacklistModeRadio.checked = true;
                blacklistKeywordsTextarea.value = items.defaultBlacklistKeywords || '';
            } else {
                manualBlacklistModeRadio.checked = true;
                // When loading in manual mode, if manualKeywords is empty, use defaultKeywords
                blacklistKeywordsTextarea.value = items.blacklistKeywords || items.defaultBlacklistKeywords || '';
            }
            updateBlacklistTextareaState(currentBlacklistMode, items.defaultBlacklistKeywords || '', items.blacklistKeywords || '');
        });
    }

    // 根据黑名单模式更新文本区域状态和内容
    function updateBlacklistTextareaState(mode, defaultKeywords, manualKeywords) {
        if (mode === 'default') {
            blacklistKeywordsTextarea.disabled = true;
            blacklistKeywordsTextarea.title = '默认黑名单模式下，黑名单内容自动更新，无法手动编辑。';
            blacklistKeywordsTextarea.value = defaultKeywords;
        } else {
            blacklistKeywordsTextarea.disabled = false;
            blacklistKeywordsTextarea.title = '';
            // If manualKeywords is empty, use defaultKeywords as a starting point
            blacklistKeywordsTextarea.value = manualKeywords || defaultKeywords;
        }
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
        // const blacklistKeywords = blacklistKeywordsTextarea.value; // This line will be updated
        const blockedUids = blockedUidInput.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
        const autoUpdateCheck = autoUpdateSwitch.checked; // Get autoUpdateCheck value
        const blacklistMode = document.querySelector('input[name="blacklist-mode"]:checked').value; // Get blacklist mode

        // If in default mode, we don't save the textarea content as blacklistKeywords
        let blacklistKeywordsToSave = '';
        if (blacklistMode === 'manual') {
            blacklistKeywordsToSave = blacklistKeywordsTextarea.value;
        }

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
            blacklistKeywords: blacklistKeywordsToSave, // Save blacklistKeywords based on mode
            blockedUids: blockedUids, // 保存屏蔽UID列表
            autoUpdateCheck: autoUpdateCheck, // Save autoUpdateCheck setting
            blacklistMode: blacklistMode // 保存黑名单模式
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

    // Add event listener for autoUpdateSwitch
    autoUpdateSwitch.addEventListener('change', saveSettings);

    // Add event listener for enabledSwitch
    enabledSwitch.addEventListener('change', saveSettings);

    // Add event listeners for blacklist mode radio buttons
    defaultBlacklistModeRadio.addEventListener('change', async (event) => {
        const items = await chrome.storage.sync.get(['defaultBlacklistKeywords', 'blacklistKeywords']);
        updateBlacklistTextareaState(event.target.value, items.defaultBlacklistKeywords || '', items.blacklistKeywords || '');
        saveSettings();
    });
    manualBlacklistModeRadio.addEventListener('change', async (event) => {
        const items = await chrome.storage.sync.get(['defaultBlacklistKeywords', 'blacklistKeywords']);
        updateBlacklistTextareaState(event.target.value, items.defaultBlacklistKeywords || '', items.blacklistKeywords || '');
        saveSettings();
    });

    // Add event listener for manualCheckUpdateButton
    const updateStatusMessage = document.getElementById('update-status-message');

    function displayUpdateStatus(message, type = 'info', url = null) {
        updateStatusMessage.innerHTML = ''; // Clear previous content
        if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.textContent = message;
            link.target = '_blank'; // Open in new tab
            link.style.color = type === 'error' ? 'red' : (type === 'success' ? 'green' : 'black');
            link.style.textDecoration = 'underline';
            updateStatusMessage.appendChild(link);
        } else {
            updateStatusMessage.textContent = message;
            updateStatusMessage.style.color = type === 'error' ? 'red' : (type === 'success' ? 'green' : 'black');
        }
        updateStatusMessage.style.opacity = '1';
        setTimeout(() => {
            updateStatusMessage.style.opacity = '0';
            updateStatusMessage.innerHTML = ''; // Clear content after fading out
        }, 5000);
    }

    manualCheckUpdateButton.addEventListener('click', () => {
        console.log('手动检查更新按钮被点击。');
        displayUpdateStatus('正在检查更新...', 'info');
        chrome.runtime.sendMessage({ action: 'manualCheckForUpdates' }, response => {
            console.log('Received update check response:', JSON.stringify(response));
            if (response && response.status) {
                if (response.status === 'no_update') {
                    displayUpdateStatus('当前已是最新版本。', 'success');
                } else if (response.status === 'new_version_available') {
                    const releaseUrl = `https://github.com/ItsTimeTooSleep/Ding-Prize---Your-Bilibili-Lottery-Notifier/releases/tag/v${response.latestVersion}`;
                    displayUpdateStatus(`发现新版本：${response.latestVersion}，请前往更新。`, 'success', releaseUrl);
                } else if (response.status === 'check_failed') {
                    displayUpdateStatus('更新检查失败，请稍后再试。', 'error');
                } else {
                    displayUpdateStatus('手动更新检查请求完成，但状态未知。', 'error');
                }
            } else {
                displayUpdateStatus('未能获取更新状态。', 'error');
            }
        });
    });

    // 监听来自 background.js 的自动更新检查结果
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === "autoUpdateCheckResult") {
            console.log('Received auto update check result:', request);
            if (request.status === 'new_version_available') {
                const releaseUrl = `https://github.com/ItsTimeTooSleep/Ding-Prize---Your-Bilibili-Lottery-Notifier/releases/tag/v${request.latestVersion}`;
                displayUpdateStatus(`发现新版本：${request.latestVersion}，请前往更新。`, 'success', releaseUrl);
            } else if (request.status === 'no_update') {
                // 自动检查时，如果无更新，不显示消息，避免打扰用户
                console.log('自动更新检查：当前已是最新版本。');
            } else if (request.status === 'check_failed') {
                displayUpdateStatus('自动更新检查失败，请稍后再试。', 'error');
            }
        }
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