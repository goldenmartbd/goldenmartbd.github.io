/*
  গোল্ডেন মার্ট – মূল লজিক (অর্ডার, স্টক, ক্রয়, খরচ, লাভের হিসাব)
  এই ফাইল দুই জায়গায় চলে:
   1) ব্রাউজারে ডেমো মোডে (API_URL না বসালে)
   2) Google Apps Script-এ (apps-script/Code.gs এই ফাইল থেকেই তৈরি)
*/
var GM = (function () {
  'use strict';

  var STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled'];

  var DEFAULTS = {
    shopName: 'গোল্ডেন মার্ট',
    tagline: 'আপনার স্বপ্ন ও সৃজনশীলতার সঙ্গী',
    address: 'রাজশাহী',
    phone1: '01844531362',
    phone2: '01622964953',
    whatsappNumber: '8801844531362',
    whatsappLink: '',
    facebookUrl: 'https://www.facebook.com/share/1DvMmZDPh1/',
    notifyEmail: '',
    localArea: 'রাজশাহী',
    deliveryLocal: 0,
    deliveryOutside: 0,
    freeDeliveryMin: 0,
    codNote: 'পণ্য হাতে পেয়ে টাকা পরিশোধ করুন',
    heroTitle: 'শেখা হোক খেলার ছলে',
    heroText: 'বাংলা, ইংরেজি ও আরবি শেখার সাউন্ড বই, পানি দিয়ে আঁকার বই, লেখার বোর্ড আর মজার খেলনা। ছোট্ট সোনামণির জন্য বেছে নেওয়া পণ্য, সারা বাংলাদেশে হোম ডেলিভারি।',
    voucherNote: 'আমাদের সাথে কেনাকাটার জন্য ধন্যবাদ।'
  };
  var NUMERIC_SETTINGS = ['deliveryLocal', 'deliveryOutside', 'freeDeliveryMin'];
  var PUBLIC_KEYS = ['shopName', 'tagline', 'address', 'phone1', 'phone2', 'whatsappNumber', 'whatsappLink',
    'facebookUrl', 'localArea', 'deliveryLocal', 'deliveryOutside', 'freeDeliveryMin', 'codNote', 'heroTitle', 'heroText'];

  var SEED = [
    { id: 'p-magic', name: 'সুকন্যার Magic লেখা শেখার বই', tag: 'শেখার বই', price: 150, cost: 0, stock: 10,
      desc: '“একের ভিতর সব”। 3+ বছর বয়সীদের জন্য লেখা শেখার স্পাইরাল বই।',
      features: ['স্বরবর্ণ', 'ব্যঞ্জনবর্ণ', 'Alphabet', 'সংখ্যা', 'Number', 'আরবি', 'ড্রয়িং'] },
    { id: 'p-water', name: 'Magic Water Book', tag: 'আঁকা', price: 0, cost: 0, stock: 10,
      desc: 'শুধু পানি দিয়ে আঁকা যায়। রং ছড়ানোর ঝামেলা নেই, বারবার ব্যবহার করা যায়।',
      features: ['পানির কলম', 'বারবার আঁকা', 'স্পাইরাল বাঁধাই'] },
    { id: 'p-ayan', name: 'Ayan Intelligence Study Book', tag: 'সাউন্ড বই', price: 0, cost: 0, stock: 10,
      desc: 'বাটন চাপলেই উচ্চারণ শোনা যায়। 3+ বছর বয়সীদের জন্য 74+ কনটেন্ট।',
      features: ['Bangla', 'Alphabet', 'Number', 'Arabic', 'Recording'] },
    { id: 'p-zayan', name: 'Zayan Intelligence Book (Extra Large)', tag: 'সাউন্ড বই', price: 0, cost: 0, stock: 10,
      desc: '12×13 ইঞ্চি বড় সাইজ, 62 পৃষ্ঠা, নতুন আপডেট ভার্সন। পরিষ্কার ডিজাইনে সহজ শেখা।',
      features: ['বাংলা বর্ণমালা', 'ইংরেজি ছড়া', 'আরবি', 'Voice Recording', 'Puzzle matching'] },
    { id: 'p-tablet', name: 'LCD রাইটিং ট্যাবলেট', tag: 'আঁকা', price: 0, cost: 0, stock: 10,
      desc: 'লিখুন, আঁকুন, এক ক্লিকে মুছে আবার শুরু করুন। কাগজ ও কালির খরচ নেই।',
      features: ['কলমসহ', 'লাল', 'সবুজ', 'নীল', 'কালো', 'সাদা'] },
    { id: 'p-board', name: '2-ইন-1 কাঠের এডুকেশন বোর্ড', tag: 'শেখার বোর্ড', price: 0, cost: 0, stock: 10,
      desc: 'এক পাশে ব্ল্যাকবোর্ড, অন্য পাশে বাংলা ও ইংরেজি বর্ণ, সংখ্যা, ঘড়ি আর আবাকাস।',
      features: ['ব্ল্যাকবোর্ড', 'বাংলা বর্ণ', 'A–Z', '1–20', 'ঘড়ি', 'আবাকাস'] },
    { id: 'p-bird', name: 'টকিং বার্ড (খাঁচাসহ)', tag: 'খেলনা', price: 0, cost: 0, stock: 10,
      desc: 'আপনার কথা রিপিট করে, মিষ্টি পাখির ডাক শোনায়। সহজ সুইচ, শিশুদের জন্য নিরাপদ।',
      features: ['কথা রিপিট করে', 'পাখির ডাক', 'সহজ সুইচ'] }
  ];

  /* ---------- ছোট সহায়ক ---------- */
  function bnToAscii(s) { return String(s == null ? '' : s).replace(/[০-৯]/g, function (d) { return '০১২৩৪৫৬৭৮৯'.indexOf(d); }); }
  function num(v) { var n = Number(bnToAscii(v).replace(/[,\s৳]/g, '')); return isFinite(n) ? n : 0; }
  function int(v) { return Math.max(0, Math.floor(num(v))); }
  function str(v, max) { v = String(v == null ? '' : v).trim(); return max ? v.slice(0, max) : v; }
  function round2(n) { return Math.round(n * 100) / 100; }
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function err(m) { var e = new Error(m); e.user = true; return e; }
  function ok(o) { o = o || {}; o.ok = true; return o; }
  function imgPath(s) { return String(s == null ? '' : s).replace(/^(\.\.\/)?assets\/products\//, ''); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function isActive(p) { return !(p.active === false || String(p.active).toLowerCase() === 'false'); }
  function normPhone(p) {
    p = bnToAscii(p).replace(/[\s\-()]/g, '');
    if (p.indexOf('+880') === 0) p = '0' + p.slice(4);
    else if (p.indexOf('880') === 0 && p.length === 13) p = '0' + p.slice(3);
    return p;
  }
  function validPhone(p) { return /^01[3-9]\d{8}$/.test(p); }
  function normWhatsapp(v) {
    var d = bnToAscii(v).replace(/\D/g, '');
    if (/^01\d{9}$/.test(d)) d = '88' + d;
    return d;
  }
  function productMap(store) { var m = {}; store.list('products').forEach(function (p) { m[p.id] = p; }); return m; }
  function sortProducts(list) {
    return list.sort(function (a, b) { return (num(a.sort) - num(b.sort)) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')); });
  }

  function getSettings(store) {
    var s = store.settings() || {}, o = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      o[k] = Object.prototype.hasOwnProperty.call(s, k) ? s[k] : DEFAULTS[k];
      if (NUMERIC_SETTINGS.indexOf(k) >= 0) o[k] = num(o[k]);
      else o[k] = o[k] == null ? '' : String(o[k]);
    });
    return o;
  }

  function ensureSeed(store, env) {
    if (store.secret('seeded')) return;
    if (store.list('products').length === 0) {
      var t = env && env.nowISO ? env.nowISO() : '';
      SEED.forEach(function (p, i) {
        store.put('products', {
          id: p.id, name: p.name, tag: p.tag, desc: p.desc, features: p.features, price: p.price, cost: p.cost,
          stock: p.stock, image: p.id.replace('p-', '') + '.jpg', active: true, sort: i + 1, createdAt: t
        });
      });
    }
    store.setSecret('seeded', '1');
  }

  /* ---------- স্টক ---------- */
  // পুরনো আইটেম ফেরত, নতুন আইটেম বাদ। কম পড়লে আগে ত্রুটি, পরে লেখা।
  function adjustStock(store, oldItems, newItems) {
    var delta = {};
    (oldItems || []).forEach(function (i) { delta[i.pid] = (delta[i.pid] || 0) - int(i.qty); });
    (newItems || []).forEach(function (i) { delta[i.pid] = (delta[i.pid] || 0) + int(i.qty); });
    var map = productMap(store), updates = [];
    Object.keys(delta).forEach(function (pid) {
      var p = map[pid], d = delta[pid];
      if (!p || d === 0) return;
      var ns = int(p.stock) - d;
      if (ns < 0 && d > 0) throw err('স্টক কম: ' + p.name + ' (আছে ' + int(p.stock) + 'টি)');
      updates.push([p, Math.max(0, ns)]);
    });
    updates.forEach(function (u) { u[0].stock = u[1]; store.put('products', u[0]); });
  }

  /* ---------- অর্ডার ---------- */
  function nextOrderId(store, env) {
    var today = env.today(), ymd = today.slice(2).replace(/-/g, '');
    var n = store.list('orders').filter(function (o) { return o.date === today; }).length + 1, id;
    do { id = 'GM-' + ymd + '-' + ('00' + n).slice(-3); n++; } while (store.get('orders', id));
    return id;
  }

  function buildLines(rawItems, map, admin, oldItems) {
    var out = [];
    (rawItems || []).forEach(function (it) {
      var pid = str(it.pid, 60), q = int(it.qty);
      if (!q) return;
      var p = map[pid];
      if (!p) throw err('একটি পণ্য আর পাওয়া যাচ্ছে না। পেজ রিফ্রেশ করুন।');
      if (!admin && !isActive(p)) throw err(p.name + ' এখন বিক্রির জন্য নেই।');
      var old = (oldItems || []).filter(function (o) { return o.pid === pid; })[0];
      var price;
      if (admin && it.price !== undefined && it.price !== null && it.price !== '') price = num(it.price);
      else if (old) price = num(old.price);
      else price = num(p.price);
      if (!admin && price <= 0) throw err(p.name + ' এর দাম এখনো নির্ধারণ করা হয়নি, মেসেজ করে জানুন।');
      var cost = old ? num(old.cost) : num(p.cost);
      out.push({ pid: pid, name: p.name, qty: q, price: price, cost: cost });
    });
    if (!out.length) throw err('কার্ট খালি।');
    if (out.length > 30) throw err('একসাথে এত পণ্য অর্ডার করা যায় না।');
    return out;
  }

  function totals(lines, discount, delivery) {
    var sub = 0;
    lines.forEach(function (l) { sub += l.qty * l.price; });
    sub = round2(sub);
    var total = Math.max(0, round2(sub - discount + delivery));
    return { subtotal: sub, total: total };
  }

  function deliveryFor(S, area, subtotal) {
    if (num(S.freeDeliveryMin) > 0 && subtotal >= num(S.freeDeliveryMin)) return 0;
    return area === 'outside' ? num(S.deliveryOutside) : num(S.deliveryLocal);
  }

  function buildOrder(d, store, env, admin) {
    var S = getSettings(store);
    if (!admin && str(d.website)) throw err('অনুরোধ গ্রহণ করা হয়নি।');
    var name = str(d.customerName, 80), phone = normPhone(d.phone), address = str(d.address, 300);
    if (!admin) {
      if (!name) throw err('নাম লিখুন।');
      if (!validPhone(phone)) throw err('11 সংখ্যার সঠিক মোবাইল নম্বর লিখুন।');
      if (address.length < 8) throw err('জেলা ও থানাসহ পূর্ণ ঠিকানা লিখুন।');
    } else {
      if (!name) name = 'ক্যাশ কাস্টমার';
      if (phone && !validPhone(phone)) throw err('মোবাইল নম্বর সঠিক নয়।');
    }
    var map = productMap(store);
    var lines = buildLines(d.items, map, admin, null);
    var sub = totals(lines, 0, 0).subtotal;
    var area = d.area === 'outside' ? 'outside' : 'local';
    var delivery = admin && d.delivery !== undefined && d.delivery !== '' && d.delivery !== null ? num(d.delivery) : deliveryFor(S, area, sub);
    var discount = admin ? num(d.discount) : 0;
    var t = totals(lines, discount, delivery);
    var status = admin && STATUSES.indexOf(d.status) >= 0 ? d.status : 'new';
    var today = env.today();
    var order = {
      id: nextOrderId(store, env), createdAt: env.nowISO(), date: today,
      deliveredDate: status === 'delivered' ? today : '',
      status: status, source: admin ? 'admin' : 'web',
      customerName: name, phone: phone, address: address, note: str(d.note, 300), area: area,
      items: lines, subtotal: t.subtotal, discount: discount, delivery: delivery, total: t.total,
      payMethod: 'COD', payStatus: status === 'delivered' ? 'paid' : 'due', updatedAt: env.nowISO()
    };
    if (status !== 'cancelled') adjustStock(store, [], lines);
    store.put('orders', order);
    return order;
  }

  function orderMailHtml(o, S) {
    var rows = o.items.map(function (i) {
      return '<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">' + esc(i.name) + '</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">' + i.qty +
        '</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">৳' + (i.qty * i.price) + '</td></tr>';
    }).join('');
    return '<div style="font-family:Arial,sans-serif;max-width:560px">' +
      '<h2 style="color:#0e5a57;margin:0 0 8px">নতুন অর্ডার ' + esc(o.id) + '</h2>' +
      '<p style="margin:0 0 12px"><b>' + esc(o.customerName) + '</b><br>মোবাইল: ' + esc(o.phone) + '<br>ঠিকানা: ' + esc(o.address) +
      (o.note ? '<br>নোট: ' + esc(o.note) : '') + '<br>এলাকা: ' + (o.area === 'outside' ? 'অন্য জেলা' : esc(S.localArea)) + '</p>' +
      '<table style="border-collapse:collapse;width:100%"><tr style="background:#f3efe2"><th style="padding:6px 10px;text-align:left">পণ্য</th><th style="padding:6px 10px">পরিমাণ</th><th style="padding:6px 10px;text-align:right">টাকা</th></tr>' + rows + '</table>' +
      '<p style="text-align:right;margin:10px 0 0">ডেলিভারি চার্জ: ৳' + o.delivery + '<br><b style="font-size:18px">মোট: ৳' + o.total + '</b><br>ক্যাশ অন ডেলিভারি</p>' +
      '<p style="color:#666;font-size:13px">অ্যাডমিন প্যানেল থেকে অর্ডার কনফার্ম করুন।</p></div>';
  }

  function notifyOrder(o, store, env) {
    try {
      var S = getSettings(store), to = str(S.notifyEmail) || (env.ownerEmail ? env.ownerEmail() : '');
      if (!to || !env.sendMail) return;
      env.sendMail(to, 'নতুন অর্ডার ' + o.id + ' – ৳' + o.total, orderMailHtml(o, S), S.shopName);
    } catch (e) { /* ইমেইল না গেলেও অর্ডার সংরক্ষিত থাকবে */ }
  }

  function placeOrder(d, store, env) {
    var o = buildOrder(d, store, env, false);
    notifyOrder(o, store, env);
    return { orderId: o.id, total: o.total, delivery: o.delivery };
  }

  function setOrderStatus(id, status, store, env) {
    var o = store.get('orders', id);
    if (!o) throw err('অর্ডার পাওয়া যায়নি।');
    if (STATUSES.indexOf(status) < 0) throw err('স্ট্যাটাস সঠিক নয়।');
    if (o.status === status) return o;
    if (o.status !== 'cancelled' && status === 'cancelled') adjustStock(store, o.items, []);
    if (o.status === 'cancelled' && status !== 'cancelled') adjustStock(store, [], o.items);
    o.status = status;
    o.payStatus = status === 'delivered' ? 'paid' : 'due';
    o.deliveredDate = status === 'delivered' ? env.today() : '';
    o.updatedAt = env.nowISO();
    store.put('orders', o);
    return o;
  }

  function saveOrder(d, store, env) {
    var o = store.get('orders', str(d.id));
    if (!o) throw err('অর্ডার পাওয়া যায়নি।');
    if (d.customerName !== undefined) o.customerName = str(d.customerName, 80) || o.customerName;
    if (d.phone !== undefined) {
      var ph = normPhone(d.phone);
      if (ph && !validPhone(ph)) throw err('মোবাইল নম্বর সঠিক নয়।');
      o.phone = ph;
    }
    if (d.address !== undefined) o.address = str(d.address, 300);
    if (d.note !== undefined) o.note = str(d.note, 300);
    if (d.area !== undefined) o.area = d.area === 'outside' ? 'outside' : 'local';
    var lines = o.items;
    if (Array.isArray(d.items)) {
      lines = buildLines(d.items, productMap(store), true, o.items);
      if (o.status !== 'cancelled') adjustStock(store, o.items, lines);
    }
    var discount = d.discount !== undefined ? num(d.discount) : num(o.discount);
    var delivery = d.delivery !== undefined ? num(d.delivery) : num(o.delivery);
    var t = totals(lines, discount, delivery);
    o.items = lines; o.discount = discount; o.delivery = delivery; o.subtotal = t.subtotal; o.total = t.total;
    o.updatedAt = env.nowISO();
    store.put('orders', o);
    return o;
  }

  function deleteOrder(id, store) {
    var o = store.get('orders', id);
    if (!o) return;
    if (o.status !== 'cancelled') adjustStock(store, o.items, []);
    store.del('orders', id);
  }

  /* ---------- পণ্য, ক্রয়, খরচ, সেটিংস ---------- */
  function saveProduct(d, store, env) {
    var name = str(d.name, 120);
    if (!name) throw err('পণ্যের নাম লিখুন।');
    var ex = d.id ? store.get('products', str(d.id)) : null;
    var feats = Array.isArray(d.features) ? d.features : String(d.features || '').split(/[,\n،]/);
    feats = feats.map(function (f) { return str(f, 40); }).filter(Boolean).slice(0, 12);
    var p = ex || { id: uid('p-'), createdAt: env.nowISO() };
    p.name = name; p.tag = str(d.tag, 30); p.desc = str(d.desc, 400); p.features = feats;
    p.price = num(d.price); p.cost = num(d.cost); p.stock = int(d.stock);
    p.image = str(d.image, 2000);
    p.active = d.active === false || String(d.active) === 'false' ? false : true;
    p.sort = d.sort === '' || d.sort === undefined ? (ex ? num(ex.sort) : 99) : num(d.sort);
    store.put('products', p);
    return p;
  }

  function savePurchase(d, store, env) {
    var p = store.get('products', str(d.pid));
    if (!p) throw err('পণ্য বেছে নিন।');
    var qty = int(d.qty), unit = num(d.unitCost);
    if (!qty) throw err('পরিমাণ লিখুন।');
    if (unit < 0) throw err('ক্রয়মূল্য সঠিক নয়।');
    var oldStock = int(p.stock), oldCost = num(p.cost);
    var newStock = oldStock + qty;
    p.cost = round2((oldStock * oldCost + qty * unit) / newStock); // গড় ক্রয়মূল্য
    p.stock = newStock;
    store.put('products', p);
    var row = { id: uid('b-'), date: str(d.date, 10) || env.today(), pid: p.id, name: p.name, qty: qty, unitCost: unit,
      supplier: str(d.supplier, 80), note: str(d.note, 200), createdAt: env.nowISO() };
    store.put('purchases', row);
    return row;
  }

  function deletePurchase(id, store) {
    var b = store.get('purchases', id);
    if (!b) return;
    var p = store.get('products', b.pid);
    if (p) { p.stock = Math.max(0, int(p.stock) - int(b.qty)); store.put('products', p); }
    store.del('purchases', id);
  }

  function saveExpense(d, store, env) {
    var amount = num(d.amount);
    if (amount <= 0) throw err('খরচের টাকা লিখুন।');
    var row = { id: d.id || uid('e-'), date: str(d.date, 10) || env.today(), category: str(d.category, 40) || 'অন্যান্য',
      amount: amount, note: str(d.note, 200), createdAt: env.nowISO() };
    store.put('expenses', row);
    return row;
  }

  function saveSettings(d, store) {
    var cur = store.settings() || {};
    Object.keys(DEFAULTS).forEach(function (k) {
      if (d[k] === undefined) return;
      var v = d[k];
      if (NUMERIC_SETTINGS.indexOf(k) >= 0) v = num(v);
      else if (k === 'whatsappNumber') v = normWhatsapp(v);
      else v = str(v, 600);
      cur[k] = v;
    });
    store.saveSettings(cur);
    return getSettings(store);
  }

  /* ---------- অ্যাডমিন যাচাই ---------- */
  function auth(req, store, env) {
    var pw = store.secret('adminPassword');
    if (!pw) throw err('অ্যাডমিন পাসওয়ার্ড সেট করা নেই। Apps Script-এ setup() চালান।');
    if (env.isBlocked && env.isBlocked()) throw err('অনেকবার ভুল হয়েছে। 10 মিনিট পরে আবার চেষ্টা করুন।');
    if (String(req.password || '') !== String(pw)) {
      if (env.fail) env.fail();
      throw err('পাসওয়ার্ড ভুল।');
    }
  }

  function publicData(store) {
    var S = getSettings(store), pub = {};
    PUBLIC_KEYS.forEach(function (k) { pub[k] = S[k]; });
    var prods = sortProducts(store.list('products').filter(isActive)).map(function (p) {
      return { id: p.id, name: p.name, tag: p.tag, desc: p.desc, features: Array.isArray(p.features) ? p.features : [],
        price: num(p.price), image: p.image, stock: int(p.stock) };
    });
    return { settings: pub, products: prods };
  }

  function adminData(store, env) {
    var orders = store.list('orders').sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    return {
      mode: env.mode || 'live', settings: getSettings(store),
      products: sortProducts(store.list('products')), orders: orders,
      purchases: store.list('purchases').sort(function (a, b) { return String(b.date + b.createdAt).localeCompare(String(a.date + a.createdAt)); }),
      expenses: store.list('expenses').sort(function (a, b) { return String(b.date + b.createdAt).localeCompare(String(a.date + a.createdAt)); })
    };
  }

  var READ_ONLY = ['public', 'login', 'adminData', 'ping'];

  function handle(req, store, env) {
    try {
      req = req || {};
      var a = req.action, d = req.data || {};
      if (a === 'ping') return ok({ pong: true });
      if (a === 'public') {
        if (!store.secret('seeded')) store.lock(function () { ensureSeed(store, env); });
        return ok(publicData(store));
      }
      var run = function () {
        switch (a) {
          case 'placeOrder': return ok(placeOrder(d, store, env));
          case 'login': auth(req, store, env); return ok({ mode: env.mode || 'live' });
          case 'adminData': auth(req, store, env); return ok(adminData(store, env));
        }
        auth(req, store, env);
        switch (a) {
          case 'saveProduct': return ok({ product: saveProduct(d, store, env) });
          case 'deleteProduct': store.del('products', str(d.id)); return ok();
          case 'uploadImage':
            if (['image/jpeg', 'image/png', 'image/webp'].indexOf(d.mime) < 0) throw err('শুধু JPG, PNG বা WEBP ছবি দিন।');
            if (!d.data || String(d.data).length > 6000000) throw err('ছবি খুব বড়।');
            return ok({ url: env.saveImage(String(d.data), d.mime, 'img-' + Date.now()) });
          case 'createOrder': return ok({ order: buildOrder(d, store, env, true) });
          case 'saveOrder': return ok({ order: saveOrder(d, store, env) });
          case 'setOrderStatus': return ok({ order: setOrderStatus(str(d.id), d.status, store, env) });
          case 'deleteOrder': deleteOrder(str(d.id), store); return ok();
          case 'savePurchase': return ok({ purchase: savePurchase(d, store, env) });
          case 'deletePurchase': deletePurchase(str(d.id), store); return ok();
          case 'saveExpense': return ok({ expense: saveExpense(d, store, env) });
          case 'deleteExpense': store.del('expenses', str(d.id)); return ok();
          case 'saveSettings': return ok({ settings: saveSettings(d, store) });
          case 'changePassword':
            if (str(d.newPassword).length < 6) throw err('নতুন পাসওয়ার্ড কমপক্ষে 6 অক্ষরের হতে হবে।');
            store.setSecret('adminPassword', str(d.newPassword));
            return ok();
        }
        throw err('অজানা অনুরোধ।');
      };
      return READ_ONLY.indexOf(a) >= 0 ? run() : store.lock(run);
    } catch (e) {
      return { ok: false, error: e && e.user ? e.message : 'সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করুন।', detail: e && e.user ? undefined : String(e && e.message) };
    }
  }

  /* ---------- হিসাব ও লাভ ---------- */
  function report(db, from, to) {
    var inR = function (d) { d = String(d || ''); return (!from || d >= from) && (!to || d <= to); };
    var delivered = (db.orders || []).filter(function (o) { return o.status === 'delivered' && inR(o.deliveredDate || o.date); });
    var open = (db.orders || []).filter(function (o) { return o.status !== 'delivered' && o.status !== 'cancelled' && inR(o.date); });
    var daily = {}, byProduct = {};
    function day(d) { return daily[d] || (daily[d] = { date: d, revenue: 0, profit: 0 }); }
    function sum(list, track) {
      var r = { count: list.length, items: 0, discount: 0, delivery: 0, cogs: 0, qty: 0 };
      list.forEach(function (o) {
        var cogs = 0, items = 0;
        (o.items || []).forEach(function (i) {
          var rev = num(i.qty) * num(i.price), c = num(i.qty) * num(i.cost);
          items += rev; cogs += c; r.qty += num(i.qty);
          if (track) {
            var b = byProduct[i.pid] || (byProduct[i.pid] = { pid: i.pid, name: i.name, qty: 0, revenue: 0, profit: 0 });
            b.qty += num(i.qty); b.revenue += rev; b.profit += rev - c;
          }
        });
        r.items += items; r.cogs += cogs; r.discount += num(o.discount); r.delivery += num(o.delivery);
        if (track) {
          var dd = day(o.deliveredDate || o.date);
          dd.revenue += items - num(o.discount) + num(o.delivery);
          dd.profit += items - num(o.discount) - cogs + num(o.delivery);
        }
      });
      r.revenue = r.items - r.discount + r.delivery;
      r.gross = r.items - r.discount - r.cogs + r.delivery;
      return r;
    }
    var del = sum(delivered, true), pen = sum(open, false);
    var exps = (db.expenses || []).filter(function (e) { return inR(e.date); }), expTotal = 0, byCat = {};
    exps.forEach(function (e) {
      expTotal += num(e.amount); byCat[e.category] = (byCat[e.category] || 0) + num(e.amount);
      day(e.date).profit -= num(e.amount);
    });
    var buys = (db.purchases || []).filter(function (b) { return inR(b.date); }), buyTotal = 0;
    buys.forEach(function (b) { buyTotal += num(b.qty) * num(b.unitCost); });
    var stockValue = 0, stockQty = 0;
    (db.products || []).forEach(function (p) { stockValue += int(p.stock) * num(p.cost); stockQty += int(p.stock); });
    return {
      delivered: del, open: pen,
      expenses: { total: expTotal, byCat: byCat, count: exps.length },
      purchases: { total: buyTotal, count: buys.length },
      net: round2(del.gross - expTotal),
      byProduct: Object.keys(byProduct).map(function (k) { return byProduct[k]; }).sort(function (a, b) { return b.profit - a.profit; }),
      daily: Object.keys(daily).sort().map(function (k) { return daily[k]; }),
      stockValue: round2(stockValue), stockQty: stockQty
    };
  }

  return {
    handle: handle, report: report, ensureSeed: ensureSeed, getSettings: getSettings, publicData: publicData,
    STATUSES: STATUSES, DEFAULTS: DEFAULTS, bnToAscii: bnToAscii, normPhone: normPhone, validPhone: validPhone, num: num, esc: esc, imgPath: imgPath
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = GM;
