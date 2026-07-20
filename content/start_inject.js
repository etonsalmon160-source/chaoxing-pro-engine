// start_inject.js - Runs at document_start in the Isolated World
// Injects content/inject.js immediately to intercept HTMLMediaElement prototype and play events
(function() {
  'use strict';
  if (document.getElementById('chaoxing-helper-inject')) return;

  try {
    const script = document.createElement('script');
    script.id = 'chaoxing-helper-inject';
    script.src = chrome.runtime.getURL('content/inject.js');
    (document.head || document.documentElement).appendChild(script);
  } catch (e) {
    console.error('[CX Helper StartInject] Failed to inject helper script:', e);
  }
})();
