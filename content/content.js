// content.js - Injected into all frames of Chaoxing learning pages
console.log(`🚀 [学习通助手] content.js 已成功注入网页框架! Current URL: ${window.location.href}, isTopWindow: ${window === window.top}`);

window._cx_extension_active = true;
try {
  if (window.frameElement) {
    window.frameElement._cx_child_active = true;
  }
} catch (e) {}

let settings = {};
let isTopWindow = (window === window.top);
let widgetLogs = [];
let originalPageTitle = document.title || '超星学习通';

const frameId = Math.random().toString(36).substring(2);
let tabId = 'unknown';

function getUnfinishedJobs(rootDoc = document, getAll = false) {
  let jobs = [];
  
  // Mature Framework Approach: DOM scanning is the most reliable because the DOM updates dynamically 
  // when jobs are completed (attachments injected on page load do not).
  try {
    let selector = '.ans-job-icon, .ans-job-icon-waiting, [class*="ans-job-icon"]';
    jobs = Array.from(rootDoc.querySelectorAll(selector));

    // Recursively search same-origin iframes
    const iframes = rootDoc.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const subDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        if (subDoc) {
          jobs = jobs.concat(getUnfinishedJobs(subDoc, getAll));
        }
      } catch (e) {}
    }
  } catch (e) {}

  if (getAll) {
    return jobs;
  }
  
  // Filter out the finished ones. Chaoxing uses various classes for finished state.
  return jobs.filter(job => {
      const className = (job.className || '').toLowerCase();
      const isFinished = className.includes('finished') || 
                         className.includes('finish') || 
                         className.includes('green') ||
                         className.includes('success');
      return !isFinished;
  });
}

function findJobIconForFrame(frameEl) {
  if (!frameEl) return null;
  try {
    // 1. Chaoxing native format (div.ans-attach-ct -> iframe)
    const attachCt = frameEl.closest('.ans-attach-ct');
    if (attachCt && attachCt.parentElement) {
      const icon = attachCt.parentElement.querySelector('.ans-job-icon');
      if (icon) return icon;
    }
    
    // 2. Mock page format (div.card-container -> iframe)
    const cardCt = frameEl.closest('.card-container');
    if (cardCt) {
      const icon = cardCt.querySelector('.ans-job-icon');
      if (icon) return icon;
    }

    // 3. Fallback: tight proximity search, stop at body
    let current = frameEl;
    let distance = 0;
    while (current && current.tagName !== 'BODY' && current.tagName !== 'HTML' && distance < 4) {
      const parent = current.parentElement;
      if (!parent || parent.tagName === 'BODY') break;
      
      const siblingIcon = parent.querySelector('.ans-job-icon');
      if (siblingIcon && parent.querySelectorAll('iframe').length === 1) {
        return siblingIcon;
      }
      current = parent;
      distance++;
    }
  } catch (e) {}
  return null;
}

function isCurrentJobCompleted() {
  // Mature Framework Approach: Check synced attachments from parent
  if (window._cx_parent_attachments && Array.isArray(window._cx_parent_attachments)) {
    try {
      const url = window.location.href;
      const objectIdMatch = url.match(/objectid=([^&]+)/i);
      const jobIdMatch = url.match(/jobid=([^&]+)/i);
      
      for (const att of window._cx_parent_attachments) {
        if (!att.job) continue;
        
        const attObjectId = att.property ? att.property.objectid : att.objectId;
        const attJobId = att.jobid || (att.property ? att.property.jobid : null);
        
        if ((objectIdMatch && objectIdMatch[1] === attObjectId) || 
            (jobIdMatch && jobIdMatch[1] === attJobId)) {
          if (att.isPassed) return true;
        }
      }
    } catch(e) {}
  }

  try {
    // 1. Same-origin frame check
    if (window.frameElement) {
      const jobIcon = findJobIconForFrame(window.frameElement);
      if (jobIcon && (jobIcon.classList.contains('ans-job-icon-finished') || jobIcon.textContent.includes('任务已完成') || jobIcon.classList.contains('ans-job-icon-green'))) {
        return true;
      }
    }
  } catch (e) {}

  try {
    // 2. Check if the parent of our parent frame has it (for doubly-nested frames like video inside card)
    if (window.parent && window.parent !== window) {
      const parentDoc = window.parent.document;
      const iframes = parentDoc.querySelectorAll('iframe');
      for (const iframe of iframes) {
        try {
          if (iframe.contentWindow === window) {
            const jobIcon = findJobIconForFrame(iframe);
            if (jobIcon && (jobIcon.classList.contains('ans-job-icon-finished') || jobIcon.textContent.includes('任务已完成') || jobIcon.classList.contains('ans-job-icon-green'))) {
              return true;
            }
          }
        } catch (e) {}
      }
    }
  } catch (e) {}

  return false;
}


// Dynamic Tab Title Status Indicator & Pill Status Helper
function reportProgress(statusText) {
  console.log(`[学习通助手 Progress] ${statusText}`);
  if (isTopWindow) {
    updateTabStatus(statusText);
  } else {
    window.top.postMessage({ type: 'CX_UPDATE_STATUS', status: statusText }, '*');
  }

  // Store progress in storage for popup dashboard
  try {
    chrome.storage.local.set({ currentProgress: statusText });
  } catch (err) {}
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
  console.log(`[学习通助手 Log - ${level.toUpperCase()}] ${text}`);
  
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

  // Synchronize with chrome.storage.local for popup dashboard
  try {
    chrome.storage.local.get({ recentLogs: [] }, (data) => {
      let logs = data.recentLogs || [];
      logs.push({ text: entry, level: level });
      if (logs.length > 80) {
        logs.shift();
      }
      chrome.storage.local.set({ recentLogs: logs });
    });
  } catch (err) {}
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
  // We no longer trigger handleTaskCompletion() eagerly here.
  // The global runTaskScanner (running every 2.5s) will detect when unfinishedJobs === 0
  // and trigger handleTaskCompletion safely. This prevents premature jumping when multiple tasks exist.
  console.log(`[学习通助手 notifyTaskCompleted] 汇报单任务完成. isTopWindow: ${isTopWindow}, URL: ${window.location.href}`);
}

// 1. Initializer definition
// Auto-close annoying popups (like "Task finished, jump to next chapter?") that disrupt background execution
function closeAnnoyingPopups() {
  try {
    let searchRoot = document;
    try {
      if (window.top && window.top.document) {
        searchRoot = window.top.document;
      }
    } catch (e) {}

    // 1. Chaoxing ExtJS MessageBox (x-window)
    const extWindows = searchRoot.querySelectorAll('.x-window');
    for (const win of extWindows) {
      if (win.style.visibility !== 'hidden' && win.style.display !== 'none') {
        const text = win.innerText || '';
        if (text.includes('进入下一节') || text.includes('下一章') || text.includes('下一节') || text.includes('任务点已完成')) {
          const closeBtn = win.querySelector('.x-tool-close');
          const cancelBtn = Array.from(win.querySelectorAll('button')).find(b => (b.innerText || '').includes('取消'));
          if (closeBtn) triggerClick(closeBtn);
          else if (cancelBtn) triggerClick(cancelBtn);
          else win.style.display = 'none'; // force hide
          sendLog('已自动拦截并关闭系统跳转弹窗，脚本将继续挂机...', 'info');
        }
      }
    }

    // 2. layui-layer popups
    const layuiLayers = searchRoot.querySelectorAll('.layui-layer');
    for (const layer of layuiLayers) {
      if (layer.style.display !== 'none') {
        const text = layer.innerText || '';
        if (text.includes('进入下一节') || text.includes('下一章') || text.includes('下一节') || text.includes('任务点已完成')) {
           const closeBtn = layer.querySelector('.layui-layer-close') || layer.querySelector('.layui-layer-btn1'); // btn1 is usually cancel
           if (closeBtn) triggerClick(closeBtn);
           else layer.style.display = 'none';
           sendLog('已自动拦截并关闭系统跳转弹窗，脚本将继续挂机...', 'info');
        }
      }
    }
  } catch (e) {}
}

function runHelperInitialization() {
  if (isTopWindow) {
    clearQueue();
    setInterval(closeAnnoyingPopups, 2000); // 拦截系统干扰弹窗
  }

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
        if (e.data && e.data.type === 'CX_UPDATE_STATUS') {
          updateTabStatus(e.data.status);
        }
        if (e.data && e.data.type === 'CX_SYNC_ATTACHMENTS') {
          window._cx_parent_attachments = e.data.attachments;
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
                  const viewer = subDoc.querySelector('#viewerContainer, .imglook, #img, .scroll-container, .pdf-viewer, #pdf-viewer');
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
          
          let backLink = document.querySelector('.btn-back, a[href*="getAllWork"], a[href*="work/list"], .backBtn');
          if (!backLink) {
            const links = document.querySelectorAll('a');
            for (const a of links) {
              if (a.textContent.includes('返回')) {
                backLink = a;
                break;
              }
            }
          }
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
}

// Listen for settings changes in real-time
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    let broadcastNeeded = false;
    let broadcastData = {};

    for (const key in changes) {
      if (changes[key].newValue !== undefined) {
        settings[key] = changes[key].newValue;
      }
    }
    
    if (changes.videoSpeed) {
      broadcastData.speed = changes.videoSpeed.newValue;
      broadcastNeeded = true;
    }
    if (changes.videoMute) {
      broadcastData.mute = changes.videoMute.newValue;
      broadcastNeeded = true;
    }
    if (changes.engineRunning !== undefined) {
      broadcastData.engineRunning = changes.engineRunning.newValue;
      broadcastNeeded = true;
    }

    if (broadcastNeeded) {
      document.dispatchEvent(new CustomEvent('CX_SET_SETTINGS', { detail: broadcastData }));
    }

    // If engine is restarted from storage change
    if (changes.engineRunning && changes.engineRunning.newValue === true) {
      if (isTopWindow) {
        let widget = document.getElementById('cx-helper-widget');
        if (widget) {
          widget.style.display = '';
          const btnToggle = document.getElementById('cx-btn-toggle');
          if (btnToggle) {
            btnToggle.innerHTML = '<svg style="width:12px;height:12px;fill:currentColor;" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> 暂停引擎';
            btnToggle.className = 'cx-btn cx-btn-toggle';
          }
        }
      }
      runTaskScanner();
    }
  }
});

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CX_RESTORE_WIDGET') {
    if (isTopWindow) {
      // 1. Remove restore bubble if it exists
      const bubble = document.getElementById('cx-restore-bubble');
      if (bubble) bubble.remove();

      // 2. Locate or recreate the widget
      let widget = document.getElementById('cx-helper-widget');
      if (!widget) {
        createWidget();
        widget = document.getElementById('cx-helper-widget');
      }

      if (widget) {
        // 3. Reset display styles and minimized class
        widget.style.display = '';
        widget.classList.remove('minimized');
        
        // 4. Center or place the widget at a default safe position (top-left)
        widget.style.top = '24px';
        widget.style.left = '24px';
        widget.style.right = 'auto';

        // 5. Update engine status locally
        settings.engineRunning = true;
        
        // 6. Update elements inside the widget
        const btnMin = document.getElementById('cx-widget-minimize');
        if (btnMin) btnMin.innerText = '−';

        const btnToggle = document.getElementById('cx-btn-toggle');
        if (btnToggle) {
          btnToggle.innerHTML = '<svg style="width:12px;height:12px;fill:currentColor;" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> 暂停引擎';
          btnToggle.className = 'cx-btn cx-btn-toggle';
        }

        sendLog('✅ 收到面板恢复指令，控制台已置顶并启动！', 'success');
        reportProgress('全速运转中');
        runTaskScanner();
      }
    }
    if (sendResponse) sendResponse({ success: true });
  } else if (message.type === 'CX_SKIP_CHAPTER') {
    sendLog('⚡ [前台控制台] 接收指令：手动跨越至下一章节...', 'warn');
    reportProgress('手动跳过章节');
    clickNextSection();
    if (sendResponse) sendResponse({ success: true });
  }
  return true;
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
  if (document.getElementById('cx-restore-bubble')) return;

  const bubble = document.createElement('div');
  bubble.id = 'cx-restore-bubble';
  bubble.title = '点击恢复学习通助手面板';
  bubble.innerHTML = '🟢';
  Object.assign(bubble.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(13, 17, 23, 0.92)',
    border: '2px solid rgba(16, 185, 129, 0.6)',
    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.35)',
    cursor: 'pointer',
    zIndex: '999999998',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    userSelect: 'none'
  });

  bubble.addEventListener('mouseenter', () => {
    bubble.style.transform = 'scale(1.15)';
    bubble.style.boxShadow = '0 6px 28px rgba(16, 185, 129, 0.55)';
  });
  bubble.addEventListener('mouseleave', () => {
    bubble.style.transform = 'scale(1)';
    bubble.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.35)';
  });

  bubble.addEventListener('click', () => {
    bubble.remove();
    widgetToRestore.style.display = '';
    chrome.storage.local.set({ engineRunning: true });
    settings.engineRunning = true;

    // Reset the toggle button state
    const btnToggle = document.getElementById('cx-btn-toggle');
    if (btnToggle) {
      btnToggle.innerHTML = '<svg style="width:12px;height:12px;fill:currentColor;" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> 暂停引擎';
      btnToggle.className = 'cx-btn cx-btn-toggle';
    }

    sendLog('✅ 助手面板已恢复，引擎已重新启动！', 'success');
    reportProgress('全速运转中');
    runTaskScanner();
  });

  const mountContainer = document.body && document.body.tagName !== 'FRAMESET' ? document.body : document.documentElement;
  if (mountContainer) {
    mountContainer.appendChild(bubble);
  }
}

// 2. Widget UI (Only in Top Frame)
function createWidget() {
  if (document.getElementById('cx-helper-widget')) return;

  const widget = document.createElement('div');
  widget.id = 'cx-helper-widget';
  
  // Restore minimized state if previously saved
  let isMinimized = Boolean(settings.widgetMinimized);
  if (isMinimized) {
    widget.classList.add('minimized');
  }

  // Restore position if previously saved
  if (settings.widgetPosTop) widget.style.top = settings.widgetPosTop;
  if (settings.widgetPosLeft) {
    widget.style.left = settings.widgetPosLeft;
    widget.style.right = 'auto';
  }

  widget.innerHTML = `
    <div id="cx-helper-widget-header">
      <div class="cx-widget-title">
        <span class="cx-widget-logo-dot"></span>
        <span class="cx-widget-title-text">学习通 Pro 控制台</span>
        <span class="cx-min-status-badge" id="cx-min-status-text">全速运转中</span>
      </div>
      <div class="cx-header-actions">
        <span class="cx-widget-action" id="cx-widget-minimize" title="最小化/展开">${isMinimized ? '+' : '−'}</span>
        <span class="cx-widget-action" id="cx-widget-close" title="关闭面板">×</span>
      </div>
    </div>
    <div id="cx-helper-widget-body">
      <div class="cx-status-grid">
        <div class="cx-status-box">
          <span class="cx-status-label">倍速引擎</span>
          <span class="cx-status-value">${settings.videoSpeed}x</span>
        </div>
        <div class="cx-status-box">
          <span class="cx-status-label">下一节自动流</span>
          <span class="cx-status-value" style="color: ${settings.autoNext ? '#34D399' : '#F87171'}">${settings.autoNext ? '已开启' : '已停用'}</span>
        </div>
      </div>
      <div class="cx-log-container" id="cx-log-container"></div>
      <div class="cx-control-row">
        <button id="cx-btn-toggle" class="cx-btn cx-btn-toggle">
          <svg style="width:12px;height:12px;fill:currentColor;" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
          暂停引擎
        </button>
        <button id="cx-btn-skip" class="cx-btn cx-btn-skip">跳过本章 ⏭</button>
      </div>
    </div>
  `;

  const mountContainer = document.body && document.body.tagName !== 'FRAMESET' ? document.body : document.documentElement;
  if (mountContainer) {
    mountContainer.appendChild(widget);
  }

  // Make it draggable & persist position on drop
  const header = document.getElementById('cx-helper-widget-header');
  makeDraggable(widget, header, () => {
    chrome.storage.local.set({
      widgetPosTop: widget.style.top,
      widgetPosLeft: widget.style.left
    });
  });

  // Clicking on minimized capsule expands it
  widget.addEventListener('click', (e) => {
    if (widget.classList.contains('minimized') && !e.target.closest('.cx-header-actions')) {
      isMinimized = false;
      widget.classList.remove('minimized');
      const btnMin = document.getElementById('cx-widget-minimize');
      if (btnMin) btnMin.innerText = '−';
      chrome.storage.local.set({ widgetMinimized: false });
    }
  });

  // Button actions
  let isRunning = settings.engineRunning !== false;
  const btnToggle = document.getElementById('cx-btn-toggle');
  
  if (!isRunning) {
    btnToggle.innerHTML = '▶ 启动引擎';
    btnToggle.className = 'cx-btn cx-btn-toggle active';
  }

  btnToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    isRunning = !isRunning;
    chrome.storage.local.set({ engineRunning: isRunning });
    if (isRunning) {
      btnToggle.innerHTML = '<svg style="width:12px;height:12px;fill:currentColor;" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> 暂停引擎';
      btnToggle.className = 'cx-btn cx-btn-toggle';
      sendLog('助手引擎已恢复高速运转...', 'info');
      reportProgress('全速运转中');
      runTaskScanner();
    } else {
      btnToggle.innerHTML = '▶ 启动引擎';
      btnToggle.className = 'cx-btn cx-btn-toggle active';
      sendLog('助手引擎已挂起暂停。', 'warn');
      reportProgress('引擎已挂起');
    }
  });

  const btnSkip = document.getElementById('cx-btn-skip');
  btnSkip.addEventListener('click', (e) => {
    e.stopPropagation();
    sendLog('⚡ 接收指令：手动跨越至下一章节...', 'warn');
    reportProgress('手动跳过章节');
    clearQueue();
    clickNextSection();
  });

  const btnMinimize = document.getElementById('cx-widget-minimize');
  btnMinimize.addEventListener('click', (e) => {
    e.stopPropagation();
    isMinimized = !isMinimized;
    if (isMinimized) {
      widget.classList.add('minimized');
      btnMinimize.innerText = '+';
      // Ensure minimized capsule stays within viewport
      ensureWidgetInViewport(widget);
    } else {
      widget.classList.remove('minimized');
      btnMinimize.innerText = '−';
    }
    chrome.storage.local.set({ widgetMinimized: isMinimized });
  });

  const btnClose = document.getElementById('cx-widget-close');
  btnClose.addEventListener('click', (e) => {
    e.stopPropagation();
    widget.style.display = 'none';
    chrome.storage.local.set({ engineRunning: false });
    sendLog('助手面板已关闭，引擎已自动挂起停止运行。', 'warn');
    // Show a small restore bubble so user can reopen without refreshing
    showRestoreBubble(widget);
  });
}

function appendLog(text, level) {
  const container = document.getElementById('cx-log-container');
  if (!container) return;

  const entry = document.createElement('div');
  entry.className = `cx-log-entry ${level}`;
  entry.innerText = text;
  container.appendChild(entry);
  container.scrollTop = container.scrollHeight;
}

function makeDraggable(element, handle, onDragEnd) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  handle.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
    
    // Prevent dragging completely off
    if (element.offsetTop < 0) element.style.top = "0px";
    if (element.offsetLeft < 0) element.style.left = "0px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    if (typeof onDragEnd === 'function') {
      onDragEnd();
    }
  }
}

// 3. Task Detection Scanner
function runTaskScanner() {
  // Check if the engine is globally paused or stopped
  if (settings.engineRunning === false) {
    return;
  }

  // Check if we are paused on the widget (top window fallback)
  if (isTopWindow) {
    const btnToggle = document.getElementById('cx-btn-toggle');
    if (btnToggle && btnToggle.classList.contains('active')) {
      return; // Widget is paused
    }
  }

  // 1. Detect standard video tags
  const hasVideo = document.querySelector('video, audio, iframe[src*="video/index.html"]');
  if (hasVideo) {
    setupVideoAutomation();
  }

  // 2. Detect quiz modules
  const hasQuiz = document.querySelector('.TiMu, iframe[src*="work/index.html"]');
  if (hasQuiz) {
    setupQuizAutomation();
  }

  // 2.5 Detect PPT / PDF / Document reading modules across all URLs and selectors
  const isDocUrl = (window.location.href.includes('/ppt/') || window.location.href.includes('/pdf/') || window.location.href.includes('/book/') || window.location.href.includes('/doc/') || window.location.href.includes('pdfViewer') || window.location.href.includes('ananas/modules/')) && !window.location.href.includes('/video/');
  
  let docIframe = document.querySelector('iframe[src*="ppt/"], iframe[src*="pdf/"], iframe[src*="book/"], iframe[src*="doc/"], iframe[src*="ananas/modules/"]');
  if (docIframe) {
    try {
      const src = docIframe.getAttribute('src') || '';
      if (src.includes('/video/') || src.includes('video/index.html')) {
        docIframe = null;
      }
    } catch (e) {
      docIframe = null;
    }
  }
  
  const hasDocument = isDocUrl || docIframe || document.querySelector('.imglook, #viewerContainer, .turnpage_next, #nextBtn, [data-type="document"], [data-type="ppt"]');
  if (hasDocument) {
    setupDocumentAutomation();
  }

  // 3. Detect standalone Homework/Quiz Batch List (Continuous Homework Mode)
  if (settings.autoBatchHomework && isHomeworkOrTestInterface() && !document.querySelector('.TiMu, .topic-item')) {
    checkHomeworkBatchList();
  }

  // 3.5 Autonomous Tab Switching & Cross-Origin Job Reporting
  let localAllJobs = getUnfinishedJobs(document, true);
  let localUnfinishedJobs = getUnfinishedJobs(document, false);

  // Mature framework tab handling: check tabs autonomously in the child iframe
  try {
    const tabSelector = '.prev_ul li, .tabtags span, .celink, .title-nav li';
    const tabs = Array.from(document.querySelectorAll(tabSelector));
    if (tabs.length > 1) {
      let activeIndex = tabs.findIndex(t => t.classList.contains('active') || t.classList.contains('current') || t.style.color || t.className.includes('active'));
      if (activeIndex === -1) activeIndex = 0;

      // If the current tab has finished all jobs, check if there is a next tab
      if (localUnfinishedJobs.length === 0 && activeIndex + 1 < tabs.length) {
        // Fake an unfinished job to prevent top window from jumping prematurely
        localUnfinishedJobs = [{ dummy: true }];
        
        // Ensure we don't spam clicks
        if (!window._cx_tab_switch_processing) {
          window._cx_tab_switch_processing = true;
          sendLog('当前标签页任务已完成，自动切换至下一标签页...', 'info');
          setTimeout(() => {
            try {
              tabs[activeIndex + 1].click();
            } catch (err) {}
            setTimeout(() => { window._cx_tab_switch_processing = false; }, 5000);
          }, 2000);
        }
      }
    }
  } catch(e) {}

  // Broadcast job counts to top window
  try {
    if (window.top) {
      window.top.postMessage({
        type: 'CX_REPORT_JOBS',
        all: localAllJobs.length,
        unfinished: localUnfinishedJobs.length,
        url: window.location.href
      }, '*');
    }
  } catch (e) {}

  // 3.6 Broadcast Attachments to Media Iframes (Robust Cross-Origin Completion Check)
  try {
    if (document.documentElement.dataset.cxAttachments) {
      const attachments = JSON.parse(document.documentElement.dataset.cxAttachments);
      const iframes = document.querySelectorAll('iframe');
      for (const iframe of iframes) {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'CX_SYNC_ATTACHMENTS',
              attachments: attachments
            }, '*');
          }
        } catch(e) {}
      }
    }
  } catch (e) {}

  // 4. Auto-completion flow check (Only in Top Window)
  if (isTopWindow) {
    if (typeof window._cx_empty_job_ticks === 'undefined') {
      window._cx_empty_job_ticks = 0;
      window._cx_job_reports = {};
      
      // Listen for job reports and video lock requests from child frames
      window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'CX_REPORT_JOBS') {
          window._cx_job_reports[e.data.url] = {
            all: e.data.all,
            unfinished: e.data.unfinished,
            timestamp: Date.now()
          };
        }
        
        // Global Job Lock Manager (Mature Architecture with Deadlock Prevention)
        if (e.data && e.data.type === 'CX_REQUEST_JOB_LOCK') {
          window._cx_job_queue = window._cx_job_queue || [];
          if (!window._cx_job_queue.includes(e.source)) {
            window._cx_job_queue.push(e.source);
          }
          if (!window._cx_job_playing) {
             _cx_processJobQueue();
          }
        }
        if (e.data && e.data.type === 'CX_RELEASE_JOB_LOCK') {
          if (window._cx_job_playing === e.source) {
              window._cx_job_playing = null;
              window._cx_job_last_heartbeat = 0;
              _cx_processJobQueue();
          }
        }
        if (e.data && e.data.type === 'CX_HEARTBEAT_JOB_LOCK') {
          if (window._cx_job_playing === e.source) {
              window._cx_job_last_heartbeat = Date.now();
          }
        }
      });
      
      // Ensure the processor function exists on window for scope access
      window._cx_processJobQueue = function() {
          if (window._cx_job_queue && window._cx_job_queue.length > 0) {
              window._cx_job_playing = window._cx_job_queue.shift();
              window._cx_job_last_heartbeat = Date.now();
              try {
                  window._cx_job_playing.postMessage({ type: 'CX_GRANT_JOB_LOCK' }, '*');
              } catch (err) {
                  window._cx_job_playing = null;
                  setTimeout(window._cx_processJobQueue, 100);
              }
          }
      };

      // Deadlock Watchdog (Evicts locks if iframe dies or hangs for 20s)
      setInterval(() => {
          if (window._cx_job_playing && window._cx_job_last_heartbeat > 0) {
              if (Date.now() - window._cx_job_last_heartbeat > 20000) {
                  console.warn('OCS Global Lock: Evicting dead lock due to timeout!');
                  window._cx_job_playing = null;
                  window._cx_job_last_heartbeat = 0;
                  _cx_processJobQueue();
              }
          }
      }, 5000);
    }

    let searchRoot = document;
    try {
      if (window.top && window.top.document) {
        searchRoot = window.top.document;
      }
    } catch (e) {}

    const directAll = getUnfinishedJobs(searchRoot, true);
    const directUnfinished = getUnfinishedJobs(searchRoot, false);

    let totalAll = directAll.length;
    let totalUnfinished = directUnfinished.length;

    // Aggregate from all cross-origin reports received in the last 10 seconds
    const now = Date.now();
    for (const url in window._cx_job_reports) {
      const report = window._cx_job_reports[url];
      if (now - report.timestamp < 10000) {
        totalAll = Math.max(totalAll, totalAll + report.all);
        totalUnfinished = Math.max(totalUnfinished, totalUnfinished + report.unfinished);
      }
    }

    if (totalUnfinished === 0) {
      if (totalAll === 0) {
        window._cx_empty_job_ticks++;
        if (window._cx_empty_job_ticks < 3) {
          return; // Wait for AJAX to load (3 ticks = 7.5s)
        }
        if (window._cx_empty_job_ticks === 3) {
          sendLog('此页面未检测到任务点（可能是纯文本或已做完），即将自动跳过...', 'info');
        }
      }

      // Trigger navigation (only once)
      if (window._cx_empty_job_ticks === 0 || window._cx_empty_job_ticks === 3) {
        setTimeout(() => {
          handleTaskCompletion();
        }, 1500);
        window._cx_empty_job_ticks = 4; // prevent spamming handleTaskCompletion
      }
    } else {
      window._cx_empty_job_ticks = 0;
    }
  } else {
    // Child frame check: periodically notify top window of task completion if tasks were completed in this session
    if (window._cx_doc_completed_in_session || window._cx_video_completed_in_session) {
      const now = Date.now();
      if (!window._cx_last_completion_notify || now - window._cx_last_completion_notify > 5000) {
        window._cx_last_completion_notify = now;
        notifyTaskCompleted();
      }
    }
  }
}

// 4. Video Automation Module
function setupVideoAutomation() {
  if (window._cx_video_processing) return;
  if (window._cx_video_completed_in_session) return;
  if (isCurrentJobCompleted()) {
     sendLog('检测到当前视频任务点已标绿/完成，跳过播放。', 'success');
     return; // Early exit if already completed
  }

  const video = document.querySelector('video');
  if (video) {
    window._cx_video_processing = true;
    video.dataset.cxPaused = 'true'; // Default pause guard to block inject.js auto-play

    let speedVal = settings.videoSpeed;
    if (settings.videoLoop) {
      speedVal = '1.0';
      if (!window._cx_loop_speed_warned) {
        window._cx_loop_speed_warned = true;
        sendLog('⚠️ [时长挂机保护] 检测到当前开启了“循环播放刷时长”模式。已自动将播放速度调回 1.0x。', 'warn');
      }
    }

    sendLog(`检测到媒体播放器，已加入顶层播放队列，等待排队...`, 'info');
    reportProgress('⏳ 视频准备排队中');
    injectPageScript();

    // Trigger initial settings
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('CX_SET_SETTINGS', {
        detail: { speed: speedVal, mute: settings.videoMute, engineRunning: settings.engineRunning }
      }));
    }, 200);

    let hasLock = false;
    let reported = false;
    let checkEndInterval;

    // Listen for Lock Grant
    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'CX_GRANT_JOB_LOCK') {
            hasLock = true;
            sendLog('获取到播放锁，开始播放视频...', 'info');
            reportProgress('▶️ 播放中...');
            video.dataset.cxPaused = 'false';
            try { video.play(); } catch(err) {}
        }
    });

    // Request Lock
    if (window.top) {
        window.top.postMessage({ type: 'CX_REQUEST_JOB_LOCK' }, '*');
    } else {
        hasLock = true; // Fallback
        video.dataset.cxPaused = 'false';
    }

    const videoTick = () => {
      if (settings.engineRunning === false || !document.body.contains(video)) {
        clearInterval(checkEndInterval);
        window._cx_video_processing = false;
        if (window.top) window.top.postMessage({ type: 'CX_RELEASE_JOB_LOCK' }, '*');
        return;
      }

      if (isCurrentJobCompleted()) {
        sendLog('检测到当前视频任务点已在后台标绿/完成，自动停止播放。', 'success');
        clearInterval(checkEndInterval);
        window._cx_video_processing = false;
        window._cx_video_completed_in_session = true;
        if (window.top) window.top.postMessage({ type: 'CX_RELEASE_JOB_LOCK' }, '*');
        try { video.pause(); } catch (e) {}
        reportProgress('✅ 视频已完成');
        setTimeout(notifyTaskCompleted, 1500);
        return;
      }

      if (!hasLock) {
         if (!video.paused) {
            video.dataset.cxPaused = 'true';
            video.pause();
         }
         reportProgress('⏳ 排队等待视频锁...');
         return;
      }

      // We have the lock! Send heartbeat.
      if (window.top) {
          window.top.postMessage({ type: 'CX_HEARTBEAT_JOB_LOCK' }, '*');
      }
      
      video.dataset.cxPaused = 'false';

      if (video.ended) {
        if (settings.videoLoop) {
          sendLog('视频播放完毕，循环播放刷时长中...', 'info');
          reportProgress('🔄 循环播放刷时长中');
        } else if (!reported) {
          reported = true;
          clearInterval(checkEndInterval);
          window._cx_video_processing = false;
          window._cx_video_completed_in_session = true;
          if (window.top) window.top.postMessage({ type: 'CX_RELEASE_JOB_LOCK' }, '*');
          sendLog('视频播放完成！', 'success');
          reportProgress('✅ 视频播放完毕');
          setTimeout(notifyTaskCompleted, 3000);
        }
      } else if (!video.paused && video.duration > 0) {
        const pct = Math.round((video.currentTime / video.duration) * 100);
        reportProgress(`▶ OCS挂机防护 ${speedVal}x 播放中 (${pct}%)`);
      }
    };

    videoTick();
    checkEndInterval = setInterval(videoTick, 2000);
  } else {
    // If video is inside a sub-iframe, let injectScript run in its own context
    const videoIframe = document.querySelector('iframe[src*="video/index.html"]');
    if (videoIframe) {
      if (!window._cx_video_iframe_logged) {
        window._cx_video_iframe_logged = true;
        sendLog('发现视频嵌套框，已注入底层拦截控制...', 'info');
      }
    }
  }
}

function injectPageScript() {
  if (document.getElementById('chaoxing-helper-inject')) return;

  const script = document.createElement('script');
  script.id = 'chaoxing-helper-inject';
  script.src = chrome.runtime.getURL('content/inject.js');
  
  let speedVal = settings.videoSpeed;
  if (settings.videoLoop) {
    speedVal = '1.0';
  }

  // Pass configuration variables to page context script
  const passConfig = {
    speed: speedVal,
    mute: settings.videoMute,
    engineRunning: settings.engineRunning
  };
  script.dataset.settings = JSON.stringify(passConfig);

  (document.head || document.documentElement).appendChild(script);
}

function setupDocumentAutomation() {
  if (window._cx_document_processing) return;
  if (window._cx_doc_completed_in_session) return;
  if (isCurrentJobCompleted()) return;

  const docIframe = document.querySelector('iframe[src*="ppt/"], iframe[src*="pdf/"], iframe[src*="book/"], iframe[src*="doc/"], iframe[src*="ananas/modules/"]:not([src*="/video/"]):not([src*="video/index.html"])');
  const isDocFrame = (window.location.href.includes('/ppt/') || window.location.href.includes('/pdf/') || window.location.href.includes('/book/') || window.location.href.includes('/doc/') || window.location.href.includes('pdfViewer') || window.location.href.includes('ananas/modules/')) && !window.location.href.includes('/video/');

  // 1. If we are in the parent window containing the document iframe
  if (docIframe) {
    window._cx_document_processing = true;
    sendLog('📖 [课件阅读模块] 发现课件嵌套框，已交由内部脚本进行 OCS 原生任务打卡。', 'info');
    return;
  }

  // 2. If we are inside the document iframe itself
  if (isDocFrame) {
    window._cx_document_processing = true;
    
    // Parse timing parameter for timed readers
    const params = new URLSearchParams(window.location.search);
    const timingStr = params.get('timing');
    const timing = timingStr ? parseInt(timingStr, 10) : 0;
    
    // OCS logic: (timing + 3) * 3 seconds for timing reader, else 3 seconds
    const delay = timing > 0 ? (timing + 3) * 3 * 1000 : 3000;
    
    let hasLock = false;

    // Listen for Lock Grant
    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'CX_GRANT_JOB_LOCK') {
            hasLock = true;
            window._cx_doc_start_time = Date.now(); // Reset start time when lock is granted
            sendLog('📖 [课件阅读模块] 获取到全局锁，开始阅读...', 'info');
        }
    });

    // Request Lock
    if (window.top) {
        window.top.postMessage({ type: 'CX_REQUEST_JOB_LOCK' }, '*');
    } else {
        hasLock = true; // Fallback
        window._cx_doc_start_time = Date.now();
    }
    
    window._cx_doc_interval = setInterval(() => {
       if (settings.engineRunning === false) {
          if (window.top) window.top.postMessage({ type: 'CX_RELEASE_JOB_LOCK' }, '*');
          return;
       }
       if (isCurrentJobCompleted()) {
          clearInterval(window._cx_doc_interval);
          window._cx_document_processing = false;
          window._cx_doc_completed_in_session = true;
          if (window.top) window.top.postMessage({ type: 'CX_RELEASE_JOB_LOCK' }, '*');
          reportProgress('✅ 课件已完成');
          setTimeout(notifyTaskCompleted, 1500);
          return;
       }
       
       if (!hasLock) {
         reportProgress('⏳ 排队等待课件锁...');
         return;
       }

       // We have the lock! Send heartbeat.
       if (window.top) {
           window.top.postMessage({ type: 'CX_HEARTBEAT_JOB_LOCK' }, '*');
       }
          
       const elapsed = Date.now() - window._cx_doc_start_time;
       
       // PPT with swiper logic
       const swiperContainer = document.querySelector('.swiper-container .swiper-slide');
       if (swiperContainer) {
          reportProgress('📖 PPT自动翻页中...');
          window.postMessage({ type: 'CX_TRIGGER_SWIPER_NEXT' }, '*');
       } else {
          if (timing > 0) {
            reportProgress(`📖 定时阅读中 (${Math.floor(elapsed/1000)}/${Math.round(delay/1000)}s)`);
          } else {
            reportProgress('📖 课件秒过打卡中...');
          }
       }
       
       if (elapsed >= delay) {
          // Dispatch OCS completion hook
          window.postMessage({ type: 'CX_TRIGGER_FINISH_JOB' }, '*');
          
          if (elapsed >= delay + 3000) {
            // Force complete if API doesn't work after 3 extra seconds
            clearInterval(window._cx_doc_interval);
            window._cx_document_processing = false;
            window._cx_doc_completed_in_session = true;
            if (window.top) window.top.postMessage({ type: 'CX_RELEASE_JOB_LOCK' }, '*');
            sendLog('✅ [课件阅读模块] 课件任务已完成！', 'success');
            reportProgress('✅ 课件阅读完毕');
            setTimeout(notifyTaskCompleted, 1500);
          }
       }
    }, 1000);
  }
}

// 5. Quiz Automation Module
async function setupQuizAutomation() {
  if (window._cx_quiz_processing) return;
  if (window._cx_quiz_completed_in_session) return;
  if (isCurrentJobCompleted()) return;

  // Check if we are inside a quiz page/iframe
  const quizFrame = document.querySelector('iframe[src*="work/index.html"]');
  if (quizFrame) {
    sendLog('发现测验卡片，正在进入答题模块...', 'info');
    return; // Nested frame will execute the content.js to parse the DOM
  }

  const questions = document.querySelectorAll('.TiMu, .topic-item');
  if (questions.length === 0) return;

  if (!settings.quizEnable) {
    sendLog('答题功能已关闭，停止操作。', 'warn');
    return;
  }

  window._cx_quiz_processing = true;

  sendLog(`检测到 ${questions.length} 道题目，进入任务队列排队...`, 'info');
  
  // Wait for our turn in the queue
  const waitInQueue = () => {
    return new Promise((resolve) => {
      let hasLock = false;
      
      // Listen for Lock Grant
      window.addEventListener('message', (e) => {
          if (e.data && e.data.type === 'CX_GRANT_JOB_LOCK') {
              hasLock = true;
          }
      });

      // Request Lock
      if (window.top) {
          window.top.postMessage({ type: 'CX_REQUEST_JOB_LOCK' }, '*');
      } else {
          hasLock = true;
      }
        
      const checkInterval = setInterval(() => {
        if (settings.engineRunning === false) {
           clearInterval(checkInterval);
           window._cx_quiz_processing = false;
           if (window.top) window.top.postMessage({ type: 'CX_RELEASE_JOB_LOCK' }, '*');
           return;
        }
        
        if (hasLock) {
            clearInterval(checkInterval);
            resolve();
        } else {
            reportProgress(`⏳ 排队等待测验锁...`);
        }
      }, 1500);
    });
  };

  await waitInQueue();

  // If engine was stopped while waiting
  if (settings.engineRunning === false) {
      window._cx_quiz_processing = false;
      if (window.top) window.top.postMessage({ type: 'CX_RELEASE_JOB_LOCK' }, '*');
      return;
  }

  sendLog(`排队完毕，开始自动搜索答题...`, 'info');
  reportProgress(`✏️ AI答题准备中 (0/${questions.length})`);

  // Start heartbeat interval so we don't expire from the queue
  window._cx_quiz_heartbeat = setInterval(() => {
    if (settings.engineRunning !== false) {
      if (window.top) {
          window.top.postMessage({ type: 'CX_HEARTBEAT_JOB_LOCK' }, '*');
      }
    }
  }, 2000);

  if (!settings.apiUrl) {
    sendLog('警告: 未配置自定义题库 API 地址，无法搜题！', 'error');
    return;
  }

  for (let i = 0; i < questions.length; i++) {
    const qEl = questions[i];
    reportProgress(`✏️ AI答题中 (${i + 1}/${questions.length})`);
    
    // Clear styles
    qEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    qEl.style.border = '2px solid #8b5cf6';
    qEl.style.borderRadius = '8px';
    qEl.style.padding = '10px';

    // 1. Get Question Stem Text
    const stemEl = qEl.querySelector('.Zy_Tctitle, .topic-title, h3, .font14');
    if (!stemEl) continue;
    
    const rawStem = stemEl.textContent || '';
    // Strip prefixes like "1.", "(单选题)", etc.
    const cleanStem = rawStem
      .replace(/^\d+[\s.、]*/, '') // Remove numbers (1., 2、)
      .replace(/[\(\[（【].*?[）\]）】]/g, '') // Remove (单选题) [多选题] (5分)
      .trim();

    // 2. Extract choices/options
    const optionElements = qEl.querySelectorAll('.Zy_ulTop li, .topic-option-item, label');
    
    // Determine question type (single, multi, fill, binary)
    const isMulti = qEl.querySelector('input[type="checkbox"]') !== null;
    const inputFields = Array.from(qEl.querySelectorAll('textarea, input[type="text"]'));
    const isText = inputFields.length > 0;
    
    let questionType = isText ? '填空/简答题' : (isMulti ? '多选题' : (optionElements.length === 2 ? '判断题' : '单选题'));
    if (rawStem.includes('多选')) questionType = '多选题';
    else if (rawStem.includes('单选')) questionType = '单选题';
    else if (rawStem.includes('判断')) questionType = '判断题';

    let optionsContext = '';
    optionElements.forEach(opt => {
        let text = opt.innerText || opt.textContent || '';
        text = text.trim().replace(/\s+/g, ' ');
        if (text) optionsContext += text + '\n';
    });

    let extraInstructions = '';
    if (isText) {
        if (inputFields.length > 1) {
            extraInstructions = `\n请注意：本题有 ${inputFields.length} 个填空，请严格按照以下格式输出，每行一个空的答案，不要带任何标点：\n1: 第一个空的答案\n2: 第二个空的答案`;
        } else {
            extraInstructions = `\n请注意：这是简答/论述题，请尽量简明扼要，直击核心，不要输出冗长的废话。`;
        }
    }

    const aiPrompt = `你是一个专业的做题助手。请直接输出正确答案，不要任何废话或解释。如果是选择题，请尽量只输出正确的选项字母（如 A 或 AB）。
题目类型：【${questionType}】
题目内容：${cleanStem}
${optionsContext ? '选项列表：\n' + optionsContext : ''}${extraInstructions}`.trim();

    sendLog(`正在请求大模型分析第 ${i + 1} 题 (附带上下文)...`, 'info');

    // 3. Request API Answer
    const apiAnswer = await queryAnswerAPI(aiPrompt);
    
    if (apiAnswer) {
      sendLog(`搜索到答案: "${apiAnswer}"`, 'success');
      
      // question type is already determined above (isMulti, isText)

      if (isText) {
        // Fill text area / inputs
        const parsedAnswers = parseFillInTheBlanks(apiAnswer, inputFields.length);
        for (let j = 0; j < Math.min(inputFields.length, parsedAnswers.length); j++) {
            const inputField = inputFields[j];
            if (inputField) {
                inputField.value = parsedAnswers[j];
                // Trigger change events
                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                inputField.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
      } else {
        // Click matched choices
        const answerList = parseAnswers(apiAnswer, isMulti);
        let matchCount = 0;

        for (const ansText of answerList) {
          const matchedOpt = findMatchingOption(optionElements, ansText);
          if (matchedOpt) {
            const input = matchedOpt.querySelector('input');
            if (input && !input.checked) {
              input.click();
            } else if (!input) {
              matchedOpt.click();
            }
            matchCount++;
          }
        }

        if (matchCount === 0) {
          sendLog(`未能在选项中匹配到答案: ${apiAnswer}`, 'warn');
        }
      }
    } else {
      sendLog(`第 ${i + 1} 题未找到答案`, 'warn');
    }

    qEl.style.border = '1px solid #10b981'; // Green border for processed
    
    // Simulate reading delay
    const delay = (settings.actionDelay + Math.random() * 2) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  sendLog('所有题目处理完成！', 'success');
  reportProgress('✅ 答题全部完成');

  // Submit/Save quiz
  if (settings.quizSubmitMode === 'submit') {
    sendLog('正在执行自动提交章节测验...', 'info');
    const submitBtn = document.querySelector('a.btn-submit, .btn-submit, input[type="submit"], a[onclick*="submitWork"]');
    if (submitBtn) {
      submitBtn.click();
    } else {
      sendLog('未找到自动提交按钮，请手动提交！', 'warn');
    }
  } else {
    sendLog('仅自动填充，请您检查答案后手动提交。', 'info');
    // Try to click "Save/Draft" (暂存) if available
    let saveBtn = document.querySelector('a[onclick*="saveWork"], .btn-save');
    if (!saveBtn) {
      // Safe standard text matching fallback instead of invalid jQuery :contains selector
      const links = document.querySelectorAll('a');
      for (const a of links) {
        if (a.textContent.includes('暂存')) {
          saveBtn = a;
          break;
        }
      }
    }
    if (saveBtn) {
      saveBtn.click();
      sendLog('已自动保存测验草稿。', 'success');
    }
  }

  // Trigger completion routing
  clearInterval(window._cx_quiz_heartbeat);
  window._cx_quiz_processing = false;
  window._cx_quiz_completed_in_session = true;
  if (window.top) window.top.postMessage({ type: 'CX_RELEASE_JOB_LOCK' }, '*');

  if (settings.autoBatchHomework && isHomeworkOrTestInterface()) {
    sendLog('🚀 [连续刷作业模式] 本份作业已处理完毕！准备自动返回作业列表页继续下一份...', 'success');
    setTimeout(() => {
      handleHomeworkBatchReturn();
    }, (settings.actionDelay + 2) * 1000);
  } else {
    setTimeout(notifyTaskCompleted, 3000);
  }
}

// Query Answer API via Background Script
function queryAnswerAPI(question) {
  return new Promise((resolve) => {
    const provider = settings.apiProvider || 'deepseek';
    const model = settings.modelName || 'deepseek-chat';
    const urlInput = settings.apiUrl;
    const method = settings.apiMethod;
    const key = settings.apiKey;
    const bodyTemplate = settings.apiBody;
    const path = settings.apiPath;

    if (!urlInput) {
      sendLog('警告: 未配置正确有效的 API URL 节点地址', 'error');
      resolve(null);
      return;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (key) {
      if (provider === 'claude') {
        headers['x-api-key'] = key;
        headers['anthropic-version'] = '2023-06-01';
      } else if (provider === 'gemini') {
        headers['x-goog-api-key'] = key;
      } else if (provider === 'deepseek' || provider === 'openai') {
        headers['Authorization'] = key.startsWith('Bearer ') ? key : `Bearer ${key}`;
      } else {
        headers['Authorization'] = key;
      }
    }

    let finalUrl = urlInput;
    if (provider === 'gemini' && key && !finalUrl.includes('key=')) {
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + `key=${encodeURIComponent(key)}`;
    }

    let finalBody = null;
    if (method === 'GET') {
      finalUrl = finalUrl.replace('{question}', encodeURIComponent(question));
    } else {
      try {
        // Safely escape the question string so it doesn't break JSON structure when replaced
        let escapedQuestion = JSON.stringify(question).slice(1, -1);
        let replacedText = bodyTemplate.replace('{question}', escapedQuestion);
        if (model && replacedText.includes('{model}')) {
          replacedText = replacedText.replace('{model}', model);
        }
        finalBody = JSON.parse(replacedText);
        if (finalBody && typeof finalBody === 'object' && !finalBody.model && (provider === 'deepseek' || provider === 'openai' || provider === 'claude')) {
          finalBody.model = model;
        }
      } catch (e) {
        sendLog(`JSON Request Body 解析异常: ${e.message}`, 'error');
        resolve(null);
        return;
      }
    }

    chrome.runtime.sendMessage({
      type: 'QUERY_API',
      payload: {
        url: finalUrl,
        method: method,
        headers: headers,
        body: finalBody
      }
    }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        sendLog(`接口发包失败 [${provider.toUpperCase()}]: ${response ? response.error : '连接异常或密钥无权限'}`, 'error');
        resolve(null);
        return;
      }

      const rawAnswer = getValueByPath(response.data, path);
      if (rawAnswer !== undefined && rawAnswer !== null) {
        // Strip markdown bold/code markers & surrounding quotes
        let cleanAns = String(rawAnswer).trim().replace(/^['"]|['"]$/g, '').replace(/\*\*([^*]+)\*\*/g, '$1');
        resolve(cleanAns);
      } else {
        sendLog(`未能在路径 "${path}" 中提取到字段，请检查返回格式`, 'warn');
        resolve(null);
      }
    });
  });
}

// Clean noisy LLM prefixes and markdown wrappers
function cleanAIAnswerString(rawStr) {
  if (!rawStr) return '';
  let str = String(rawStr).trim();
  // Remove markdown code block if present
  str = str.replace(/```[a-z]*\s*([^\n]+)\s*```/ig, '$1').replace(/```/g, '').trim();
  // Remove markdown bold/italic
  str = str.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
  // Remove common Chinese/English answer prefixes
  str = str.replace(/^(正确答案|参考答案|答案|建议选择|选项|判断结果|故选|应选|答)[是为：:\s]+/i, '');
  str = str.replace(/^【(正确答案|参考答案|答案|解析)】[:：\s]*/i, '');
  // Strip surrounding quotes or brackets if purely wrapping the answer
  str = str.replace(/^["'「『【\[（(]([^"'」』】\]）)]+)["'」』】\]）)]$/g, '$1').trim();
  return str;
}

// Parse answer into a list of items for checking
function parseFillInTheBlanks(apiAnswer, expectedCount) {
  const cleanStr = cleanAIAnswerString(apiAnswer);
  if (expectedCount <= 1) return [cleanStr];
  
  // Try to parse multiple lines like "1: answer" or "1. answer"
  const lines = cleanStr.split('\n').map(l => l.trim()).filter(Boolean);
  const answers = [];
  
  for (const line of lines) {
    const match = line.match(/^\d+[\.:：\s]+(.*)$/);
    if (match) {
      answers.push(match[1].trim());
    }
  }
  
  // Fallback if regex failed to extract multiple answers
  if (answers.length === 0) {
     return lines; // return the raw lines split
  }
  
  return answers;
}

function parseAnswers(apiAnswer, isMulti) {
  if (Array.isArray(apiAnswer)) return apiAnswer.map(String);
  const cleanStr = cleanAIAnswerString(apiAnswer);
  
  if (isMulti) {
    // Check if it's pure letters like "ABC" or "A, B, D" or "A和C"
    if (/^[A-G,\s、和小及]+$/i.test(cleanStr)) {
      return cleanStr.toUpperCase().replace(/[^A-G]/g, '').split('');
    }
    // Otherwise split by delimiters
    return cleanStr.split(/[,，;；、\n\r\t]+|\s{2,}|和|以及/).map(s => s.trim()).filter(Boolean);
  }
  return [cleanStr];
}

// Dice + Longest Common Subsequence (LCS) hybrid similarity for fuzzy word recognition
function calculateStringSimilarity(s1, s2) {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  const clean1 = s1.replace(/[^\w\u4e00-\u9fa5]/g, '');
  const clean2 = s2.replace(/[^\w\u4e00-\u9fa5]/g, '');
  if (clean1 === clean2) return 1.0;
  
  let includesRatio = 0.0;
  if (clean1.includes(clean2) || clean2.includes(clean1)) {
    const minLen = Math.min(clean1.length, clean2.length);
    const maxLen = Math.max(clean1.length, clean2.length);
    includesRatio = maxLen > 0 ? (minLen / maxLen) * 0.95 + 0.05 : 0;
  }

  // Longest Common Subsequence (LCS) Ratio
  const m = clean1.length;
  const n = clean2.length;
  if (m === 0 || n === 0) return 0.0;
  let dp = Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    let prev = 0;
    for (let j = 1; j <= n; j++) {
      let temp = dp[j];
      if (clean1[i - 1] === clean2[j - 1]) {
        dp[j] = prev + 1;
      } else {
        dp[j] = Math.max(dp[j], dp[j - 1]);
      }
      prev = temp;
    }
  }
  const lcsLen = dp[n];
  const lcsRatio = (2.0 * lcsLen) / (m + n);

  // Bigram Dice Coefficient
  const getBigrams = (str) => {
    const bigrams = new Set();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };
  const b1 = getBigrams(clean1);
  const b2 = getBigrams(clean2);
  let dice = 0.0;
  if (b1.size > 0 && b2.size > 0) {
    let intersection = 0;
    b1.forEach(bg => { if (b2.has(bg)) intersection++; });
    dice = (2.0 * intersection) / (b1.size + b2.size);
  }
  return Math.max(includesRatio, lcsRatio, dice);
}

// Find matching choice element with Fuzzy Recognition & Robustness
function findMatchingOption(optionElements, answerText) {
  if (!answerText) return null;
  const rawClean = cleanAIAnswerString(answerText);
  const cleanAnswer = rawClean.toLowerCase();

  // 1. Match option letters directly (A, B, C...)
  if (/^[a-g]$/i.test(cleanAnswer)) {
    const letter = cleanAnswer.toUpperCase();
    for (const opt of optionElements) {
      const optText = opt.textContent.trim();
      if (optText.startsWith(letter) || optText.startsWith(letter + '、') || optText.startsWith(letter + '.') || optText.startsWith(letter + '．')) {
        return opt;
      }
      const input = opt.querySelector('input');
      if (input && (input.value.toUpperCase() === letter || input.id.toUpperCase().includes(letter))) {
        return opt;
      }
    }
  }

  // 2. Exact match text content (stripping option letter prefixes A. / B、 etc.)
  for (const opt of optionElements) {
    const optText = opt.textContent.trim().toLowerCase();
    const optTextClean = optText.replace(/^[a-g][.、．\s]*/i, '').trim();
    if (optTextClean === cleanAnswer || optText === cleanAnswer) {
      return opt;
    }
  }

  // 3. Partial inclusion match
  for (const opt of optionElements) {
    const optText = opt.textContent.trim().toLowerCase();
    const optTextClean = optText.replace(/^[a-g][.、．\s]*/i, '').trim();
    if (optTextClean.includes(cleanAnswer) || cleanAnswer.includes(optTextClean)) {
      return opt;
    }
  }

  // 4. True/False checks (判断题/辨析题)
  const isTrue = /^对$|^正确$|^是$|^√$|^true$|^t$|^1$/i.test(cleanAnswer) || cleanAnswer.includes('正确') || (cleanAnswer.includes('对') && !cleanAnswer.includes('不对'));
  const isFalse = /^错$|^错误$|^否$|^×$|^false$|^f$|^0$/i.test(cleanAnswer) || cleanAnswer.includes('错误') || cleanAnswer.includes('不正确') || cleanAnswer.includes('错');

  if (isTrue || isFalse) {
    for (const opt of optionElements) {
      const optText = opt.textContent.trim();
      if (isTrue && (optText.includes('对') || optText.includes('正确') || optText.includes('是') || optText.includes('√') || optText.includes('T'))) {
        return opt;
      }
      if (isFalse && (optText.includes('错') || optText.includes('错误') || optText.includes('否') || optText.includes('×') || optText.includes('F'))) {
        return opt;
      }
    }
  }

  // 5. 模糊词识别与相似度排序 (Fuzzy Word & Bigram Similarity Match)
  // When AI returns slightly rephrased choice text or OCR/typo variations
  let bestMatch = null;
  let maxSimilarity = 0.0;
  for (const opt of optionElements) {
    const optTextClean = opt.textContent.trim().replace(/^[a-g][.、．\s]*/i, '').trim();
    const sim = calculateStringSimilarity(optTextClean, rawClean);
    if (sim > maxSimilarity && sim >= 0.45) { // 45% similarity threshold
      maxSimilarity = sim;
      bestMatch = opt;
    }
  }

  if (bestMatch) {
    sendLog(`[模糊词识别] 自动命中最佳语义相似选项 (相似度 ${(maxSimilarity * 100).toFixed(1)}%): "${bestMatch.textContent.trim().substring(0, 15)}..."`, 'info');
    return bestMatch;
  }

  return null;
}

// Helper to recursively find elements inside all same-origin iframes on a root window/document
function findCatalogElement(selector, rootDoc) {
  if (!rootDoc) {
    try {
      if (window.top && window.top.document) {
        rootDoc = window.top.document;
      }
    } catch (e) {
      rootDoc = document;
    }
  }
  if (!rootDoc) rootDoc = document;

  try {
    const found = rootDoc.querySelector(selector);
    if (found) return found;
  } catch (e) {}

  try {
    const iframes = rootDoc.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const subDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        if (subDoc) {
          const found = findCatalogElement(selector, subDoc);
          if (found) return found;
        }
      } catch (e) {}
    }
  } catch (e) {}
  return null;
}

function findCatalogElementsAll(selector, rootDoc) {
  if (!rootDoc) {
    try {
      if (window.top && window.top.document) {
        rootDoc = window.top.document;
      }
    } catch (e) {
      rootDoc = document;
    }
  }
  if (!rootDoc) rootDoc = document;

  let list = [];
  try {
    list = Array.from(rootDoc.querySelectorAll(selector));
  } catch (e) {}

  try {
    const iframes = rootDoc.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const subDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        if (subDoc) {
          list = list.concat(findCatalogElementsAll(selector, subDoc));
        }
      } catch (e) {}
    }
  } catch (e) {}
  return list;
}

// Robust context-aware click trigger
function triggerClick(element) {
  if (!element) return;
  try {
    const ownerDoc = element.ownerDocument;
    const ownerWindow = ownerDoc ? (ownerDoc.defaultView || window) : window;
    
    // Call HTMLElement prototype click inside target window context
    if (ownerWindow.HTMLElement && ownerWindow.HTMLElement.prototype.click) {
      ownerWindow.HTMLElement.prototype.click.call(element);
    } else {
      element.click();
    }

    // Dispatch mouse events inside target window context to trigger any custom listener
    const MouseEventClass = ownerWindow.MouseEvent || window.MouseEvent;
    const events = ['mousedown', 'mouseup', 'click'];
    for (const eventName of events) {
      const ev = new MouseEventClass(eventName, {
        bubbles: true,
        cancelable: true,
        view: ownerWindow
      });
      element.dispatchEvent(ev);
    }
  } catch (e) {
    try {
      element.click();
    } catch (err) {}
  }
}

// 6. Section & Tab Navigation Completion
function handleTaskCompletion() {
  if (window._cx_auto_next_processing) return;
  window._cx_auto_next_processing = true;
  
  sendLog('🎉 当前页面所有任务点已完成！准备跳转下一节...', 'success');
  
  setTimeout(() => {
    let searchRoot = document;
    try {
      if (window.top && window.top.document) {
        searchRoot = window.top.document;
      }
    } catch (e) {}

    // Mature Architecture Jump Logic:
    
    // 1. Directory Tree Sequential Jump (PRIORITY 1: Most reliable for new UI)
    try {
      // Find the active chapter element in the sidebar
      const activeChapter = searchRoot.querySelector('.posCatalog_active, .active, .currents');
      if (activeChapter) {
          // Find the container of the chapter list
          const listContainer = activeChapter.closest('ul') || activeChapter.closest('.catalog_list, .posCatalog_box, .chapter_list, .jobList, .posCatalog_level');
          if (listContainer) {
              // Find all chapter items
              const items = Array.from(listContainer.querySelectorAll('li, .chapter_item, .posCatalog_select'));
              // Filter out decorative/hidden items
              const chapters = items.filter(el => el.innerText.trim().length > 0 && el.offsetHeight > 0);
              
              const currentIndex = chapters.findIndex(el => el === activeChapter || el.contains(activeChapter));
              
              if (currentIndex !== -1 && currentIndex + 1 < chapters.length) {
                  const nextChapter = chapters[currentIndex + 1];
                  const clickTarget = nextChapter.querySelector('a, [onclick]') || nextChapter;
                  const nextChapterName = clickTarget.innerText ? clickTarget.innerText.trim() : '下一节';
                  
                  sendLog(`准备通过目录树安全跳转至: ${nextChapterName}，等待 3~6 秒...`, 'info');
                  
                  if (clickTarget.scrollIntoView) {
                     clickTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                  
                  const randomDelay = Math.floor(Math.random() * 3000) + 3000;
                  setTimeout(() => {
                     triggerClick(clickTarget);
                     setTimeout(() => { window._cx_auto_next_processing = false; }, 15000); // 15s lock
                  }, randomDelay);
                  return;
              } else if (chapters.length > 0 && currentIndex === chapters.length - 1) {
                  sendLog('🎉 检测到全部章节任务点均已完成！', 'success');
                  window._cx_auto_next_processing = false;
                  return;
              }
          }
      }
      
      // Fallback Directory Tree Jump for older UIs
      const legacyChapters = Array.from(searchRoot.querySelectorAll('[onclick^="getTeacherAjax"]'));
      const legacyCurrentIndex = legacyChapters.findIndex(el => {
          const parent = el.parentElement;
          return parent && (parent.classList.contains('posCatalog_active') || parent.classList.contains('active'));
      });

      if (legacyCurrentIndex !== -1 && legacyCurrentIndex + 1 < legacyChapters.length) {
         const nextChapterLink = legacyChapters[legacyCurrentIndex + 1];
         const nextChapterName = nextChapterLink.innerText ? nextChapterLink.innerText.trim() : '下一节';
         
         sendLog(`准备通过目录树安全跳转至: ${nextChapterName}，等待 3~6 秒...`, 'info');
         
         if (nextChapterLink.scrollIntoView) {
            nextChapterLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
         }
         
         const randomDelay = Math.floor(Math.random() * 3000) + 3000;
         setTimeout(() => {
            triggerClick(nextChapterLink);
            setTimeout(() => { window._cx_auto_next_processing = false; }, 15000);
         }, randomDelay);
         return;
      }
    } catch (e) {}

    // 2. Strict Native 'Next' button (PRIORITY 2: Only strict matches to avoid deadlocks on fake UI elements)
    try {
      // Look for STRICT common Chaoxing "Next" buttons. Removed `.orientationright` which causes deadlocks.
      let nextBtn = searchRoot.querySelector('.jb_btn.prev_next.next, .prev_next.next');
      
      if (!nextBtn) {
         // Try to find buttons by exact text content "下一节" or "下一页"
         const allLinks = Array.from(searchRoot.querySelectorAll('a, button, .btn')).filter(el => {
            const text = el.innerText ? el.innerText.trim() : '';
            return text === '下一节' || text === '下一页' || text === '下一章';
         });
         for (const el of allLinks) {
            if (el.offsetWidth > 0 && el.offsetHeight > 0) {
               nextBtn = el;
               break;
            }
         }
      }

      if (nextBtn) {
         sendLog('检测到严格原生跳转按钮，将在 3~6 秒后安全跳转下一节...', 'info');
         const randomDelay = Math.floor(Math.random() * 3000) + 3000;
         setTimeout(() => {
             triggerClick(nextBtn);
             setTimeout(() => { window._cx_auto_next_processing = false; }, 15000);
         }, randomDelay);
         return;
      }
    } catch (e) {}

    // 3. Ultimate Fallback (Legacy API)
    try {
      const curChapterId = searchRoot.querySelector('#curChapterId');
      const curCourseId = searchRoot.querySelector('#curCourseId');
      const curClazzId = searchRoot.querySelector('#curClazzId');
      const count = searchRoot.querySelectorAll('#prev_tab .prev_ul li');
      
      if (curChapterId && curCourseId && curClazzId) {
         sendLog('准备使用底层 API 安全跳转下一节，等待 3~6 秒...', 'info');
         
         const randomDelay = Math.floor(Math.random() * 3000) + 3000;
         setTimeout(() => {
             const script = document.createElement('script');
             script.textContent = `
               try {
                 if (window.top && typeof window.top.PCount !== 'undefined' && window.top.PCount.next) {
                   window.top._preChapterId = '${curChapterId.value}';
                   window.top.PCount.next('${count.length}', '${curChapterId.value}', '${curCourseId.value}', '${curClazzId.value}', '');
                 }
               } catch (e) {}
             `;
             document.head.appendChild(script);
             setTimeout(() => script.remove(), 1000);
             setTimeout(() => { window._cx_auto_next_processing = false; }, 15000);
         }, randomDelay);
         
         return;
      }
    } catch (e) {}

    sendLog('❌ 未检测到下一章节，可能已全部刷完或目录结构异常，请手动翻页！', 'error');
    window._cx_auto_next_processing = false;

  }, Math.random() * 2000 + 1500); // Random delay 1.5s - 3.5s
}