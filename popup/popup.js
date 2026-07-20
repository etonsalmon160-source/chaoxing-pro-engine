// popup.js - Chaoxing Pro Engine Controller with Multi-Model AI Support

const PROVIDER_PRESETS = {
  deepseek: {
    name: 'DeepSeek',
    url: 'https://api.deepseek.com/chat/completions',
    modelsUrl: 'https://api.deepseek.com/models',
    method: 'POST',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek-V3 (deepseek-chat 旗舰问答)' },
      { id: 'deepseek-reasoner', label: 'DeepSeek-R1 (deepseek-reasoner 深度推理)' }
    ],
    hint: 'DeepSeek 官方 API Key。默认搭载 V3 与 R1 深度推理大模型。',
    bodyTemplate: '{\n  "model": "{model}",\n  "messages": [\n    {"role": "system", "content": "你是一个在线网课辅助答题AI。请直接输出针对问题的简明准确答案（仅输出正确答案的选项字母或文本，不要解释说明）。"},\n    {"role": "user", "content": "{question}"}\n  ],\n  "temperature": 0.1\n}',
    path: 'choices[0].message.content'
  },
  openai: {
    name: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    modelsUrl: 'https://api.openai.com/v1/models',
    method: 'POST',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o (全能旗舰)' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini (极速/推荐)' },
      { id: 'o3-mini', label: 'o3-mini (前沿推理)' },
      { id: 'o1', label: 'o1 (深度思考)' },
      { id: 'o1-mini', label: 'o1-mini (轻量推理)' },
      { id: 'gpt-4.5-preview', label: 'GPT-4.5 Preview' }
    ],
    hint: 'OpenAI 官方或 OneAPI/中转代理 API Key。',
    bodyTemplate: '{\n  "model": "{model}",\n  "messages": [\n    {"role": "system", "content": "你是一个在线网课辅助答题AI。请直接输出针对问题的简明准确答案（仅输出正确答案的选项字母或文本，不要解释说明）。"},\n    {"role": "user", "content": "{question}"}\n  ],\n  "temperature": 0.1\n}',
    path: 'choices[0].message.content'
  },
  gemini: {
    name: 'Google Gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    modelsUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    method: 'POST',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (2025新一代极速/推荐)' },
      { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (轻量快答)' },
      { id: 'gemini-2.0-pro-exp-02-05', label: 'Gemini 2.0 Pro Exp (深度分析)' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (经典极速)' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
    ],
    hint: 'Google AI Studio 免费申请 API Key。系统自动适配 x-goog-api-key。',
    bodyTemplate: '{\n  "contents": [\n    {\n      "parts": [\n        {"text": "你是一个在线网课辅助答题AI。请直接输出针对问题的简明准确答案（仅输出正确答案的选项字母或文本，不要解释说明）：\\n\\n问题：{question}"}\n      ]\n    }\n  ],\n  "generationConfig": {\n    "temperature": 0.1\n  }\n}',
    path: 'candidates[0].content.parts[0].text'
  },
  claude: {
    name: 'Anthropic Claude',
    url: 'https://api.anthropic.com/v1/messages',
    modelsUrl: 'https://api.anthropic.com/v1/models',
    method: 'POST',
    models: [
      { id: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet (2025前沿旗舰/推荐)' },
      { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (轻量极速)' }
    ],
    hint: 'Anthropic API Key。系统自动附加 x-api-key 与 anthropic-version。',
    bodyTemplate: '{\n  "model": "{model}",\n  "max_tokens": 1024,\n  "system": "你是一个在线网课辅助答题AI。请直接输出针对问题的简明准确答案（仅输出正确答案的选项字母或文本，不要解释说明）。",\n  "messages": [\n    {"role": "user", "content": "{question}"}\n  ],\n  "temperature": 0.1\n}',
    path: 'content[0].text'
  },
  siliconflow: {
    name: 'SiliconFlow 硅基流动',
    url: 'https://api.siliconflow.cn/v1/chat/completions',
    modelsUrl: 'https://api.siliconflow.cn/v1/models',
    method: 'POST',
    models: [
      { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1 (硅基满血/推荐)' },
      { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3 (硅基满血)' },
      { id: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen 2.5 72B Instruct' }
    ],
    hint: '硅基流动官方 API Key。支持一键点击“自动识别”拉取上百个可用模型！',
    bodyTemplate: '{\n  "model": "{model}",\n  "messages": [\n    {"role": "system", "content": "你是一个在线网课辅助答题AI。请直接输出针对问题的简明准确答案（仅输出正确答案的选项字母或文本，不要解释说明）。"},\n    {"role": "user", "content": "{question}"}\n  ],\n  "temperature": 0.1\n}',
    path: 'choices[0].message.content'
  },
  qwen: {
    name: '通义千问 Qwen',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    modelsUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/models',
    method: 'POST',
    models: [
      { id: 'qwen-max', label: 'Qwen-Max (阿里旗舰)' },
      { id: 'qwen-plus', label: 'Qwen-Plus (均衡推荐)' },
      { id: 'qwen-qwq-32b', label: 'QwQ-32B (推理模型)' },
      { id: 'qwen-turbo', label: 'Qwen-Turbo (极速)' }
    ],
    hint: '阿里云 DashScope API Key (兼容 OpenAI 协议)。',
    bodyTemplate: '{\n  "model": "{model}",\n  "messages": [\n    {"role": "system", "content": "你是一个在线网课辅助答题AI。请直接输出针对问题的简明准确答案（仅输出正确答案的选项字母或文本，不要解释说明）。"},\n    {"role": "user", "content": "{question}"}\n  ],\n  "temperature": 0.1\n}',
    path: 'choices[0].message.content'
  },
  custom: {
    name: '自定义 / OneAPI 中转',
    url: '',
    modelsUrl: '',
    method: 'POST',
    models: [
      { id: 'custom-model', label: '自定义模型ID (输入 URL 和 Key 后点击“自动识别”)' }
    ],
    hint: '完全自定义接口模式。输入 URL 和 Key 后点击“自动识别模型”即可在线抓取。',
    bodyTemplate: '{\n  "model": "{model}",\n  "messages": [\n    {"role": "user", "content": "{question}"}\n  ]\n}',
    path: 'choices[0].message.content'
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

  // 6. Launch Big Window & Master Control Bar
  const btnOpenBigWindow = document.getElementById('btn-open-big-window');
  if (btnOpenBigWindow) {
    btnOpenBigWindow.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
    });
  }

  const btnMasterToggle = document.getElementById('btn-master-toggle');
  const btnRestoreWidget = document.getElementById('btn-restore-widget');
  const btnPopupSkip = document.getElementById('btn-popup-skip');

  function updateMasterToggleUI(isRunning) {
    if (!btnMasterToggle) return;
    if (isRunning) {
      btnMasterToggle.className = 'btn-master-toggle active';
      btnMasterToggle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> <span>暂停挂机引擎</span>';
    } else {
      btnMasterToggle.className = 'btn-master-toggle paused';
      btnMasterToggle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> <span>启动全自动引擎</span>';
    }
  }

  chrome.storage.local.get({ engineRunning: true }, (res) => {
    updateMasterToggleUI(res.engineRunning !== false);
  });

  if (btnMasterToggle) {
    btnMasterToggle.addEventListener('click', () => {
      chrome.storage.local.get({ engineRunning: true }, (res) => {
        const nextState = !(res.engineRunning !== false);
        chrome.storage.local.set({ engineRunning: nextState }, () => {
          updateMasterToggleUI(nextState);
          if (saveStatus) {
            saveStatus.innerText = nextState ? '🚀 全自动挂机引擎已成功启动！' : '⏸ 挂机引擎已手动挂起暂停';
            saveStatus.className = 'save-toast show';
            setTimeout(() => { saveStatus.className = 'save-toast'; }, 2000);
          }
        });
      });
    });
  }

  if (btnRestoreWidget) {
    btnRestoreWidget.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'CX_RESTORE_WIDGET' }, () => {
            if (chrome.runtime.lastError) {}
          });
        }
      });
      chrome.storage.local.set({ engineRunning: true }, () => {
        updateMasterToggleUI(true);
        if (saveStatus) {
          saveStatus.innerText = '📌 已向左侧网页发送指令：已恢复小窗并启动引擎！';
          saveStatus.className = 'save-toast show';
          setTimeout(() => { saveStatus.className = 'save-toast'; }, 2200);
        }
      });
    });
  }

  if (btnPopupSkip) {
    btnPopupSkip.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'CX_SKIP_CHAPTER' });
        }
      });
      if (saveStatus) {
        saveStatus.innerText = '⚡ 已触发手动跨越至下一章节指令！';
        saveStatus.className = 'save-toast show';
        setTimeout(() => { saveStatus.className = 'save-toast'; }, 2000);
      }
    });
  }

  // 7. Real-time Log Console Logic
  const popupLogConsole = document.getElementById('popup-log-console');
  const btnClearLogs = document.getElementById('btn-clear-logs');
  const btnCopyLogs = document.getElementById('btn-copy-logs');
  const filterBtns = document.querySelectorAll('.log-filter-btn');
  let currentLogFilter = 'all';
  let cachedLogs = [];

  function renderPopupLogs() {
    if (!popupLogConsole) return;
    chrome.storage.local.get({ recentLogs: [] }, (data) => {
      cachedLogs = data.recentLogs || [];
      updateLogDisplay();
    });
  }

  function updateLogDisplay() {
    if (!popupLogConsole) return;
    if (cachedLogs.length === 0) {
      popupLogConsole.innerHTML = '<div class="log-empty-tip">暂无运行日志，请在超星学习通页面开启自动化...</div>';
      return;
    }

    const filtered = cachedLogs.filter(item => {
      if (currentLogFilter === 'all') return true;
      return item.level === currentLogFilter;
    });

    if (filtered.length === 0) {
      popupLogConsole.innerHTML = `<div class="log-empty-tip">无符合分类 "${currentLogFilter}" 的日志条目</div>`;
      return;
    }

    popupLogConsole.innerHTML = '';
    filtered.forEach(log => {
      const line = document.createElement('div');
      line.className = `popup-log-item ${log.level || 'info'}`;
      line.textContent = log.text;
      popupLogConsole.appendChild(line);
    });

    popupLogConsole.scrollTop = popupLogConsole.scrollHeight;
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLogFilter = btn.getAttribute('data-filter') || 'all';
      updateLogDisplay();
    });
  });

  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', () => {
      chrome.storage.local.set({ recentLogs: [] }, () => {
        cachedLogs = [];
        updateLogDisplay();
        if (saveStatus) {
          saveStatus.innerText = '🧹 已成功清空所有日志记录！';
          saveStatus.className = 'save-toast show';
          setTimeout(() => { saveStatus.className = 'save-toast'; }, 2000);
        }
      });
    });
  }

  if (btnCopyLogs) {
    btnCopyLogs.addEventListener('click', () => {
      if (cachedLogs.length === 0) return;
      const textToCopy = cachedLogs.map(l => l.text).join('\n');
      navigator.clipboard.writeText(textToCopy).then(() => {
        if (saveStatus) {
          saveStatus.innerText = '📋 运行日志已复制到剪贴板！';
          saveStatus.className = 'save-toast show';
          setTimeout(() => { saveStatus.className = 'save-toast'; }, 2000);
        }
      });
    });
  }

  // Live storage update listener for real-time log pushing
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.recentLogs) {
      cachedLogs = changes.recentLogs.newValue || [];
      updateLogDisplay();
    }
  });

  // Initial log render
  renderPopupLogs();

  // 8. About & Support Interactions
  const btnCopyEmail = document.getElementById('btn-copy-email');
  const btnOpenGithub = document.getElementById('btn-open-github');

  if (btnCopyEmail) {
    btnCopyEmail.addEventListener('click', () => {
      const email = 'etonsalmon160@gmail.com';
      navigator.clipboard.writeText(email).then(() => {
        if (saveStatus) {
          saveStatus.innerText = `📧 已复制开发者邮箱: ${email}`;
          saveStatus.className = 'save-toast show';
          setTimeout(() => { saveStatus.className = 'save-toast'; }, 2500);
        }
      });
    });
  }

  if (btnOpenGithub) {
    btnOpenGithub.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com/etonsalmon160-source/chaoxing-pro-engine' });
    });
  }

  // 9. Auto-Fetch Available Models Logic
  const btnFetchModels = document.getElementById('btn-fetch-models');
  if (btnFetchModels) {
    btnFetchModels.addEventListener('click', () => {
      const provider = elApiProvider.value;
      const key = elApiKey.value.trim();
      const currentUrl = elApiUrl.value.trim();
      const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.deepseek;

      let modelsEndpoint = preset.modelsUrl;

      // Smart endpoint detection for Custom / OneAPI / OpenAI proxies
      if (currentUrl) {
        if (currentUrl.includes('/chat/completions')) {
          modelsEndpoint = currentUrl.replace('/chat/completions', '/models');
        } else if (currentUrl.includes('/messages')) {
          modelsEndpoint = currentUrl.replace('/messages', '/models');
        } else if (provider === 'gemini' && currentUrl.includes('generateContent')) {
          modelsEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models';
        }
      }

      if (!modelsEndpoint) {
        modelsEndpoint = 'https://api.openai.com/v1/models';
      }

      const headers = { 'Content-Type': 'application/json' };
      if (key) {
        if (provider === 'claude') {
          headers['x-api-key'] = key;
          headers['anthropic-version'] = '2023-06-01';
        } else if (provider === 'gemini') {
          headers['x-goog-api-key'] = key;
        } else {
          headers['Authorization'] = key.startsWith('Bearer ') ? key : `Bearer ${key}`;
        }
      }

      if (provider === 'gemini' && key && !modelsEndpoint.includes('key=')) {
        modelsEndpoint += (modelsEndpoint.includes('?') ? '&' : '?') + `key=${encodeURIComponent(key)}`;
      }

      btnFetchModels.disabled = true;
      btnFetchModels.innerText = '⏳ 拉取中...';

      chrome.runtime.sendMessage({
        type: 'QUERY_API',
        payload: {
          url: modelsEndpoint,
          method: 'GET',
          headers: headers
        }
      }, (response) => {
        btnFetchModels.disabled = false;
        btnFetchModels.innerText = '🔄 自动识别模型';

        if (!response || !response.success) {
          if (saveStatus) {
            saveStatus.innerText = `❌ 拉取失败: ${response ? response.error : '连接超时或未填 Key'}`;
            saveStatus.className = 'save-toast show error';
            setTimeout(() => { saveStatus.className = 'save-toast'; }, 3000);
          }
          return;
        }

        let modelList = [];
        const resData = response.data;

        // OpenAI / SiliconFlow / OneAPI / DeepSeek standard response
        if (resData && Array.isArray(resData.data)) {
          modelList = resData.data.map(m => m.id || m.name).filter(Boolean);
        } else if (resData && Array.isArray(resData.models)) {
          // Gemini format: models/gemini-2.0-flash
          modelList = resData.models.map(m => {
            const name = m.name || m.id || '';
            return name.replace(/^models\//, '');
          }).filter(Boolean);
        } else if (Array.isArray(resData)) {
          modelList = resData.map(m => typeof m === 'string' ? m : (m.id || m.name)).filter(Boolean);
        }

        if (modelList.length > 0) {
          // Sort chat/flash/reasoner models to top
          modelList.sort((a, b) => {
            const aIsPreferred = /deepseek|gpt-4|o3|o1|gemini-2|claude-3|qwen/i.test(a);
            const bIsPreferred = /deepseek|gpt-4|o3|o1|gemini-2|claude-3|qwen/i.test(b);
            if (aIsPreferred && !bIsPreferred) return -1;
            if (!aIsPreferred && bIsPreferred) return 1;
            return a.localeCompare(b);
          });

          modelList = modelList.slice(0, 60);

          elModelSelect.innerHTML = '';
          modelList.forEach(mId => {
            const opt = document.createElement('option');
            opt.value = mId;
            opt.textContent = `${mId}`;
            elModelSelect.appendChild(opt);
          });

          if (saveStatus) {
            saveStatus.innerText = `✨ 成功自动识别拉取到 ${modelList.length} 个可用模型！`;
            saveStatus.className = 'save-toast show success';
            setTimeout(() => { saveStatus.className = 'save-toast'; }, 3000);
          }
        } else {
          if (saveStatus) {
            saveStatus.innerText = '⚠ 接口返回成功但未抓取到模型字段，已保留默认。';
            saveStatus.className = 'save-toast show';
            setTimeout(() => { saveStatus.className = 'save-toast'; }, 3000);
          }
        }
      });
    });
  }
});


