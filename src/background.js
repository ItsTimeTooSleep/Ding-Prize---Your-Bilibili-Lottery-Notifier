const PRIZE_SENDER_TYPES = [
    7,  // UP主小助手
    5,  // 系统通知
    1   // 官方账号
];

// 默认配置
const DEFAULT_SETTINGS = {
    enabled: true,
    checkInterval: 24, // hours
    prizeKeywords: [
        '中奖', '恭喜', '抽奖', '获奖', '幸运',
        '锦鲤', '地址', '收件',
        '奖品', '礼物', '赠品'
    ],
    blacklistKeywords: [
        '合集', '临期/速看', 'b站抽奖看这里', '预约成功', '已经通过审核', '你的稿件累计播放达到', '恭喜你完成限时任务', '你的粉丝数达到', '您的稿件《','⭐【精选大奖】⭐总计数','超开心，你终于关注','【假抽奖？】大家一起来判断！本期主角为：','恭喜宝子加入盼盼大家庭俱乐部','恭喜您，成功触发隐藏任务！','用心做视频，没你不行'
 // 以后可能把prizekeywords和blacklist单独放到一个文件里，方便管理，和方便切换配置

    ],
    lastCheckedTime: 0,
};

let blockedUids = [];

async function loadBlockedUids() {
    return new Promise((resolve) => {
        chrome.storage.sync.get('blockedUids', (items) => {
            blockedUids = items.blockedUids || [];
            console.log('[Background] Loaded Blocked UIDs:', blockedUids);
            resolve();
        });
    });
}

// 初始化设置
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(['enabled', 'checkInterval', 'prizeKeywords', 'blacklistKeywords'], (items) => {
        if (items.enabled === undefined) {
            chrome.storage.sync.set({ enabled: DEFAULT_SETTINGS.enabled });
        }
        if (items.checkInterval === undefined) {
            chrome.storage.sync.set({ checkInterval: DEFAULT_SETTINGS.checkInterval });
        }
        if (items.prizeKeywords === undefined) {
            chrome.storage.sync.set({ prizeKeywords: DEFAULT_SETTINGS.prizeKeywords.join('\n') });
        }
        if (items.blacklistKeywords === undefined) {
            chrome.storage.sync.set({ blacklistKeywords: DEFAULT_SETTINGS.blacklistKeywords.join('\n') });
        }
        // 创建或更新定时任务
        createAlarm(items.checkInterval || DEFAULT_SETTINGS.checkInterval);
    });

    loadBlockedUids(); // Load blocked UIDs on install

    // 插件安装时初始化设置
    chrome.runtime.onInstalled.addListener(() => {
        chrome.storage.sync.set(DEFAULT_SETTINGS);
        // 初始化 processedMessages 到 sync storage
        chrome.storage.sync.get(['processedMessages'], (items) => {
            if (items.processedMessages === undefined) {
                chrome.storage.sync.set({ processedMessages: [] });
            }
        });
        // 清除 local storage 中的 processedMessages
        chrome.storage.local.remove('processedMessages');
    });
});

// 监听设置变化，更新定时任务
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        if (changes.checkInterval) {
            const newInterval = changes.checkInterval.newValue;
            createAlarm(newInterval);
        }
        if (changes.enabled && !changes.enabled.newValue) {
            // 如果插件被禁用，清除定时任务
            chrome.alarms.clear('checkBiliMessages');
        }
    }
});

function createAlarm(intervalInHours) {
    chrome.alarms.clear('checkBiliMessages');
    if (intervalInHours > 0) {
        const intervalInMinutes = intervalInHours * 60; // 将小时转换为分钟
        chrome.alarms.create('checkBiliMessages', {
            delayInMinutes: intervalInMinutes,
            periodInMinutes: intervalInMinutes
        });
    }
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkBiliMessages') {
        chrome.storage.sync.get('enabled', (items) => {
            if (items.enabled !== false) { // 默认启用，只有明确设置为false才禁用
                console.log('开始检测B站私信...');
                checkBiliMessages();
            } else {
                console.log('插件已禁用，跳过检测。');
            }
        });
    }
});

// 辅助函数：发送浏览器通知
async function sendNotification(message, type = 'success', duration = 3000, notificationId = null) {
    console.log(`[Notification] Attempting to send notification: ${message}, Type: ${type}, ID: ${notificationId}`);

    // Check notification permission status
    chrome.notifications.getPermissionLevel(function(level) {
        console.log(`[Notification] Current permission level: ${level}`);
        if (level === 'granted') {
            const options = {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('assets/icons/icon128.png'),
                title: 'Ding-Prize',
                message: message,
                priority: 2
            };

            if (notificationId) {
                console.log(`[Notification] Creating notification with specific ID: ${notificationId}`);
                chrome.notifications.create(notificationId, options, function(createdId) {
                    if (chrome.runtime.lastError) {
                        console.error(`[Notification] Error creating notification with ID ${notificationId}:`, chrome.runtime.lastError.message);
                    } else {
                        console.log(`[Notification] Notification created with ID: ${createdId}`);
                    }
                });
            } else {
                console.log(`[Notification] Creating notification with auto-generated ID.`);
                chrome.notifications.create(options, function(createdId) {
                    if (chrome.runtime.lastError) {
                        console.error(`[Notification] Error creating notification:`, chrome.runtime.lastError.message);
                    } else {
                        console.log(`[Notification] Notification created with ID: ${createdId}`);
                    }
                });
            }
        } else {
            console.warn(`[Notification] Notification permission not granted. Current level: ${level}. Cannot send notification: ${message}`);
        }
    });
}

async function checkBiliMessages() {
    await loadBlockedUids(); // Load blocked UIDs before checking messages
    console.log('开始检测B站私信...');
    const checkingNotificationId = 'bili-checking-notification'; // 定义一个唯一的通知ID
    sendNotification('正在检测中...', 'info', 0, checkingNotificationId); // 发送“正在检测中...”通知，不自动隐藏
    chrome.runtime.sendMessage({ type: "updateProgress", status: "started", message: "正在初始化检测..." });

    // 向 popup.js 发送消息，显示内部通知
    chrome.runtime.sendMessage({ type: "showNotification", message: "正在检测中...", notificationType: "success" });

    let newPrizeFound = false;
    let prizeMessages = await getPrizeMessages();
    let lastCheckTime = await getSetting('lastCheckTime', 0);

    const settings = await new Promise(resolve => {
        chrome.storage.sync.get(['enabled', 'checkInterval', 'prizeKeywords', 'lastCheckedTime', 'blacklistKeywords'], (syncItems) => {
            chrome.storage.sync.get(['processedMessages'], (syncProcessedItems) => { // 从 sync 获取 processedMessages
                chrome.storage.local.get(['prizeMessages'], (localPrizeItems) => { // prizeMessages 仍在 local
                    resolve({
                        enabled: syncItems.enabled !== undefined ? syncItems.enabled : DEFAULT_SETTINGS.enabled,
                        checkInterval: syncItems.checkInterval || DEFAULT_SETTINGS.checkInterval,
                        prizeKeywords: syncItems.prizeKeywords !== undefined ? syncItems.prizeKeywords : DEFAULT_SETTINGS.prizeKeywords.join('\n'),
                        lastCheckedTime: syncItems.lastCheckedTime || DEFAULT_SETTINGS.lastCheckedTime,
                        processedMessages: syncProcessedItems.processedMessages || [], // 从 syncProcessedItems 获取
                        prizeMessages: localPrizeItems.prizeMessages || [], // 从 localPrizeItems 获取
                        blacklistKeywords: syncItems.blacklistKeywords !== undefined ? syncItems.blacklistKeywords : DEFAULT_SETTINGS.blacklistKeywords // 获取黑名单关键词
                    });
                });
            });
        });
    });

    let currentPrizeKeywords = [];
    if (settings.prizeKeywords) {
        currentPrizeKeywords = settings.prizeKeywords.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    }
    console.log('[Background] Current Prize Keywords:', currentPrizeKeywords);

    let currentBlacklistKeywords = settings.blacklistKeywords;
    if (typeof currentBlacklistKeywords === 'string') {
        currentBlacklistKeywords = currentBlacklistKeywords.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    }
    console.log('[Background] Current Blacklist Keywords:', currentBlacklistKeywords);

    // 1. 获取会话列表
    chrome.runtime.sendMessage({ type: "updateProgress", status: "started", message: "正在获取会话列表..." });
    const sessionTypes = [4, 1, 9]; // 对应私信、系统通知等
    let allSessions = [];

    const sessionPromises = sessionTypes.map(async (type) => {
        try {
            // console.log(`Fetching session list for type ${type} from: https://api.vc.bilibili.com/session_svr/v1/session_svr/get_sessions?session_type=${type}`);
            const response = await fetch(`https://api.vc.bilibili.com/session_svr/v1/session_svr/get_sessions?session_type=${type}`,
                {
                    credentials: 'include'
                });
            if (!response.ok) {
                console.error(`获取会话列表失败：HTTP 错误！状态码: ${response.status}, 状态文本: ${response.statusText}，URL: ${response.url}`);
                chrome.runtime.sendMessage({ type: "updateProgress", status: `获取会话列表失败: HTTP ${response.status}` });
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // console.log(`Response for session type ${type}:`, data);
            if (data.code === 0 && data.data && data.data.session_list) {
                return data.data.session_list;
            } else if (data.code === -101) {
                console.warn('B站登录状态失效，请重新登录。');
                sendNotification('Ding-Prize', 'B站登录状态失效，请重新登录！');
                chrome.runtime.sendMessage({ type: "updateProgress", status: "error", message: "B站登录状态失效，请重新登录！" });
                return []; // 登录失效，返回空数组
            } else {
                console.error(`获取会话列表失败，类型 ${type}:`, data.message);
                sendNotification('Ding-Prize', `获取会话列表失败: ${data.message}`);
                chrome.runtime.sendMessage({ type: "updateProgress", status: "error", message: `获取会话列表失败: ${data.message}` });
                return [];
            }
        } catch (error) {
            console.error(`获取会话列表时发生错误，类型 ${type}:`, error.name, error.message, error.stack);
            chrome.runtime.sendMessage({ type: "updateProgress", status: "error", message: `获取会话列表时发生错误: ${error.message}` });
            return [];
        }
    });

    const results = await Promise.all(sessionPromises);
    allSessions = results.flat(); // 合并所有会话列表

    chrome.runtime.sendMessage({ type: "updateProgress", status: "in_progress", message: `已获取 ${allSessions.length} 个会话，开始检测消息...` });

    let newPrizeMessages = [];

    for (const session of allSessions) {
        // 检查发送者 UID 是否被屏蔽
        if (blockedUids.includes(String(session.talker_id))) {
            console.log(`[Background] Skipping messages from blocked UID: ${session.talker_id}`);
            continue; // 跳过此会话
        }

        // 过滤掉非重点监控的发送者类型
        if (!isPrizeSenderType(session.session_type)) {
            continue;
        }
        chrome.runtime.sendMessage({ type: "updateProgress", status: `检测会话: ${session.talker_name}` });
        try {
            const msgResponse = await fetch(`https://api.vc.bilibili.com/svr_sync/v1/svr_sync/fetch_session_msgs?talker_id=${session.talker_id}&session_type=${session.session_type}&size=50`,
                {
                    credentials: 'include'
                });
            if (!msgResponse.ok) {
                console.error(`获取会话消息失败：HTTP 错误！状态码: ${msgResponse.status}, 状态文本: ${msgResponse.statusText}，URL: ${msgResponse.url}`);
                chrome.runtime.sendMessage({ type: "updateProgress", status: `获取会话消息失败: HTTP ${msgResponse.status}` });
                throw new Error(`HTTP error! status: ${msgResponse.status}`);
            }
            const msgData = await msgResponse.json();

            if (msgData.code === 0 && msgData.data && msgData.data.messages) {
                for (const message of msgData.data.messages) {
                    let uniqueMessageId;
                    let parsedContent;

                    try {
                        parsedContent = JSON.parse(message.content);
                        if (parsedContent.id) {
                            uniqueMessageId = parsedContent.id;
                        } else {
                            // If no 'id' field in parsed content, use the full content as a fallback unique ID
                            uniqueMessageId = message.content;
                        }
                    } catch (e) {
                        // If message.content is not JSON, use the full content as unique ID
                        uniqueMessageId = message.content;
                    }

                    // 检查消息是否已处理
                    if (settings.processedMessages.includes(uniqueMessageId)) {
                        console.log(`[Background] Message with ID "${uniqueMessageId}" already processed. Skipping.`);
                        continue;
                    }

                    // console.log(`Checking message content: "${message.content}" with keywords: ${currentPrizeKeywords.join(', ')}`);
                    // 检查消息内容是否包含中奖关键词
                    if (containsPrizeKeywords(message.content, currentPrizeKeywords, currentBlacklistKeywords)) {
                        console.log(`[Background] 发现潜在中奖消息，内容: ${message.content.substring(0, 100)}...`);
                        console.log(`[Background] 原始 message.content 完整内容:`, message.content);
                        // let parsedContent; // This was declared earlier, no need to redeclare
                        let extractedTitle = parsedContent.title || parsedContent.item_text || parsedContent.content || message.content;
                        const originalRawContent = message.content; // Store the original raw content
                        let thumb = '';

                        // Re-parse content here if it was not parsed before, or if we need the parsedContent object for title extraction
                        // Ensure parsedContent is available for title extraction logic
                        try {
                            if (!parsedContent) { // Only parse if not already parsed for uniqueMessageId
                                parsedContent = JSON.parse(message.content);
                            }
                            console.log(`[Background] 消息内容成功解析为JSON:`, parsedContent);

                            // Prioritize item_text, then text, then content field within JSON
                            if (parsedContent.item_text) {
                                extractedTitle = parsedContent.item_text;
                            } else if (parsedContent.text) {
                                extractedTitle = parsedContent.text;
                            } else if (parsedContent.content) {
                                // Check if parsedContent.content is itself a JSON string
                                try {
                                    const innerParsedContent = JSON.parse(parsedContent.content);
                                    if (innerParsedContent.content) {
                                        extractedTitle = innerParsedContent.content;
                                    } else {
                                        extractedTitle = parsedContent.content;
                                    }
                                } catch (innerE) {
                                    extractedTitle = parsedContent.content;
                                }
                            }

                            thumb = parsedContent.thumb || '';

                        } catch (e) {
                            console.warn(`[Background] 消息内容解析为JSON失败，使用原始内容。错误: ${e.message}`, message.content);
                            // If not JSON, treat message.content as both title and rawContent
                            extractedTitle = message.content;
                        }

                        // Clean up title (remove "content:" prefix and surrounding quotes if any)
                        extractedTitle = extractedTitle.replace(/^content: "?/, '').replace(/"?$/, '');

                        console.log(`[Background] extractedTitle:`, extractedTitle);
                        console.log(`[Background] extractedRawContent:`, originalRawContent); // Use the stored original raw content
                        console.log(`[Background] 正在构建 prizeInfo 对象...`);
                         const prizeInfo = {
                             id: message.msg_id ? String(message.msg_id) : (Date.now().toString() + Math.random().toString(36).substring(2, 15)), // 优先使用 Bilibili 消息的 msg_id 作为唯一ID，否则生成一个唯一ID
                             title: extractedTitle,
                             uid: session.talker_id,
                             senderUid: session.talker_id, // 暂时保留，后续会删除
                             senderName: session.talker_name || '未知发送者',
                             messageContent: originalRawContent, // Use the stored original raw content
                             thumb: thumb, // Use the extracted thumb
                             timestamp: message.timestamp * 1000 || Date.now(), // Use message's timestamp or current time
                             rawContent: originalRawContent // Store the refined raw content
                         };
                         newPrizeMessages.push(prizeInfo);
                        console.log(`[Background] 已识别中奖消息并添加到 newPrizeMessages:`, prizeInfo);
                        settings.processedMessages.push(prizeInfo.id); // 使用 prizeInfo.id 作为唯一ID
                        newPrizeFound = true; // 标记发现新的中奖消息
                    } else if (currentBlacklistKeywords.some(blackword => message.content.includes(blackword))) {
                        console.log(`[Background] 消息被黑名单关键词过滤: ${message.content.substring(0, 50)}...`);
                        console.log('[Background] Message content:', message.content);
                    }
                }
            } else {
                console.error(`获取会话消息失败，会话ID ${session.talker_id}:`, msgData.message);
                sendNotification('Ding-Prize', `获取会话消息失败: ${msgData.message}`);
                chrome.runtime.sendMessage({ type: "updateProgress", status: "error", message: `获取会话消息失败: ${msgData.message}` });
            }
        } catch (error) {
            console.error(`获取会话消息时发生错误，会话ID ${session.talker_id}:`, error.name, error.message, error.stack);
            sendNotification('Ding-Prize', `获取会话消息时发生错误: ${error.message}`);
            chrome.runtime.sendMessage({ type: "updateProgress", status: "error", message: `获取会话消息时发生错误: ${error.message}` });
        }
        chrome.runtime.sendMessage({ type: "updateProgress", status: "in_progress", message: `已检测会话: ${session.talker_name}` });
    }

    console.log(`[Background] 所有会话检测完毕。`);
    // 更新上次检测时间
    const now = Date.now();
    chrome.storage.sync.set({
        lastCheckedTime: now,
    });
    console.log(`[Background] 更新 lastCheckedTime 为: ${new Date(now).toLocaleString()}`);

    // 对 newPrizeMessages 内部进行去重
    const uniqueNewMessagesInternal = [];
    const seenMessages = new Set();

    newPrizeMessages.forEach(msg => {
        const identifier = `${msg.title}-${msg.messageContent}-${msg.timestamp}`;
        if (!seenMessages.has(identifier)) {
            uniqueNewMessagesInternal.push(msg);
            seenMessages.add(identifier);
        }
    });
    newPrizeMessages = uniqueNewMessagesInternal;
    console.log(`[Background] newPrizeMessages 内部去重后数量: ${newPrizeMessages.length}`);

    // 合并新发现的中奖消息与已有的中奖消息
    let existingPrizeMessages = settings.prizeMessages;
    console.log(`[Background] 现有中奖消息数量: ${existingPrizeMessages.length}`);
    const uniqueNewPrizeMessages = newPrizeMessages.filter(newMsg => {
        // 检查新消息是否已存在于现有消息中 (通过 title, messageContent 和 timestamp 判断唯一性)
        const isDuplicate = existingPrizeMessages.some(existingMsg =>
            existingMsg.title === newMsg.title &&
            existingMsg.messageContent === newMsg.messageContent &&
            existingMsg.timestamp === newMsg.timestamp
        );
        if (isDuplicate) {
            console.log(`[Background] 发现重复消息，跳过添加: ${newMsg.title} (内容: ${newMsg.messageContent.substring(0, 20)}..., 时间: ${new Date(newMsg.timestamp).toLocaleString()})`);
        }
        return !isDuplicate;
    });
    console.log(`[Background] 发现 ${uniqueNewPrizeMessages.length} 条唯一新中奖消息。`);

    const mergedPrizeMessages = [...existingPrizeMessages, ...uniqueNewPrizeMessages];
    console.log(`[Background] 合并后中奖消息总数: ${mergedPrizeMessages.length}`);

    // 存储更新后的 processedMessages 和 prizeMessages
    chrome.storage.sync.set({ processedMessages: settings.processedMessages, lastCheckedTime: Date.now() }, () => {
        chrome.storage.local.set({ prizeMessages: mergedPrizeMessages }, () => {
            console.log(`[Background] 已将 processedMessages 存储到 sync storage，prizeMessages 存储到 local storage。`);
            chrome.runtime.sendMessage({ type: "updateProgress", status: "completed", message: "检测完成。" });
            chrome.runtime.sendMessage({ type: "hideNotification" }); // 隐藏 popup 内部通知
            chrome.notifications.clear(checkingNotificationId, (wasCleared) => {
                if (chrome.runtime.lastError) {
                    console.error(`[Notification] Error clearing notification:`, chrome.runtime.lastError.message);
                } else if (!wasCleared) {
                    console.log(`[Notification] '${checkingNotificationId}' notification was not found or could not be cleared.`);
                }
            });
            // 如果有新的唯一中奖消息，发送通知
            uniqueNewPrizeMessages.forEach(prize => {
                sendNotification(`恭喜您中奖啦！奖品：${prize.title}`, 'success');
            });
        });
    });

    // 隐藏“正在检测中...”通知
    chrome.runtime.sendMessage({ type: "hideNotification" });
    chrome.runtime.sendMessage({ type: "updateProgress", status: "completed", message: "检测完成", newPrizeFound: newPrizeFound });
    console.log(`[Background] 发送检测完成通知。`);
    // 检测完成后，将 isChecking 状态设置为 false
    chrome.storage.sync.set({ isChecking: false }, () => {
        console.log(`[Background] isChecking 状态已设置为 false。`);
        // 清除“正在检测中...”的通知
        chrome.notifications.clear(checkingNotificationId, function(wasCleared) {
            if (wasCleared) {
                console.log(`[Notification] '${checkingNotificationId}' notification cleared.`);
            } else {
                console.log(`[Notification] '${checkingNotificationId}' notification was not found or could not be cleared.`);
            }
        });
    });
}

// 辅助函数：获取已保存的中奖消息
async function getPrizeMessages() {
    return new Promise(resolve => {
        chrome.storage.local.get(['prizeMessages'], (result) => {
            resolve(result.prizeMessages || []);
        });
    });
}

// 辅助函数：获取设置
async function getSetting(key, defaultValue) {
    return new Promise(resolve => {
        chrome.storage.sync.get([key], (result) => {
            resolve(result[key] !== undefined ? result[key] : defaultValue);
        });
    });
}

// 辅助函数：检查消息是否包含中奖关键词
function containsPrizeKeywords(messageContent, keywords, blacklistKeywords) {
    console.log('[containsPrizeKeywords] Checking message:', messageContent.substring(0, 50), '...');
    console.log('[containsPrizeKeywords] Prize keywords:', keywords);
    console.log('[containsPrizeKeywords] Blacklist keywords:', blacklistKeywords);
    // 先检查黑名单
    if (blacklistKeywords.some(blackword => messageContent.includes(blackword))) {
        console.log('[containsPrizeKeywords] Message blacklisted by:', blacklistKeywords.find(blackword => messageContent.includes(blackword)));
        return false;
    }
    // 再检查中奖关键词
    if (keywords.some(keyword => messageContent.includes(keyword))) {
        console.log('[containsPrizeKeywords] Message contains prize keyword:', keywords.find(keyword => messageContent.includes(keyword)));
        return true; // 表示异步响应
    }
    return false;
}

// 辅助函数：检查发送者类型是否为重点监控类型
function isPrizeSenderType(senderType) {
    return PRIZE_SENDER_TYPES.includes(senderType);
}

// 监听来自其他脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_PRIZE_KEYWORDS") {
        chrome.storage.sync.get('prizeKeywords', (items) => {
            const customKeywords = items.prizeKeywords ? items.prizeKeywords.split('\n').map(s => s.trim()).filter(s => s.length > 0) : [];
            sendResponse({ keywords: [...new Set([...PRIZE_KEYWORDS, ...customKeywords])] });
        });
        return true; // 表示异步响应
    } else if (request.action === "checkMessagesNow") {
        chrome.storage.sync.get('enabled', (items) => {
            if (items.enabled !== false) {
                console.log('手动触发B站私信检测...');
                // 在手动触发检测前，先将 isChecking 状态设置为 true
                chrome.storage.sync.set({ isChecking: true }, () => {
                    checkBiliMessages().finally(() => {
                        // 确保在检测完成后（无论成功或失败）都将 isChecking 设置为 false
                        chrome.storage.sync.set({ isChecking: false });
                    });
                    sendResponse({ status: "started" });
                });
            } else {
                console.log('插件已禁用，无法手动触发检测。');
                sendResponse({ status: "disabled" });
            }
        });
        return true; // 表示异步响应
    } else if (request.action === "deletePrizeMessages") {
        console.log('[Background] Received deletePrizeMessages request:', request.messageIds); // Add this line
        chrome.storage.local.get(['prizeMessages'], (result) => {
            let prizeMessages = result.prizeMessages || [];
            const initialLength = prizeMessages.length;

            console.log('[Background] prizeMessages before filter:', prizeMessages.map(msg => ({ id: msg.id, type: typeof msg.id })));
            console.log('[Background] request.messageIds:', request.messageIds, 'type of first element:', typeof request.messageIds[0]);

            // 获取 processedMessages
            chrome.storage.sync.get(['processedMessages'], (syncResult) => {
                let processedMessages = syncResult.processedMessages || [];
                console.log('[Background] processedMessages before deletion:', processedMessages);

                // 过滤掉已删除的消息
                prizeMessages = prizeMessages.filter(msg => !request.messageIds.includes(msg.id));

                // 从 processedMessages 中移除对应的 ID
                processedMessages = processedMessages.filter(id => !request.messageIds.includes(id));
                console.log('[Background] processedMessages after deletion:', processedMessages);

                chrome.storage.local.set({ prizeMessages }, () => {
                    console.log('[Background] Updated prizeMessages in local storage. New length:', prizeMessages.length);
                    // 将更新后的 processedMessages 保存回 sync storage
                    chrome.storage.sync.set({ processedMessages }, () => {
                        console.log('[Background] Updated processedMessages in sync storage.');
                        // 在所有存储操作完成后，发送响应并通知 prize_results.js 刷新页面
                        sendResponse({ status: "success", message: "Prize messages deleted successfully." });
                        chrome.runtime.sendMessage({ type: "refreshPrizeResults" });
                    });
                });
            });
        });
        return true; // Indicates that sendResponse will be called asynchronously
    } else if (request.action === "clearAllData") {
        chrome.storage.sync.set({ enabled: false });
        chrome.runtime.sendMessage({ type: "updateProgress", status: "disabled", message: "插件已禁用。" });
        chrome.runtime.sendMessage({ type: "hideNotification" });
        return true; // Indicates that sendResponse will be called asynchronously
    } else {
        chrome.runtime.sendMessage({ type: "hideNotification" });
        chrome.runtime.sendMessage({ type: "updateProgress", status: "disabled", message: "插件已禁用。" });
        chrome.runtime.sendMessage({ type: "hideNotification" });
        return true; // Indicates that sendResponse will be called asynchronously
    }
});