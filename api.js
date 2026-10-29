/*
  সার্ভারের সাথে যোগাযোগ।
  config.js-এ API_URL থাকলে Google Apps Script-এর সাথে কথা বলে।
  না থাকলে ডেমো মোডে এই ব্রাউজারের localStorage-এ চলে (core.js-এর একই লজিক)।
*/
var GMApi = (function () {
  'use strict';
  var cfg = window.GM_CONFIG || {};
  var url = String(cfg.API_URL || '').trim();
  var remote = !!url;
  var DEMO_PASSWORD = 'admin123';

  /* ---------- ডেমো ব্যাকএন্ড ---------- */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { throw new Error('ব্রাউজারের জায়গা শেষ। ছোট ছবি ব্যবহার করুন।'); } }

  var LocalStore = {
    list: function (t) { return lsGet('gm_demo_' + t, []); },
    get: function (t, id) { return LocalStore.list(t).filter(function (x) { return x.id === id; })[0] || null; },
    put: function (t, o) {
      var l = LocalStore.list(t), i = -1;
      l.forEach(function (x, n) { if (x.id === o.id) i = n; });
      if (i >= 0) l[i] = o; else l.push(o);
      lsSet('gm_demo_' + t, l);
    },
    del: function (t, id) { lsSet('gm_demo_' + t, LocalStore.list(t).filter(function (x) { return x.id !== id; })); },
    settings: function () { return lsGet('gm_demo_settings', {}); },
    saveSettings: function (o) { lsSet('gm_demo_settings', o); },
    secret: function (k) { return lsGet('gm_demo_secret_' + k, null); },
    setSecret: function (k, v) { lsSet('gm_demo_secret_' + k, v); },
    lock: function (fn) { return fn(); }
  };
  function dhakaDate() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }); }
  var LocalEnv = {
    mode: 'demo',
    today: dhakaDate,
    nowISO: function () { return dhakaDate() + 'T' + new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka' }); },
    sendMail: function () { /* ডেমোতে ইমেইল যায় না */ },
    ownerEmail: function () { return ''; },
    saveImage: function (b64, mime) { return 'data:' + mime + ';base64,' + b64; }
  };
  if (!remote && !LocalStore.secret('adminPassword')) LocalStore.setSecret('adminPassword', DEMO_PASSWORD);

  /* ---------- কল ---------- */
  function timeout(ms) { var c = new AbortController(); setTimeout(function () { c.abort(); }, ms); return c.signal; }

  function call(action, data, password) {
    var req = { action: action, data: data || {}, password: password || '' };
    if (!remote) {
      return new Promise(function (res) {
        setTimeout(function () { res(GM.handle(req, LocalStore, LocalEnv)); }, 60);
      });
    }
    var isGet = action === 'public';
    var p = isGet
      ? fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + 'action=public', { signal: timeout(25000) })
      : fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(req), signal: timeout(45000) });
    return p.then(function (r) { return r.json(); }).catch(function () {
      return { ok: false, error: 'সার্ভারের সাথে যোগাযোগ হয়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।' };
    });
  }

  return { remote: remote, demo: !remote, demoPassword: DEMO_PASSWORD, call: call };
})();
