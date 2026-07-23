// background.js for Chaoxing Course Helper

const MORNING_ALARM_NAME = 'cx-daily-morning-broadcast';
const MORNING_DEFAULTS = {
  morningBroadcastEnabled: false,
  morningBroadcastTime: '08:00',
  morningBroadcastMessage: '早上好，学习任务开始啦！'
};

function parseTimeToHourMinute(timeString) {
  const matched = /^(\d{1,2}):(\d{2})$/.exec((timeString || '').trim());
  if (!matched) return null;
  const hour = Number(matched[1]);
  const minute = Number(matched[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function buildNextTriggerTime(timeString) {
  const hm = parseTimeToHourMinute(timeString);
  if (!hm) return null;
  const now = new Date();
  const next = new Date();
  next.setHours(hm.hour, hm.minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

function safeCreateNotification(message) {
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '学习通网课助手',
      message: message || MORNING_DEFAULTS.morningBroadcastMessage,
      priority: 2
    });
  } catch (e) {
    console.warn('[Morning Broadcast] Notification create failed:', e);
  }
}

function safeSpeak(message) {
  try {
    chrome.tts.speak(message || MORNING_DEFAULTS.morningBroadcastMessage, {
      lang: 'zh-CN',
      rate: 1,
      pitch: 1,
      volume: 1
    });
  } catch (e) {
    console.warn('[Morning Broadcast] TTS speak failed:', e);
  }
}

async function scheduleMorningBroadcast() {
  const cfg = await chrome.storage.local.get(MORNING_DEFAULTS);
  await chrome.alarms.clear(MORNING_ALARM_NAME);
  if (!cfg.morningBroadcastEnabled) return;

  const when = buildNextTriggerTime(cfg.morningBroadcastTime);
  if (!when) {
    console.warn('[Morning Broadcast] Invalid time config:', cfg.morningBroadcastTime);
    return;
  }

  chrome.alarms.create(MORNING_ALARM_NAME, { when });
  console.log('[Morning Broadcast] Scheduled at', new Date(when).toString());
}

async function triggerMorningBroadcast() {
  const cfg = await chrome.storage.local.get(MORNING_DEFAULTS);
  if (!cfg.morningBroadcastEnabled) return;

  const message = (cfg.morningBroadcastMessage || '').trim() || MORNING_DEFAULTS.morningBroadcastMessage;
  safeCreateNotification(message);
  safeSpeak(message);
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm && alarm.name === MORNING_ALARM_NAME) {
    await triggerMorningBroadcast();
    await scheduleMorningBroadcast();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  scheduleMorningBroadcast().catch((err) => {
    console.error('[Morning Broadcast] onInstalled schedule failed:', err);
  });
});

chrome.runtime.onStartup.addListener(() => {
  scheduleMorningBroadcast().catch((err) => {
    console.error('[Morning Broadcast] onStartup schedule failed:', err);
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  if (changes.morningBroadcastEnabled || changes.morningBroadcastTime || changes.morningBroadcastMessage) {
    scheduleMorningBroadcast().catch((err) => {
      console.error('[Morning Broadcast] storage change schedule failed:', err);
    });
  }
});

scheduleMorningBroadcast().catch((err) => {
  console.error('[Morning Broadcast] initial schedule failed:', err);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TAB_ID') {
    sendResponse({ tabId: sender.tab ? sender.tab.id : 'unknown' });
    return true;
  }

  if (message.type === 'QUERY_API') {
    const { url, method, headers, body } = message.payload;

    const fetchOptions = {
      method: method || 'GET',
      headers: headers || {}
    };

    if (method === 'POST' && body) {
      fetchOptions.body = typeof body === 'object' ? JSON.stringify(body) : body;
      if (!fetchOptions.headers['Content-Type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
    }

    console.log(`[Background Proxy] Requesting API: ${url} with method ${method}`);

    fetch(url, fetchOptions)
      .then(async response => {
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = text;
        }

        if (!response.ok) {
          sendResponse({ 
            success: false, 
            error: `HTTP ${response.status}: ${typeof data === 'object' ? JSON.stringify(data) : data}` 
          });
        } else {
          sendResponse({ success: true, data: data });
        }
      })
      .catch(error => {
        console.error('[Background Proxy] Fetch Error:', error);
        sendResponse({ success: false, error: error.message || 'Network request failed' });
      });

    return true; // Keeps the message channel open for async response
  }
});
