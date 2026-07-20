// popup.js - Chaoxing Pro Engine Controller with Multi-Model AI Support

const PROVIDER_PRESETS = {
  deepseek: {
    name: 'DeepSeek',
    url: 'https://api.deepseek.com/chat/completions',
    method: 'POST',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek-V3 (deepseek-chat)' },
      { id: 'deepseek-reasoner', label: 'DeepSeek-R1 (deepseek-reasoner)' }
    ],
    hint: 'DeepSeek 官方/兼容 API 密钥。系统自动填充 Bearer 鉴权和 OpenAI 兼容报文。',
    bodyTemplate: '{\n  "model": "{model}",\n  "messages": [\n    {"role": "system", "content": "你是一个在线网课辅助答题AI。请直接输出针对问题的简明准确答案（仅输出正确答案的选项字母或文本，不要解释说明）。"},\n    {"role": "user", "content": "{question}"}\n  ],\n  "temperature": 0.1\n}',
    path: 'choices[0].message.content'
  },
  openai: {
    name: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    method: 'POST',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini (高性价比/推荐)' },
      { id: 'gpt-4o', label: 'GPT-4o (全能旗舰)' },
      { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (经典极速)' },
      { id: 'o1-mini', label: 'o1-mini (推理强化)' }
    ],
    hint: 'OpenAI 官方或 OneAPI/中转代理 API Key。系统自动填充标准 Chat 报文。',
    bodyTemplate: '{\n  "model": "{model}",\n  "messages": [\n    {"role": "system", "content": "你是一个在线网课辅助答题AI。请直接输出针对问题的简明准确答案（仅输出正确答案的选项字母或文本，不要解释说明）。"},\n    {"role": "user", "content": "{question}"}\n  ],\n  "temperature": 0.1\n}',
    path: 'choices[0].message.content'
  },
  gemini: {
    name: 'Google Gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    method: 'POST',
    models: [
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (极速响应/推荐)' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (深度分析)' },
      { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Exp (前沿体验)' }
    ],
    hint: 'Google AI Studio 免费申请 API Key。系统自动适配 x-goog-api-key 与请求头。',
    bodyTemplate: '{\n  "contents": [\n    {\n      "parts": [\n        {"text": "你是一个在线网课辅助答题AI。请直接输出针对问题的简明准确答案（仅输出正确答案的选项字母或文本，不要解释说明）：\\n\\n问题：{question}"}\n      ]\n    }\n  ],\n  "generationConfig": {\n    "temperature": 0.1\n  }\n}',
    path: 'candidates[0].content.parts[0].text'
  },
  claude: {
    name: 'Anthropic Claude',
    url: 'https://api.anthropic.com/v1/messages',
    method: 'POST',
    models: [
      { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (顶级智商/推荐)' },
      { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (轻量快答)' }
    ],
    hint: 'Anthropic API Key。系统自动附加 x-api-key 与 anthropic-version 请求头。',
    bodyTemplate: '{\n  "model": "{model}",\n  "max_tokens": 1024,\n  "system": "你是一个在线网课辅助答题AI。请直接输出针对问题的简明准确答案（仅输出正确答案的选项字母或文本，不要解释说明）。",\n  "messages": [\n    {"role": "user", "content": "{question}"}\n  ],\n  "temperature": 0.1\n}',
    path: 'content[0].text'
  },
  custom: {
    name: '自定义',
    url: '',
    method: 'POST',
    models: [
      { id: 'custom-model', label: '自定义模型ID (请手动输入URL与模板)' }
    ],
    hint: '完全自定义接口模式。您可以自行编写 URL、HTTP 方法、Body JSON 模板与提取字段路径。',
    bodyTemplate: '{\n  "question": "{question}"\n}',
    path: 'data.answer'
  }
};

const DEFAULT_SETTINGS = {
  videoSpeed: '2.0',
  videoMute: true,
  videoLoop: false,
  quizEnable: true,
  apiProvider: 'deepseek',
  modelName: 'deepseek-chat',
  apiUrl: 'https://api.deepseek.com/chat/completions',
  apiKey: '',
  apiMethod: 'POST',
  apiBody: PROVIDER_PRESETS.deepseek.bodyTemplate,
  apiPath: PROVIDER_PRESETS.deepseek.path,
  quizSubmitMode: 'fill',
  autoNext: true,
  autoBatchHomework: false,
  actionDelay: 3
};

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const elVideoSpeed = document.getElementById('video-speed');
  const elVideoMute = document.getElementById('video-mute');
  const elVideoLoop = document.getElementById('video-loop');
  const elQuizEnable = document.getElementById('quiz-enable');
  const elQuizOptionsContainer = document.getElementById('quiz-options-container');
  const elApiProvider = document.getElementById('api-provider');
  const elModelSelect = document.getElementById('model-select');
  const elModelCustomInput = document.getElementById('model-custom-input');
  const elApiUrl = document.getElementById('api-url');
  const elApiKey = document.getElementById('api-key');
  const elApiMethod = document.getElementById('api-method');
  const elPostBodyGroup = document.getElementById('post-body-group');
  const elApiBody = document.getElementById('api-body');
  const elApiPath = document.getElementById('api-path');
  const elQuizSubmitMode = document.getElementById('quiz-submit-mode');
  const elAutoNext = document.getElementById('auto-next');
  const elAutoBatchHomework = document.getElementById('auto-batch-homework');
  const elActionDelay = document.getElementById('action-delay');
  const elActionDelayRange = document.getElementById('action-delay-range');
  const speedDisplay = document.getElementById('speed-display');
  const delayDisplay = document.getElementById('delay-display');
  const providerHint = document.getElementById('provider-hint');
  
  const btnSave = document.getElementById('btn-save');
  const btnTestApi = document.getElementById('btn-test-api');
  const saveStatus = document.getElementById('save-status');
  const testResult = document.getElementById('test-result');

  // 1. Tab Switching Logic
  const navTabs = document.querySelectorAll('.nav-tab');
  const panelSections = document.querySelectorAll('.panel-section');

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      panelSections.forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-target');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // 2. Speed Pills Logic
  const speedPills = document.querySelectorAll('.speed-pill');
  speedPills.forEach(pill => {
    pill.addEventListener('click', () => {
      speedPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const speed = pill.getAttribute('data-speed');
      elVideoSpeed.value = speed;
      if (speedDisplay) speedDisplay.innerText = `${speed}x`;
    });
  });

  function updateSpeedPills(speed) {
    if (speedDisplay) speedDisplay.innerText = `${speed}x`;
    speedPills.forEach(p => {
      if (p.getAttribute('data-speed') === speed) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  }

  // 3. Password Reveal Button
  const btnRevealKey = document.getElementById('btn-reveal-key');
  if (btnRevealKey && elApiKey) {
    btnRevealKey.addEventListener('click', () => {
      elApiKey.type = elApiKey.type === 'password' ? 'text' : 'password';
    });
  }

  // 4. Delay Slider & Number Sync
  if (elActionDelayRange && elActionDelay) {
    elActionDelayRange.addEventListener('input', (e) => {
      elActionDelay.value = e.target.value;
      if (delayDisplay) delayDisplay.innerText = `${e.target.value} 秒`;
    });
    elActionDelay.addEventListener('input', (e) => {
      elActionDelayRange.value = e.target.value;
      if (delayDisplay) delayDisplay.innerText = `${e.target.value} 秒`;
    });
  }

  // 5. AI Provider Pills & Switcher Logic
  const providerPills = document.querySelectorAll('.provider-pill');
  const advancedOptions = document.getElementById('advanced-api-options');
  const btnToggleAdvanced = document.getElementById('btn-toggle-advanced');

  if (btnToggleAdvanced && advancedOptions) {
    btnToggleAdvanced.addEventListener('click', () => {
      const isHidden = advancedOptions.style.display === 'none';
      advancedOptions.style.display = isHidden ? 'flex' : 'none';
      btnToggleAdvanced.classList.toggle('open', isHidden);
    });
  }

  providerPills.forEach(pill => {
    pill.addEventListener('click', () => {
      providerPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const providerKey = pill.getAttribute('data-provider');
      elApiProvider.value = providerKey;
      applyProviderPreset(providerKey, false);
    });
  });

  function applyProviderPreset(providerKey, isInitialization) {
    const preset = PROVIDER_PRESETS[providerKey] || PROVIDER_PRESETS.deepseek;
    if (providerHint) providerHint.innerText = preset.hint;

    // Update Model Dropdown
    if (elModelSelect) {
      elModelSelect.innerHTML = '';
      preset.models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.innerText = m.label;
        elModelSelect.appendChild(opt);
      });
    }

    if (!isInitialization) {
      const firstModel = preset.models[0] ? preset.models[0].id : '';
      if (elModelSelect && firstModel) elModelSelect.value = firstModel;
      
      // Auto fill URL, method, body, path
      let targetUrl = preset.url;
      if (targetUrl.includes('{model}') && firstModel) {
        targetUrl = targetUrl.replace('{model}', firstModel);
      }
      elApiUrl.value = targetUrl;
      elApiMethod.value = preset.method;
      
      let targetBody = preset.bodyTemplate;
      if (targetBody.includes('{model}') && firstModel) {
        targetBody = targetBody.replace('{model}', firstModel);
      }
      elApiBody.value = targetBody;
      elApiPath.value = preset.path;
      togglePostBody(preset.method);
    }

    // If custom, show advanced options right away
    if (advancedOptions && btnToggleAdvanced) {
      if (providerKey === 'custom') {
        advancedOptions.style.display = 'flex';
        btnToggleAdvanced.classList.add('open');
      } else if (!isInitialization) {
        advancedOptions.style.display = 'none';
        btnToggleAdvanced.classList.remove('open');
      }
    }
  }

  // When model dropdown changes, update URL or body if they contain {model} or previous model
  if (elModelSelect) {
    elModelSelect.addEventListener('change', () => {
      const selectedModel = elModelSelect.value;
      const providerKey = elApiProvider.value || 'deepseek';
      const preset = PROVIDER_PRESETS[providerKey];
      if (!preset) return;

      // Update URL if it's gemini style with {model}
      if (preset.url.includes('{model}')) {
        elApiUrl.value = preset.url.replace('{model}', selectedModel);
      } else {
        // Also check if current URL has old model inside
        preset.models.forEach(m => {
          if (elApiUrl.value.includes(m.id)) {
            elApiUrl.value = elApiUrl.value.replace(m.id, selectedModel);
          }
        });
      }

      // Update Body template model
      let bodyText = elApiBody.value;
      try {
        const bodyObj = JSON.parse(bodyText);
        if (bodyObj && bodyObj.model) {
          bodyObj.model = selectedModel;
          elApiBody.value = JSON.stringify(bodyObj, null, 2);
        }
      } catch (e) {
        // If not JSON or custom, just replace token if exists
      }
    });
  }

  // 6. Load Settings from Storage
  chrome.storage.local.get(DEFAULT_SETTINGS, (settings) => {
    elVideoSpeed.value = settings.videoSpeed;
    updateSpeedPills(settings.videoSpeed);
    
    elVideoMute.checked = settings.videoMute;
    elVideoLoop.checked = settings.videoLoop;
    elQuizEnable.checked = settings.quizEnable;
    
    // Provider & Model
    const provider = settings.apiProvider || 'deepseek';
    elApiProvider.value = provider;
    providerPills.forEach(p => {
      if (p.getAttribute('data-provider') === provider) p.classList.add('active');
      else p.classList.remove('active');
    });
    applyProviderPreset(provider, true);
    
    if (elModelSelect && settings.modelName) {
      // Check if saved model exists in dropdown
      let exists = false;
      for (let i = 0; i < elModelSelect.options.length; i++) {
        if (elModelSelect.options[i].value === settings.modelName) exists = true;
      }
      if (!exists && settings.modelName) {
        const opt = document.createElement('option');
        opt.value = settings.modelName;
        opt.innerText = `${settings.modelName} (已保存)`;
        elModelSelect.appendChild(opt);
      }
      elModelSelect.value = settings.modelName;
    }

    elApiUrl.value = settings.apiUrl;
    elApiKey.value = settings.apiKey;
    elApiMethod.value = settings.apiMethod;
    elApiBody.value = settings.apiBody;
    elApiPath.value = settings.apiPath;
    elQuizSubmitMode.value = settings.quizSubmitMode;
    elAutoNext.checked = settings.autoNext;
    if (elAutoBatchHomework) elAutoBatchHomework.checked = !!settings.autoBatchHomework;
    
    elActionDelay.value = settings.actionDelay;
    if (elActionDelayRange) elActionDelayRange.value = settings.actionDelay;
    if (delayDisplay) delayDisplay.innerText = `${settings.actionDelay} 秒`;

    toggleQuizOptions(settings.quizEnable);
    togglePostBody(settings.apiMethod);
  });

  // Toggle Quiz options visibility
  elQuizEnable.addEventListener('change', (e) => {
    toggleQuizOptions(e.target.checked);
  });

  function toggleQuizOptions(visible) {
    if (elQuizOptionsContainer) {
      elQuizOptionsContainer.style.display = visible ? 'flex' : 'none';
    }
  }

  // Toggle POST body visibility
  elApiMethod.addEventListener('change', (e) => {
    togglePostBody(e.target.value);
  });

  function togglePostBody(method) {
    if (elPostBodyGroup) {
      elPostBodyGroup.style.display = method === 'POST' ? 'flex' : 'none';
    }
  }

  // 7. Save Settings
  btnSave.addEventListener('click', () => {
    const settings = {
      videoSpeed: elVideoSpeed.value,
      videoMute: elVideoMute.checked,
      videoLoop: elVideoLoop.checked,
      quizEnable: elQuizEnable.checked,
      apiProvider: elApiProvider.value || 'deepseek',
      modelName: elModelSelect ? elModelSelect.value : 'deepseek-chat',
      apiUrl: elApiUrl.value.trim(),
      apiKey: elApiKey.value.trim(),
      apiMethod: elApiMethod.value,
      apiBody: elApiBody.value,
      apiPath: elApiPath.value.trim(),
      quizSubmitMode: elQuizSubmitMode.value,
      autoNext: elAutoNext.checked,
      autoBatchHomework: elAutoBatchHomework ? elAutoBatchHomework.checked : false,
      actionDelay: parseInt(elActionDelay.value, 10) || 3
    };

    chrome.storage.local.set(settings, () => {
      showStatus('✨ 所有配置（含模型切换与参数）已保存生效！', 'success');
    });
  });

  // 7.5 Restore Widget & Engine Action
  const btnRestoreWidget = document.getElementById('btn-restore-widget');
  if (btnRestoreWidget) {
    btnRestoreWidget.addEventListener('click', () => {
      const resetParams = {
        engineRunning: true,
        widgetMinimized: false,
        widgetPosTop: '24px',
        widgetPosLeft: ''
      };
      
      chrome.storage.local.set(resetParams, () => {
        showStatus('✨ 控制台已重置恢复，自动化引擎已重新启动！', 'success');
        
        // Notify tabs to restore their widgets
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, { type: 'CX_RESTORE_WIDGET' }, () => {
                // Ignore runtime errors for tabs without content scripts
                if (chrome.runtime.lastError) { /* ignore */ }
              });
            }
          });
        });
      });
    });
  }

  function showStatus(text, type) {
    saveStatus.innerText = text;
    saveStatus.className = `save-toast ${type}`;
    setTimeout(() => {
      saveStatus.innerText = '';
      saveStatus.className = 'save-toast';
    }, 2500);
  }

  // 8. Test API connection with Smart Model Adaptation
  btnTestApi.addEventListener('click', () => {
    const testQuestion = '中国首都是哪里？';
    const provider = elApiProvider.value || 'deepseek';
    const model = elModelSelect ? elModelSelect.value : '';
    const urlInput = elApiUrl.value.trim();
    const method = elApiMethod.value;
    const key = elApiKey.value.trim();
    const bodyTemplate = elApiBody.value;
    const path = elApiPath.value.trim();

    if (!urlInput) {
      showTestResult('⚠️ 错误：请先核对并填写正确的 API 请求 URL 节点地址', 'error');
      return;
    }

    testResult.style.display = 'block';
    testResult.className = 'console-box';
    testResult.innerText = `⚡ [API Sandbox - ${provider.toUpperCase()}] 发起模拟答题测试...\n> Target Model: ${model || 'default'}\n> Target Endpoint: ${urlInput.substring(0, 50)}...`;

    // Build intelligent headers based on provider
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
      finalUrl = finalUrl.replace('{question}', encodeURIComponent(testQuestion));
    } else {
      try {
        let replacedText = bodyTemplate.replace('{question}', testQuestion);
        if (model && replacedText.includes('{model}')) {
          replacedText = replacedText.replace('{model}', model);
        }
        finalBody = JSON.parse(replacedText);
        // Ensure model field is set correctly for chat completions
        if (finalBody && typeof finalBody === 'object' && !finalBody.model && (provider === 'deepseek' || provider === 'openai' || provider === 'claude')) {
          finalBody.model = model;
        }
      } catch (e) {
        showTestResult(`❌ JSON Request Body 解析报错: ${e.message}\n请检查底层的 JSON 模板格式是否正确。`, 'error');
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
      if (chrome.runtime.lastError) {
        showTestResult(`❌ 扩展通信层异常: ${chrome.runtime.lastError.message}`, 'error');
        return;
      }

      if (!response || !response.success) {
        showTestResult(`❌ API 调用请求失败: ${response ? response.error : '连接超时或网络受限 (请核对 API Key 是否正确)'}`, 'error');
        return;
      }

      const jsonResp = response.data;
      const extractedAnswer = getValueByPath(jsonResp, path);

      let textOutput = `✔ HTTP 200/SUCCESS 返回成功原文:\n${JSON.stringify(jsonResp, null, 2)}\n\n`;
      if (extractedAnswer !== undefined) {
        let cleanAns = String(extractedAnswer).trim().replace(/^['"]|['"]$/g, '').replace(/\*\*([^*]+)\*\*/g, '$1');
        textOutput += `✨ [极速匹配成功] 智能答题解析结果: 👉 "${cleanAns}"`;
        showTestResult(textOutput, 'success');
      } else {
        textOutput += `⚠ [字段提取失败] 路径 "${path}" 未能定位答案字段。请根据上述返回的 JSON 树调整提取路径。`;
        showTestResult(textOutput, 'error');
      }
    });
  });

  function showTestResult(text, type) {
    testResult.style.display = 'block';
    testResult.className = `console-box ${type}`;
    testResult.innerText = text;
  }

  function getValueByPath(obj, path) {
    if (!path) return obj;
    try {
      return path.split('.').reduce((acc, part) => {
        if (acc === null || acc === undefined) return undefined;
        const match = part.match(/^(\w+)\[(\d+)\]$/);
        if (match) {
          const key = match[1];
          const index = parseInt(match[2], 10);
          return acc[key] ? acc[key][index] : undefined;
        }
        return acc[part];
      }, obj);
    } catch (e) {
      return undefined;
    }
  }

  // --- Dashboard Logic ---
  const elEngineStatus = document.getElementById('popup-engine-status');
  const elEngineBadge = document.getElementById('popup-engine-badge');
  const elProgressStatus = document.getElementById('popup-progress-status');
  const elLogContainer = document.getElementById('popup-log-container');
  const btnToggleEngine = document.getElementById('popup-btn-toggle');
  const btnSkipChapter = document.getElementById('popup-btn-skip');

  // Load initial dashboard state
  chrome.storage.local.get({
    engineRunning: true,
    currentProgress: '等待扫描...',
    recentLogs: []
  }, (res) => {
    updateEngineUI(res.engineRunning);
    if (elProgressStatus) elProgressStatus.innerText = res.currentProgress;
    renderLogs(res.recentLogs || []);
  });

  // Render logs utility
  function renderLogs(logs) {
    if (!elLogContainer) return;
    elLogContainer.innerHTML = '';
    logs.forEach(log => {
      const entry = document.createElement('div');
      entry.className = `cx-log-entry ${log.level || 'info'}`;
      entry.innerText = log.text;
      elLogContainer.appendChild(entry);
    });
    elLogContainer.scrollTop = elLogContainer.scrollHeight;
  }

  // Update engine status UI
  function updateEngineUI(running) {
    if (elEngineStatus) {
      elEngineStatus.innerText = running ? '运行中' : '已暂停';
      elEngineStatus.style.color = running ? '#10B981' : '#EF4444';
    }
    if (elEngineBadge) {
      elEngineBadge.innerText = running ? '全速运行' : '引擎暂停';
      elEngineBadge.style.background = running ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      elEngineBadge.style.color = running ? '#34D399' : '#F87171';
    }
    if (btnToggleEngine) {
      btnToggleEngine.innerText = running ? '暂停引擎' : '▶ 启动引擎';
      if (running) {
        btnToggleEngine.classList.remove('paused');
      } else {
        btnToggleEngine.classList.add('paused');
      }
    }
  }

  // Toggle Engine Click
  if (btnToggleEngine) {
    btnToggleEngine.addEventListener('click', () => {
      chrome.storage.local.get({ engineRunning: true }, (res) => {
        const nextState = !res.engineRunning;
        chrome.storage.local.set({ engineRunning: nextState }, () => {
          updateEngineUI(nextState);
        });
      });
    });
  }

  // Skip Chapter Click
  if (btnSkipChapter) {
    btnSkipChapter.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab && activeTab.id) {
          chrome.tabs.sendMessage(activeTab.id, { type: 'CX_SKIP_CHAPTER' }, () => {
            if (chrome.runtime.lastError) {
              // Ignore or show alert
            }
          });
        }
      });
    });
  }

  // Listen for storage changes to sync dashboard in real-time
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes.engineRunning !== undefined) {
        updateEngineUI(changes.engineRunning.newValue);
      }
      if (changes.currentProgress !== undefined) {
        if (elProgressStatus) elProgressStatus.innerText = changes.currentProgress.newValue;
      }
      if (changes.recentLogs !== undefined) {
        renderLogs(changes.recentLogs.newValue || []);
      }
    }
  });
});
