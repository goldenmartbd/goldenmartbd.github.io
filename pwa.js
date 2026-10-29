/* মোবাইল অ্যাপ (PWA): সার্ভিস ওয়ার্কার চালু ও "অ্যাপ ইনস্টল" বাটন */
(function () {
  'use strict';
  var btn = document.getElementById('installBtn'), deferred = null;
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function note(t) {
    var el = document.getElementById('toast'); if (!el) return;
    el.textContent = t; el.hidden = false; clearTimeout(note.t); note.t = setTimeout(function () { el.hidden = true; }, 6000);
  }
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
  if (!btn || standalone()) return;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; btn.hidden = false; });
  window.addEventListener('appinstalled', function () { btn.hidden = true; deferred = null; });
  if (ios) btn.hidden = false;
  btn.addEventListener('click', function () {
    if (deferred) { deferred.prompt(); deferred.userChoice.then(function () { deferred = null; btn.hidden = true; }); }
    else if (ios) note('iPhone-এ: Safari-র নিচের শেয়ার বাটন চাপুন, তারপর “Add to Home Screen”।');
    else note('ব্রাউজারের মেনু (⋮) থেকে “Install app” বা “Add to Home screen” চাপুন।');
  });
})();
