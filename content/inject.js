// inject.js - Runs in the page context to override video player restrictions
// Integrated with OCS core algorithms for Ext/videojs hook

(function() {
  const scriptEl = document.getElementById('chaoxing-helper-inject');
  let settings = { speed: '2.0', mute: true };
  if (scriptEl && scriptEl.dataset.settings) {
    try {
      settings = JSON.parse(scriptEl.dataset.settings);
    } catch (e) {
      console.error('[Inject] Error parsing settings dataset:', e);
    }
  }

  let targetSpeed = parseFloat(settings.speed) || 1.0;
  let forceMute = settings.mute !== undefined ? !!settings.mute : true;
  let engineRunning = settings.engineRunning !== undefined ? !!settings.engineRunning : true;
  
  let _ocsHacked = false;
  let dragCount = 0;

  function hackVideoJS() {
    const videojs = window.videojs;
    const Ext = window.Ext;

    if (typeof videojs !== 'undefined' && typeof Ext !== 'undefined') {
      if (_ocsHacked) return;
      _ocsHacked = true;
      console.log('[Inject Hooks] OCS Ext/videojs hack initialized.');

      // 1. Intercept sendLog to suppress excessive drag events
      const _origin = videojs.getPlugin('seekBarControl');
      if (_origin) {
        const plugin = videojs.extend(videojs.getPlugin('plugin'), {
          constructor: function (videoExt, data) {
            const _sendLog = data.sendLog;
            data.sendLog = function (...args) {
              if (args[1] === 'drag') {
                dragCount++;
                if (dragCount > 100) {
                  dragCount = 0;
                  const v = document.querySelector('video');
                  if (v) v.pause();
                }
              } else {
                _sendLog.apply(data, args);
              }
            };
            _origin.apply(_origin.prototype, [videoExt, data]);
          }
        });
        videojs.registerPlugin('seekBarControl', plugin);
      }

      // 2. Override ans.VideoJs to bypass built-in anti-cheat and speed reset
      try {
        Ext.define('ans.VideoJs', {
          override: 'ans.VideoJs',
          constructor: function (data) {
            this.addEvents(['seekstart']);
            this.mixins.observable.constructor.call(this, data);
            
            // Reconstruct videojs opt without the annoying listeners
            let opt = this.params2VideoOpt ? this.params2VideoOpt(data.params) : {};
            const vjs = videojs(data.videojs, opt, function () {});
            
            Ext.fly(data.videojs).on('contextmenu', function (f) {
              f.preventDefault();
            });
            Ext.fly(data.videojs).on('keydown', function (f) {
              if (f.keyCode === 32 || f.keyCode === 37 || f.keyCode === 39 || f.keyCode === 107) {
                f.preventDefault();
              }
            });

            if (vjs.videoJsResolutionSwitcher) {
              vjs.on('resolutionchange', function () {
                const cr = vjs.currentResolution();
                const re = cr.sources ? cr.sources[0].res : false;
                Ext.setCookie('resolution', re);
              });
            }

            if (vjs.videoJsPlayLine) {
              vjs.on('playlinechange', function () {
                const cp = vjs.currentPlayline();
                Ext.setCookie('net', cp.net);
              });
            }
            // Omitting the speed-limiting method that ChaoXing normally appends here!
          }
        });
      } catch (e) {
        console.error('[Inject Hooks] Ext override failed:', e);
      }
    }
  }

  try {
    hackVideoJS();
    window.document.addEventListener('readystatechange', hackVideoJS);
    window.addEventListener('load', hackVideoJS);
  } catch (e) {
    console.error(e);
  }

  // Settings sync
  document.addEventListener('CX_SET_SETTINGS', (e) => {
    if (e.detail) {
      if (e.detail.speed !== undefined) targetSpeed = parseFloat(e.detail.speed) || 1.0;
      if (e.detail.mute !== undefined) forceMute = !!e.detail.mute;
      if (e.detail.engineRunning !== undefined) {
        engineRunning = !!e.detail.engineRunning;
        if (!engineRunning) {
          document.querySelectorAll('video, audio').forEach(media => {
             if (media.dataset.cxPaused === 'true') media.dataset.cxPaused = 'false';
          });
        }
      }
    }
  });

  // Bypass window blur / focusout
  window.addEventListener('blur', function(e) {
    e.stopImmediatePropagation();
  }, true);
  window.addEventListener('focusout', function(e) {
    e.stopImmediatePropagation();
  }, true);

  try {
    Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
    Object.defineProperty(document, 'webkitHidden', { get: () => false, configurable: true });
  } catch (e) {}

  // Enforce Speed and Mute Reactively
  window.addEventListener('ratechange', function(e) {
    const media = e.target;
    if (engineRunning && media && (media.tagName === 'VIDEO' || media.tagName === 'AUDIO')) {
      if (media.playbackRate !== targetSpeed) {
        try { media.playbackRate = targetSpeed; } catch (err) {}
      }
    }
  }, true);

  window.addEventListener('volumechange', function(e) {
    const media = e.target;
    if (engineRunning && media && (media.tagName === 'VIDEO' || media.tagName === 'AUDIO')) {
      if (forceMute && !media.muted) {
        media.muted = true;
      }
    }
  }, true);

  // Active loop for play/mute enforcement
  setInterval(() => {
    if (!engineRunning) return;
    document.querySelectorAll('video, audio').forEach(media => {
      if (media.playbackRate !== targetSpeed) {
        try { media.playbackRate = targetSpeed; } catch (e) {}
      }
      if (forceMute && !media.muted) media.muted = true;
      
      // Auto-play if paused and not ended
      if (media.paused && !media.ended && media.dataset.cxPaused !== 'true') {
        media.play().catch(() => {});
      }
    });
  }, 1000);

  // Expose window.attachments to isolated world (content.js) for accurate OCS-style job counting
  setInterval(() => {
    if (window.attachments && Array.isArray(window.attachments)) {
      try {
        const status = window.attachments.map(att => ({
          job: att.job,
          isPassed: att.isPassed,
          jobid: att.jobid || (att.property ? att.property._jobid : null)
        }));
        document.documentElement.dataset.cxAttachments = JSON.stringify(status);
      } catch (e) {}
    }
  }, 1500);
})();
