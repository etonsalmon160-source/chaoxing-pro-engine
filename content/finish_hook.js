// finish_hook.js - Runs in the PAGE context (not isolated world)
// Injected via <script src="..."> to bypass CSP 'unsafe-inline' restrictions.
// Listens for postMessage from the content script and triggers
// the platform's native completion callbacks.

(function() {
  'use strict';

  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.type) return;
    
    if (e.data.type === 'CX_TRIGGER_SWIPER_NEXT') {
      try {
        if (typeof swiperNext === 'function') {
           swiperNext();
        } else if (window.swiperNext) {
           window.swiperNext();
        }
      } catch (err) {}
      return;
    }

    if (e.data.type !== 'CX_TRIGGER_FINISH_JOB') return;

    console.log('[CX Helper FinishHook] Received completion trigger, calling platform hooks...');

    // 1. Try finishJob() in current window context
    try {
      if (typeof finishJob === 'function') {
        finishJob();
        console.log('[CX Helper FinishHook] finishJob() called successfully');
      }
    } catch(err) {
      console.warn('[CX Helper FinishHook] finishJob() error:', err.message);
    }

    // 2. Try greenligth() in current window context (note: Chaoxing uses this typo)
    try {
      if (typeof greenligth === 'function') {
        greenligth();
        console.log('[CX Helper FinishHook] greenligth() called successfully');
      }
    } catch(err) {}

    // 3. Try parent.finishJob() and parent.greenligth()
    try {
      if (typeof parent !== 'undefined' && parent && parent !== window) {
        if (typeof parent.finishJob === 'function') {
          parent.finishJob();
          console.log('[CX Helper FinishHook] parent.finishJob() called successfully');
        }
        if (typeof parent.greenligth === 'function') {
          parent.greenligth();
          console.log('[CX Helper FinishHook] parent.greenligth() called successfully');
        }
      }
    } catch(err) {}

    // 4. Try top.finishJob() and top.greenligth()
    try {
      if (typeof top !== 'undefined' && top && top !== window && top !== parent) {
        if (typeof top.finishJob === 'function') {
          top.finishJob();
          console.log('[CX Helper FinishHook] top.finishJob() called successfully');
        }
        if (typeof top.greenligth === 'function') {
          top.greenligth();
          console.log('[CX Helper FinishHook] top.greenligth() called successfully');
        }
      }
    } catch(err) {}

    // 5. Try reading the iframe's own completion APIs via known Chaoxing globals
    try {
      // Some Chaoxing modules use _self.setting / _self.finishJob pattern
      if (typeof _self !== 'undefined' && _self) {
        if (typeof _self.finishJob === 'function') _self.finishJob();
        if (typeof _self.greenligth === 'function') _self.greenligth();
      }
    } catch(err) {}

    // 6. Dispatch a custom DOM event that any in-page listener can pick up
    try {
      document.dispatchEvent(new CustomEvent('cx_read_complete', { detail: { source: 'cx-helper' } }));
      window.dispatchEvent(new CustomEvent('cx_read_complete', { detail: { source: 'cx-helper' } }));
    } catch(err) {}
  });

  console.log('[CX Helper FinishHook] Page-context completion hook listener installed');
})();
