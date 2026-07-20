// content.js - Injected into all frames of Chaoxing learning pages

let settings = {};
let isTopWindow = (window === window.top);
let widgetLogs = [];
let originalPageTitle = document.title || '超星学习通';

// Dynamic Tab Title Status Indicator & Pill Status Helper
function reportProgress(statusText) {
  if (isTopWindow) {
    updateTabStatus(statusText);
  } else {
    window.top.postMessage({ type: 'CX_UPDATE_STATUS', status: statusText }, '*');
  }
}

function updateTabStatus(statusText) {
  if (!isTopWindow) return;
  // Update browser tab title so user has 100% safety & awareness when in background/minimized
  const cleanTitle = originalPageTitle.replace(/^\[.*?\]\s*/, '');
  document.title = `[🟢 ${statusText}] ${cleanTitle}`;
  
  // Update minimized floating badge text if present
  const badge = document.getElementById('cx-min-status-text');
  if (badge) badge.textContent = statusText;
}

// Logger utility helper
function sendLog(text, level = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const entry = `[${timestamp}] ${text}`;
  
  if (isTopWindow) {
    appendLog(entry, level);
  } else {
    // Send to top frame
    window.top.postMessage({
      type: 'CX_HELPER_LOG',
      text: entry,
      level: level
    }, '*');
  }
}

// Inject the page-context finish hook script (bypasses CSP by using script.src, not inline)
function injectFinishHook() {
  if (document.getElementById('cx-helper-finish-hook')) return;
  try {
    const script = document.createElement('script');
    script.id = 'cx-helper-finish-hook';
    script.src = chrome.runtime.getURL('content/finish_hook.js');
    (document.head || document.documentElement).appendChild(script);
  } catch (err) {
    // Silently fail if injection is not possible in this context
  }
}

// Notify top window that a task is finished
function notifyTaskCompleted() {
  // Trigger platform native completion hooks via postMessage -> finish_hook.js
  // (finish_hook.js runs in page context and has access to finishJob/greenligth)
  try {
    window.postMessage({ type: 'CX_TRIGGER_FINISH_JOB' }, '*');
  } catch (err) {}

  if (isTopWindow) {
    handleTaskCompletion();
  } else {
    window.top.postMessage({ type: 'CX_TASK_COMPLETED' }, '*');
  }
}

// 1. Initializer
chrome.storage.local.get({
  videoSpeed: '2.0',
  videoMute: true,
  videoLoop: false,
  quizEnable: true,
  apiProvider: 'deepseek',
  modelName: 'deepseek-chat',
  apiUrl: 'https://api.deepseek.com/chat/completions',
  apiKey: '',
  apiMethod: 'POST',
  apiBody: '{\n  "model": "deepseek-chat",\n  "messages": [\n    {"role": "user", "content": "{question}"}\n  ],\n  "temperature": 0.1\n}',
  apiPath: 'choices[0].message.content',
  quizSubmitMode: 'fill',
  autoNext: true,
  autoBatchHomework: false,
  actionDelay: 3,
  widgetMinimized: false,
  widgetPosTop: '24px',
  widgetPosLeft: '',
  engineRunning: true
}, (res) => {
  settings = res;
  
  // Only create widget in top window
  if (isTopWindow) {
    createWidget();
    sendLog('学习通助手已启动，正在后台安全护航...', 'success');
    reportProgress('全速运转中');
    
    // Listen for messages from sub-frames
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'CX_HELPER_LOG') {
        appendLog(e.data.text, e.data.level);
      }
      if (e.data && e.data.type === 'CX_TASK_COMPLETED') {
        handleTaskCompletion();
      }
      if (e.data && e.data.type === 'CX_UPDATE_STATUS') {
        updateTabStatus(e.data.status);
      }
      if (e.data && e.data.type === 'CX_SCROLL_PARENT') {
        const scrollStep = e.data.scrollStep || 300;
        const parentViewer = findScrollableContainer();
        if (parentViewer === document.documentElement || parentViewer === document.body) {
          window.scrollBy(0, scrollStep);
        } else {
          parentViewer.scrollTop += scrollStep;
        }
        // Also scroll same-origin sub-iframes to sync up viewports
        try {
          const iframes = document.querySelectorAll('iframe');
          for (const iframe of iframes) {
            try {
              const subDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
              if (subDoc) {
                subDoc.documentElement.scrollTop += scrollStep;
                subDoc.body.scrollTop += scrollStep;
                const viewer = subDoc.querySelector('#viewerContainer, .imglook, #img, .scroll-container, .pdf-viewer');
                if (viewer) {
                  viewer.scrollTop += scrollStep;
                  viewer.dispatchEvent(new Event('scroll', { bubbles: true }));
                }
              }
            } catch (err) {}
          }
        } catch (err) {}
      }
      if (e.data && e.data.type === 'CX_HOMEWORK_BATCH_RETURN') {
        sendLog('🔄 [连续刷作业模式] 收到作业完成信号，正在返回/刷新列表以继续下一次做题...', 'info');
        reportProgress('连续做题回跳中');
        const backLink = document.querySelector('a:contains("返回"), .btn-back, a[href*="getAllWork"], a[href*="work/list"], .backBtn');
        if (backLink) backLink.click();
        else if (window.history.length > 1) window.history.back();
        else window.location.reload();
      }
    });
  }

  // Inject page-context completion hook in every frame (uses script.src to bypass CSP)
  injectFinishHook();

  // Every frame checks for task elements (Video, Quizzes, PPT/PDF)
  runTaskScanner();
  setInterval(runTaskScanner, 2500);
});

// Listen for settings changes in real-time
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    for (const key in changes) {
      if (changes[key].newValue !== undefined) {
        settings[key] = changes[key].newValue;
      }
    }
  }
});

// Ensure the widget stays within the visible viewport (prevents losing it off-screen)
function ensureWidgetInViewport(widget) {
  requestAnimationFrame(() => {
    const rect = widget.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // If the widget is off the right edge, bring it back
    if (rect.right > vw) {
      widget.style.left = Math.max(0, vw - rect.width - 8) + 'px';
      widget.style.right = 'auto';
    }
    // If it's off the left edge
    if (rect.left < 0) {
      widget.style.left = '8px';
      widget.style.right = 'auto';
    }
    // If it's off the bottom
    if (rect.top > vh - 30) {
      widget.style.top = Math.max(0, vh - rect.height - 8) + 'px';
    }
    // If it's off the top
    if (rect.top < 0) {
      widget.style.top = '8px';
    }
  });
}

// Show a small floating green restore bubble after the widget is closed
function showRestoreBubble(widgetToRestore) {