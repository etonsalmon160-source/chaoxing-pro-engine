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

  document.body.appendChild(bubble);
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

  document.body.appendChild(widget);

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
  const isDocUrl = window.location.href.includes('/ppt/') || window.location.href.includes('/pdf/') || window.location.href.includes('/book/') || window.location.href.includes('/doc/') || window.location.href.includes('pdfViewer') || window.location.href.includes('ananas/modules/');
  const hasDocument = isDocUrl || document.querySelector('iframe[src*="ppt/"], iframe[src*="pdf/"], iframe[src*="book/"], iframe[src*="doc/"], iframe[src*="ananas/modules/"], .imglook, #viewerContainer, .turnpage_next, #nextBtn, [data-type="document"], [data-type="ppt"]');
  if (hasDocument) {
    setupDocumentAutomation();
  }

  // 3. Detect standalone Homework/Quiz Batch List (Continuous Homework Mode)
  if (settings.autoBatchHomework && isHomeworkOrTestInterface() && !document.querySelector('.TiMu, .topic-item')) {
    checkHomeworkBatchList();
  }
}

// 4. Video Automation Module
function setupVideoAutomation() {
  const video = document.querySelector('video');
  if (video) {
    let speedVal = settings.videoSpeed;
    if (settings.videoLoop) {
      speedVal = '1.0';
      if (!window._cx_loop_speed_warned) {
        window._cx_loop_speed_warned = true;
        sendLog('⚠️ [时长挂机保护] 检测到当前开启了“循环播放刷时长”模式。为了确保服务器端真实挂机时长安全累加（防范防作弊心跳过滤），已自动将播放速度调回 1.0x 正常倍速。', 'warn');
      }
    }

    sendLog(`检测到媒体播放器，正在注入加速配置 (${speedVal}x)...`, 'info');
    reportProgress(`▶ 视频 ${speedVal}x 播放`);
    injectPageScript();

    // Trigger dynamic speed update to the page context just in case
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('CX_SET_SETTINGS', {
        detail: { speed: speedVal, mute: settings.videoMute }
      }));
    }, 200);
    
    // Monitor for completion
    let reported = false;
    const checkEndInterval = setInterval(() => {
      if (video.ended) {
        if (settings.videoLoop) {
          sendLog('视频播放完毕，循环播放刷时长中...', 'info');
          reportProgress('🔄 循环播放刷时长中');
        } else if (!reported) {
          reported = true;
          clearInterval(checkEndInterval);
          sendLog('视频播放完成！', 'success');
          reportProgress('✅ 视频播放完毕');
          // Wait 3 seconds then go next task
          setTimeout(notifyTaskCompleted, 3000);
        }
      } else if (!video.paused && video.duration > 0) {
        const pct = Math.round((video.currentTime / video.duration) * 100);
        reportProgress(`▶ ${speedVal}x 播放中 (${pct}%)`);
      }
    }, 2000);
  } else {
    // If video is inside a sub-iframe, let injectScript run in its own context
    const videoIframe = document.querySelector('iframe[src*="video/index.html"]');
    if (videoIframe) {
      sendLog('发现视频嵌套框，正在同步倍速控制...', 'info');
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
    mute: settings.videoMute
  };
  script.dataset.settings = JSON.stringify(passConfig);

  (document.head || document.documentElement).appendChild(script);
}

// Helper to dynamically locate the scrollable container for PDF/Documents
function findScrollableContainer() {
  // 1. Check standard selectors first
  const common = document.querySelector('#viewerContainer, .imglook, #img, .scroll-container, .pdf-viewer, #pdf-viewer');
  if (common && common.scrollHeight > common.clientHeight && common.clientHeight > 0) {
    return common;
  }
  // 2. Search for any visible scrollable element in the document
  try {
    const all = document.querySelectorAll('*');
    for (const el of all) {
      if (el.clientHeight > 50 && el.scrollHeight > el.clientHeight + 20) {
        const style = window.getComputedStyle(el);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          return el;
        }
      }
    }
  } catch (e) {}
  
  // 3. Fallback
  return document.documentElement;
}

// Helper to locate all single-page container elements in PDF.js / Chaoxing document viewer
function getPageElements(rootDoc = document) {
  try {
    return rootDoc.querySelectorAll('.page, [data-page-number], .canvasWrapper, .image-wrap, .img-wrap');
  } catch (e) {
    return [];
  }
}

// 4.5 PPT / PDF / Document Reading Automation Module
function setupDocumentAutomation() {
  // Avoid re-running if already processing
  if (window._cx_document_processing) {
    // If we are processing, but the document became hidden, clear the interval to let it pause
    try {
      const rect = document.documentElement.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && window.innerWidth > 0 && window.innerHeight > 0;
      if (!isVisible && window._cx_doc_interval) {
        clearInterval(window._cx_doc_interval);
        window._cx_doc_interval = null;
        window._cx_document_processing = false;
        sendLog('📖 课件页面隐藏，已自动暂停翻页挂机。', 'info');
      }
    } catch (e) {}
    return;
  }

  // Same-origin completion check to prevent re-automating already finished tasks
  try {
    if (window.frameElement) {
      const parentCard = window.frameElement.parentElement;
      const jobIcon = parentCard ? parentCard.querySelector('.ans-job-icon') : null;
      if (jobIcon && (jobIcon.classList.contains('ans-job-icon-finished') || jobIcon.textContent.includes('任务已完成'))) {
        return; // Already completed, no need to run
      }
    }
  } catch (e) {}

  const docIframe = document.querySelector('iframe[src*="ppt/"], iframe[src*="pdf/"], iframe[src*="book/"], iframe[src*="doc/"], iframe[src*="ananas/modules/"]');
  const imgLook = document.querySelector('.imglook, #img, #viewerContainer, .mkhow_img, .turnpage_next, #nextBtn, .pdf-viewer');
  const isDocFrame = window.location.href.includes('/ppt/') || window.location.href.includes('/pdf/') || window.location.href.includes('/book/') || window.location.href.includes('/doc/') || window.location.href.includes('pdfViewer') || window.location.href.includes('ananas/modules/');

  // Check if docIframe is same-origin (penetration possible) or cross-origin (delegate to child)
  let canPenetrate = false;
  if (docIframe) {
    try {
      const testDoc = docIframe.contentDocument;
      if (testDoc) canPenetrate = true;
    } catch (e) {
      // Cross-origin: contentDocument access blocked by CORS
      canPenetrate = false;
    }
  }

  if (docIframe && canPenetrate) {
    // 1. Parent/wrapper frame with SAME-ORIGIN child: run penetration/proxy logic!
    try {
      const iframeRect = docIframe.getBoundingClientRect();
      const isVisible = iframeRect.width > 0 && iframeRect.height > 0;
      if (!isVisible) return;
    } catch (e) {
      return;
    }

    window._cx_document_processing = true;
    window._cx_doc_start_time = Date.now();
    window._cx_doc_current_page_idx = 0;
    sendLog('📖 [课件阅读模块] 检测到同源嵌套课件，正在建立穿透检测监控...', 'info');

    window._cx_doc_interval = setInterval(() => {
      // Global engine running state guard
      if (settings.engineRunning === false) {
        clearInterval(window._cx_doc_interval);
        window._cx_doc_interval = null;
        window._cx_document_processing = false;
        sendLog('📖 [课件阅读模块] 引擎已暂停，穿透阅读挂机中止。', 'info');
        return;
      }

      // Visibility check for iframe in parent frame
      try {
        const iframeRect = docIframe.getBoundingClientRect();
        const isVisible = iframeRect.width > 0 && iframeRect.height > 0;
        if (!isVisible) {
          clearInterval(window._cx_doc_interval);
          window._cx_doc_interval = null;
          window._cx_document_processing = false;
          sendLog('📖 [课件阅读模块] 课件卡片已切换至后台，穿透监控暂停...', 'info');
          return;
        }
      } catch (e) {
        return;
      }

      try {
        const subDoc = docIframe.contentDocument || (docIframe.contentWindow && docIframe.contentWindow.document);
        if (subDoc) {
          const pageCountEl = subDoc.querySelector('#allPage, .allPage, #pageCount, .total-page, span.all, #totalPage, .totalPage, span.num_total, #numPages');
          const curPageEl = subDoc.querySelector('#curPage, .curPage, #pageNo, .current-page, span.cur, #currentPage, .currentPage, span.num_cur, #pageNumber');
          let total = 0, cur = 0;

          if (pageCountEl && pageCountEl.textContent) {
            total = parseInt(pageCountEl.textContent.replace(/[^\d]/g, '').trim(), 10) || 0;
          }
          if (curPageEl) {
            if (curPageEl.tagName === 'INPUT') {
              cur = parseInt(curPageEl.value || '', 10) || 0;
            } else if (curPageEl.textContent) {
              cur = parseInt(curPageEl.textContent.replace(/[^\d]/g, '').trim(), 10) || 0;
            }
          }

          let hasPageElements = !!(pageCountEl || curPageEl);
          if (hasPageElements && total === 0) {
            window._cx_doc_total_zero_ticks = (window._cx_doc_total_zero_ticks || 0) + 1;
            if (window._cx_doc_total_zero_ticks < 3) {
              reportProgress('📖 正在载入课件页数...');
              return;
            }
            hasPageElements = false;
          }

          const pages = getPageElements(subDoc);
          const viewer = subDoc.querySelector('#viewerContainer, .imglook, #img, .scroll-container, .pdf-viewer, #pdf-viewer') || subDoc.documentElement;

          if (pages.length === 0 && !hasPageElements && (!viewer || viewer.scrollHeight <= 150)) {
            window._cx_doc_empty_ticks = (window._cx_doc_empty_ticks || 0) + 1;
            if (window._cx_doc_empty_ticks < 3) {
              reportProgress('📖 正在载入文档内容...');
              return;
            }
          }

          // Case A: Penetrated page-by-page scrolling
          if (pages.length > 0) {
            if (window._cx_doc_current_page_idx === undefined) {
              window._cx_doc_current_page_idx = 0;
            }

            if (window._cx_doc_current_page_idx < pages.length) {
              const targetPage = pages[window._cx_doc_current_page_idx];
              targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
              
              if (viewer) {
                viewer.dispatchEvent(new Event('scroll', { bubbles: true }));
              }
              reportProgress(`📖 穿透阅读第 ${window._cx_doc_current_page_idx + 1}/${total || pages.length} 页`);
              sendLog(`[课件穿透] 正在滑动阅读第 ${window._cx_doc_current_page_idx + 1}/${total || pages.length} 页...`, 'info');
              
              if (window._cx_doc_current_page_idx < pages.length - 1 || pages.length >= total) {
                window._cx_doc_current_page_idx++;
              }
              return;
            } else {
              const elapsed = Date.now() - window._cx_doc_start_time;
              if (elapsed < 5000) return;
              if (total > 0 && cur < total) return;

              clearInterval(window._cx_doc_interval);
              window._cx_doc_interval = null;
              window._cx_doc_current_page_idx = 0;
              sendLog('✅ [课件阅读模块] 穿透检测到 PPT / 文档已逐页滑毕，打卡完成！', 'success');
              reportProgress('✅ 课件阅读完毕');
              setTimeout(notifyTaskCompleted, 3000);
              return;
            }
          }

          // Case B: Penetrated button next page
          const nextBtn = subDoc.querySelector('#nextBtn, .turnpage_next, .next-btn, .pageBtn.next, a.next, .imglook .next, .turnpage_right, #next, .btn-next, .page-next, #pageNext, .ppt_next, [data-cmd="next"], .nav-btn.next, [class*="nextPage"], [id*="nextPage"]');
          if (nextBtn && nextBtn.style.display !== 'none' && !nextBtn.disabled) {
            if (total > 0 && cur >= total) {
              const elapsed = Date.now() - window._cx_doc_start_time;
              if (elapsed < 5000) return;
              clearInterval(window._cx_doc_interval);
              window._cx_doc_interval = null;
              sendLog('✅ [课件阅读模块] 穿透检测 PPT 翻页已完成！', 'success');
              reportProgress('✅ 课件阅读完毕');
              setTimeout(notifyTaskCompleted, 3000);
              return;
            }
            nextBtn.click();
            reportProgress('📖 正在穿透翻页 PPT');
            return;
          }

          // Case C: Penetrated scroll steps
          if (viewer && (viewer.scrollHeight - viewer.scrollTop > viewer.clientHeight + 30)) {
            const scrollStep = Math.max(300, Math.round(viewer.clientHeight * 0.8));
            if (viewer === subDoc.documentElement || viewer === subDoc.body) {
              if (docIframe.contentWindow) {
                docIframe.contentWindow.scrollBy(0, scrollStep);
              }
            } else {
              viewer.scrollTop += scrollStep;
            }
            viewer.dispatchEvent(new Event('scroll', { bubbles: true }));
            reportProgress('📖 穿透下滑文档阅读中');
            return;
          }

          // Scroll completion check inside iframe
          if (viewer && (viewer.scrollHeight - viewer.scrollTop <= viewer.clientHeight + 30)) {
            if (total && cur < total) return;
            const elapsed = Date.now() - window._cx_doc_start_time;
            if (elapsed < 5000) return;

            clearInterval(window._cx_doc_interval);
            window._cx_doc_interval = null;
            sendLog('✅ [课件阅读模块] 穿透检测到 PPT / 文档已滑动阅读完毕，打卡完成！', 'success');
            reportProgress('✅ 课件阅读完毕');
            setTimeout(notifyTaskCompleted, 3000);
          }
        }
      } catch (e) {
        clearInterval(window._cx_doc_interval);
        window._cx_doc_interval = null;
        window._cx_document_processing = false;
      }
    }, 3000);
  } else if (docIframe && !canPenetrate) {
    // 1b. Parent frame with CROSS-ORIGIN child iframe: delegate entirely to child's content script
    window._cx_document_processing = true;
    sendLog('📖 [课件阅读模块] 检测到跨域嵌套课件 (ananas)，已委托子框架内容脚本自主处理阅读与打卡。', 'info');
    // The child frame runs its own content script instance which will:
    // 1. Detect isDocFrame=true via its own URL
    // 2. Run local scrolling / page-turning
    // 3. Call notifyTaskCompleted() which sends CX_TASK_COMPLETED to window.top
    // 4. finish_hook.js in the child calls finishJob()/greenligth() in page context
    // We don't need to do anything else here.
  } else if (imgLook || isDocFrame) {
    // 2. Terminal child frame: run local scrolling logic!
    try {
      const rect = document.documentElement.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && window.innerWidth > 0 && window.innerHeight > 0;
      if (!isVisible) return;
    } catch (e) {
      return;
    }

    window._cx_document_processing = true;
    window._cx_doc_start_time = Date.now();
    window._cx_doc_current_page_idx = 0;
    sendLog('📖 [课件阅读模块] 正在执行 PPT / PDF 逐页渐进阅读与打卡模拟...', 'info');
    reportProgress('📖 课件翻页阅读中');

    window._cx_doc_interval = setInterval(() => {
      try {
        // Global engine running state guard
        if (settings.engineRunning === false) {
          clearInterval(window._cx_doc_interval);
          window._cx_doc_interval = null;
          window._cx_document_processing = false;
          sendLog('📖 [课件阅读模块] 引擎已暂停，阅读挂机中止。', 'info');
          return;
        }

        // Visibility Guard check inside interval
        const rect = document.documentElement.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && window.innerWidth > 0 && window.innerHeight > 0;
        if (!isVisible) {
          clearInterval(window._cx_doc_interval);
          window._cx_doc_interval = null;
          window._cx_document_processing = false;
          sendLog('📖 [课件阅读模块] 课件卡片已切换至后台，自动翻页暂停...', 'info');
          return;
        }

        // 0. Check page numbers & reachedEnd (supporting both standard text tags and input fields in PDF.js)
