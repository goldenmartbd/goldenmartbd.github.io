/* স্টোরফ্রন্টের স্ক্রিপ্ট */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  var esc = GM.esc;
  var S = Object.assign({}, GM.DEFAULTS), P = [], cart = {}, area = 'local', loaded = false;
  try { cart = JSON.parse(localStorage.getItem('gm_cart') || '{}') || {}; } catch (e) { cart = {}; }
  var PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#e8e4d4"/><text x="60" y="68" font-size="40" text-anchor="middle" fill="#a97a1f">★</text></svg>');

  function bn(n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); }
  function tk(n) { return '৳' + bn(Math.round(n * 100) / 100); }
  function byId(id) { return P.filter(function (p) { return p.id === id; })[0]; }
  function img(p) { return p.image ? GM.imgPath(p.image) : PLACEHOLDER; }
  function save() { try { localStorage.setItem('gm_cart', JSON.stringify(cart)); } catch (e) {} }
  function toast(t) { var el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 2600); }
  function copy(text, msg) {
    function fb() { var ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); toast(msg); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(msg); }, fb); else fb();
  }
  function waUrl(text) {
    if (S.whatsappNumber) return 'https://wa.me/' + S.whatsappNumber + (text ? '?text=' + encodeURIComponent(text) : '');
    return S.whatsappLink || '';
  }

  /* ---------- দোকানের তথ্য ---------- */
  function applySettings() {
    document.title = S.shopName;
    $('shopName').textContent = S.shopName; $('tagline').textContent = S.tagline;
    $('heroTitle').textContent = S.heroTitle; $('heroText').textContent = S.heroText;
    $('fName').textContent = S.shopName; $('fAddr').textContent = S.address;
    $('codNote').textContent = 'ক্যাশ অন ডেলিভারি: ' + S.codNote + '। অর্ডারের পর আমরা ফোনে কনফার্ম করব।';
    var charge = (S.deliveryLocal || S.deliveryOutside)
      ? S.localArea + ' ' + tk(S.deliveryLocal) + ', অন্য জেলা ' + tk(S.deliveryOutside) + (S.freeDeliveryMin ? '। ' + tk(S.freeDeliveryMin) + '-এর বেশি কিনলে ফ্রি' : '')
      : 'ডেলিভারি চার্জ অর্ডার কনফার্মের সময় জানানো হবে';
    $('strip').innerHTML = '<div><b>ক্যাশ অন ডেলিভারি</b>' + esc(S.codNote) + '</div>' +
      '<div><b>সারা বাংলাদেশে হোম ডেলিভারি</b>' + esc(charge) + '</div>' +
      '<div><b>সহজ অর্ডার</b>কার্ট থেকে অর্ডার করুন অথবা সরাসরি মেসেজ দিন</div>';
    var ICON_PH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>';
    var ICON_FB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>';
    var ICON_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88z"/></svg>';
    var ph = [S.phone1, S.phone2].filter(Boolean);
    $('phones').innerHTML = ph.map(function (n) {
      return '<div class="ph">' + ICON_PH + '<code>' + bn(esc(n)) + '</code><button class="copy" type="button" data-copy="' + esc(n) + '">কপি</button></div>';
    }).join('');
    var links = [];
    if (S.facebookUrl) links.push('<a class="clink fb" href="' + esc(S.facebookUrl) + '" target="_blank" rel="noopener">' + ICON_FB + '<span>ফেসবুক পেজ</span></a>');
    var wa = waUrl('');
    if (wa) links.push('<a class="clink wa" href="' + esc(wa) + '" target="_blank" rel="noopener">' + ICON_WA + '<span>WhatsApp-এ মেসেজ দিন</span></a>');
    $('links').innerHTML = links.join('');
    var fab = $('wafab'); fab.hidden = !wa; fab.href = wa || '#'; fab.innerHTML = ICON_WA.replace('<svg','<svg style="width:20px;height:20px;fill:#fff;vertical-align:-4px;margin-right:6px"') + 'WhatsApp';
    var a = '<label><input type="radio" name="area" value="local"' + (area === 'local' ? ' checked' : '') + '><b>' + esc(S.localArea) + '</b><small>ডেলিভারি ' + (S.deliveryLocal ? tk(S.deliveryLocal) : 'চার্জ জানানো হবে') + '</small></label>' +
      '<label><input type="radio" name="area" value="outside"' + (area === 'outside' ? ' checked' : '') + '><b>অন্য জেলা</b><small>ডেলিভারি ' + (S.deliveryOutside ? tk(S.deliveryOutside) : 'চার্জ জানানো হবে') + '</small></label>';
    $('areas').innerHTML = a;
  }

  /* ---------- পণ্য ---------- */
  function card(p) {
    var q = cart[p.id] || 0, out = p.stock <= 0, noPrice = p.price <= 0;
    var price = noPrice ? '<span class="price ask">দাম জানতে মেসেজ করুন</span>' : '<span class="price num">' + tk(p.price) + '</span>';
    var act;
    if (out) act = '<button class="add" disabled>স্টক শেষ</button>';
    else if (noPrice) { var u = waUrl('আসসালামু আলাইকুম, "' + p.name + '" এর দাম কত?'); act = u ? '<a class="add btn" style="min-height:40px;padding:8px 14px" href="' + esc(u) + '" target="_blank" rel="noopener">দাম জিজ্ঞাসা করুন</a>' : ''; }
    else if (q) act = '<span class="step"><button type="button" data-d="-1" data-id="' + esc(p.id) + '" aria-label="কমান">−</button><b>' + bn(q) + '</b><button type="button" data-d="1" data-id="' + esc(p.id) + '" aria-label="বাড়ান">+</button></span>';
    else act = '<button class="add" type="button" data-d="1" data-id="' + esc(p.id) + '">কার্টে যোগ করুন</button>';
    return '<article class="card"><div class="pic">' + (p.tag ? '<span class="tag">' + esc(p.tag) + '</span>' : '') + (out ? '<span class="tag out">স্টক শেষ</span>' : '') +
      '<img src="' + esc(img(p)) + '" alt="' + esc(p.name) + '" loading="lazy"></div>' +
      '<div class="body"><h3>' + esc(p.name) + '</h3><p>' + esc(p.desc) + '</p><div class="chips">' + p.features.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' +
      '<div class="buy">' + price + act + '</div></div></article>';
  }
  function renderGrid() {
    $('grid').innerHTML = P.length ? P.map(card).join('') : '<p style="color:var(--muted)">এখনো কোনো পণ্য যোগ করা হয়নি।</p>';
    $('pcount').textContent = P.length ? bn(P.length) + 'টি পণ্য' : '';
    $('trio').innerHTML = P.slice(0, 3).map(function (p) { return '<img src="' + esc(img(p)) + '" alt="">'; }).join('');
  }

  /* ---------- কার্ট ---------- */
  function lines() { return Object.keys(cart).map(function (k) { return { p: byId(k), q: cart[k] }; }).filter(function (l) { return l.p && l.q > 0 && l.p.price > 0; }); }
  function sums() {
    var sub = 0; lines().forEach(function (l) { sub += l.p.price * l.q; });
    var del = (S.freeDeliveryMin > 0 && sub >= S.freeDeliveryMin) ? 0 : (area === 'outside' ? S.deliveryOutside : S.deliveryLocal);
    return { sub: sub, del: del, total: sub + del };
  }
  function count() { return lines().reduce(function (a, l) { return a + l.q; }, 0); }
  function renderCart() {
    var n = count(), t = sums();
    $('topCount').textContent = bn(n);
    $('bar').hidden = n === 0; $('wafab').classList.toggle('up', n > 0);
    $('barText').textContent = bn(n) + 'টি পণ্য · ' + tk(t.sub);
    var ls = lines();
    if (!ls.length) { $('lines').innerHTML = '<p style="text-align:center;color:var(--muted);padding:24px 0">কার্ট এখনো খালি। পছন্দের পণ্য যোগ করুন।</p>'; $('checkout').hidden = true; return; }
    $('checkout').hidden = false;
    $('lines').innerHTML = ls.map(function (l) {
      return '<div class="line"><img src="' + esc(img(l.p)) + '" alt=""><div><b>' + esc(l.p.name) + '</b><small class="num">' + tk(l.p.price) + ' × ' + bn(l.q) + '</small></div>' +
        '<span class="step"><button type="button" data-d="-1" data-id="' + esc(l.p.id) + '" aria-label="কমান">−</button><b>' + bn(l.q) + '</b><button type="button" data-d="1" data-id="' + esc(l.p.id) + '" aria-label="বাড়ান">+</button></span></div>';
    }).join('');
    $('sum').innerHTML = '<div><span>পণ্যের দাম</span><span>' + tk(t.sub) + '</span></div><div><span>ডেলিভারি চার্জ</span><span>' + ((S.deliveryLocal || S.deliveryOutside) ? (t.del ? tk(t.del) : 'ফ্রি') : 'কনফার্মের সময়') + '</span></div><div class="t"><span>মোট (ক্যাশ অন ডেলিভারি)</span><span>' + tk(t.total) + '</span></div>';
  }
  function change(id, d) {
    var p = byId(id); if (!p) return;
    var q = (cart[id] || 0) + d;
    if (q > p.stock) { toast('স্টকে আছে মাত্র ' + bn(p.stock) + 'টি'); q = p.stock; }
    if (q <= 0) delete cart[id]; else cart[id] = Math.min(q, 50);
    save(); renderGrid(); renderCart();
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-d]'); if (b) { change(b.getAttribute('data-id'), +b.getAttribute('data-d')); return; }
    var c = e.target.closest('[data-copy]'); if (c) copy(c.getAttribute('data-copy'), 'নম্বর কপি হয়েছে');
  });
  document.addEventListener('change', function (e) {
    if (e.target.name === 'area') { area = e.target.value; renderCart(); }
  });
  function openCart() { $('done').hidden = true; $('veil').hidden = false; renderCart(); $('close').focus(); }
  function closeCart() { $('veil').hidden = true; }
  $('topCart').onclick = openCart; $('barBtn').onclick = openCart; $('close').onclick = closeCart;
  $('veil').addEventListener('click', function (e) { if (e.target === $('veil')) closeCart(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('veil').hidden) closeCart(); });

  /* ---------- অর্ডার ---------- */
  function validate() {
    var err = '';
    if (!$('nm').value.trim()) err = 'আপনার নাম লিখুন।';
    else if (!GM.validPhone(GM.normPhone($('ph').value))) err = '১১ সংখ্যার সঠিক মোবাইল নম্বর লিখুন (যেমন ০১৭XXXXXXXX)।';
    else if ($('ad').value.trim().length < 8) err = 'জেলা ও থানাসহ পূর্ণ ঠিকানা লিখুন।';
    $('err').textContent = err; return !err;
  }
  $('checkout').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;
    var btn = $('place'); btn.disabled = true; btn.textContent = 'অর্ডার পাঠানো হচ্ছে...';
    var snapshot = lines().map(function (l) { return { name: l.p.name, qty: l.q, price: l.p.price }; });
    var data = {
      customerName: $('nm').value, phone: $('ph').value, address: $('ad').value, note: $('nt').value, area: area,
      website: $('web').value, items: lines().map(function (l) { return { pid: l.p.id, qty: l.q }; })
    };
    GMApi.call('placeOrder', data).then(function (r) {
      btn.disabled = false; btn.textContent = 'অর্ডার নিশ্চিত করুন (ক্যাশ অন ডেলিভারি)';
      if (!r.ok) { $('err').textContent = r.error || 'অর্ডার হয়নি।'; if (/স্টক|পণ্য/.test(r.error || '')) refresh(); return; }
      var text = 'আসসালামু আলাইকুম, আমি অর্ডার করেছি।\nঅর্ডার নম্বর: ' + r.orderId + '\n' +
        snapshot.map(function (s, i) { return (i + 1) + '. ' + s.name + ' × ' + s.qty; }).join('\n') + '\nমোট: ' + tk(r.total) + '\nনাম: ' + data.customerName + '\nমোবাইল: ' + data.phone;
      cart = {}; save(); renderGrid(); renderCart();
      $('checkout').hidden = true; $('lines').innerHTML = '';
      var w = waUrl(text);
      $('done').innerHTML = '<h2>অর্ডার হয়েছে ✓</h2><p>ধন্যবাদ, ' + esc(data.customerName) + '। আমরা শীঘ্রই ফোনে কনফার্ম করব।</p>' +
        '<div class="oid">' + esc(r.orderId) + '</div><p class="num">মোট ' + tk(r.total) + ' (ক্যাশ অন ডেলিভারি)</p>' +
        '<div class="send">' + (w ? '<a class="btn wa" href="' + esc(w) + '" target="_blank" rel="noopener">WhatsApp-এ অর্ডার নম্বর পাঠান</a>' : '') +
        '<button class="btn ghost" type="button" data-copy="' + esc(r.orderId) + '">অর্ডার নম্বর কপি করুন</button><button class="btn soft" type="button" id="again">আরও কেনাকাটা করুন</button></div>';
      $('done').hidden = false;
      $('again').onclick = closeCart;
    });
  });

  /* ---------- লোড ---------- */
  function apply(d) {
    S = Object.assign({}, GM.DEFAULTS, d.settings || {});
    P = (d.products || []).map(function (p) { return Object.assign({ features: [], stock: 0, price: 0 }, p); });
    Object.keys(cart).forEach(function (k) { var p = byId(k); if (!p || p.price <= 0 || p.stock <= 0) delete cart[k]; else if (cart[k] > p.stock) cart[k] = p.stock; });
    applySettings(); renderGrid(); renderCart();
  }
  function refresh() {
    return GMApi.call('public').then(function (r) {
      if (!r.ok) { if (!loaded) $('grid').innerHTML = '<p style="color:var(--bad)">' + esc(r.error) + '</p>'; return; }
      loaded = true; apply(r);
      try { localStorage.setItem('gm_public_cache', JSON.stringify({ settings: r.settings, products: r.products })); } catch (e) {}
    });
  }
  if (GMApi.demo) {
    var dm = $('demo'); dm.hidden = false;
    dm.innerHTML = 'ডেমো মোড: ডেটা শুধু এই ব্রাউজারে থাকে। <a href="admin.html">অ্যাডমিন প্যানেল</a> (পাসওয়ার্ড: ' + esc(GMApi.demoPassword) + ')';
  }
  applySettings();
  try { var cache = JSON.parse(localStorage.getItem('gm_public_cache') || 'null'); if (cache && GMApi.remote) { apply(cache); loaded = true; } } catch (e) {}
  refresh();
})();
