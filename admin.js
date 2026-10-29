/* অ্যাডমিন প্যানেল */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  var esc = GM.esc;
  var ST = { new: 'নতুন', confirmed: 'কনফার্ম', shipped: 'শিপড', delivered: 'ডেলিভারড', cancelled: 'বাতিল' };
  var CATS = ['কুরিয়ার/ডেলিভারি', 'বিজ্ঞাপন', 'প্যাকেজিং', 'দোকান ভাড়া', 'বেতন', 'যাতায়াত', 'অন্যান্য'];
  var NAV = [['dash', 'ড্যাশবোর্ড', 'dash'], ['orders', 'অর্ডার ও বিক্রয়', 'orders'], ['products', 'পণ্য', 'products'], ['buy', 'ক্রয়', 'buy'],
    ['exp', 'খরচ', 'expense'], ['report', 'হিসাব ও লাভ', 'report'], ['settings', 'সেটিংস', 'settings']];
  var ICONS = {
    dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    orders: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    products: '<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/>',
    buy: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 20h16"/>',
    expense: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
    report: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'
  };
  var PH = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#e8e4d4"/><text x="60" y="68" font-size="40" text-anchor="middle" fill="#a97a1f">★</text></svg>');
  var st = { pw: '', db: null, view: 'dash', period: 'month', of: 'all', oq: '', rf: '', rt: '' };

  /* ---------- সহায়ক ---------- */
  function ic(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[n] + '</svg>'; }
  function bn(n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); }
  function nf(n) { n = Math.round((Number(n) || 0) * 100) / 100; return bn(n.toLocaleString('en-US')); }
  function tk(n) { var v = Number(n) || 0; return (v < 0 ? '−' : '') + '৳' + nf(Math.abs(v)); }
  function today() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }); }
  function addDays(s, n) { var d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function fd(s) { s = String(s || ''); return s.length >= 10 ? bn(s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4)) : ''; }
  function imgSrc(p) { if (!p) return PH; return GM.imgPath(p); }
  function find(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
  function toast(t) { var el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 2800); }
  function copy(text, msg) {
    function fb() { var ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); toast(msg); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(msg); }, fb); else fb();
  }
  function opts(list, sel) { return list.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === sel ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join(''); }
  function statusOpts(sel) { return opts(Object.keys(ST).map(function (k) { return [k, ST[k]]; }), sel); }
  function badge(s) { return '<span class="badge b-' + esc(s) + '">' + esc(ST[s] || s) + '</span>'; }
  function waCustomer(o, text) { return o.phone ? 'https://wa.me/88' + o.phone + '?text=' + encodeURIComponent(text) : ''; }

  function api(action, data) {
    return GMApi.call(action, data || {}, st.pw).then(function (r) {
      if (!r.ok) {
        if (/পাসওয়ার্ড ভুল/.test(r.error || '')) logout(true);
        throw new Error(r.error || 'কিছু একটা ভুল হয়েছে।');
      }
      return r;
    });
  }
  function refresh() { return api('adminData').then(function (r) { st.db = r; renderApp(); }); }
  function fail(e) { var el = $('merr'); if (el) el.textContent = e.message; else toast(e.message); var b = document.querySelector('#modalHost [type=submit]'); if (b) b.disabled = false; }

  /* ---------- লগইন ---------- */
  function showLogin(msg) {
    $('app').hidden = true; $('login').hidden = false; $('lerr').textContent = msg || '';
    if (GMApi.demo) $('lsub').textContent = 'ডেমো মোড: পাসওয়ার্ড ' + GMApi.demoPassword;
  }
  function logout(silent) {
    st.pw = ''; st.db = null;
    try { sessionStorage.removeItem('gm_pw'); localStorage.removeItem('gm_pw_l'); } catch (e) {}
    showLogin(silent === true ? 'আবার লগইন করুন।' : '');
  }
  function enter(pw, remember) {
    st.pw = pw;
    return refresh().then(function () {
      try { sessionStorage.setItem('gm_pw', pw); if (remember) localStorage.setItem('gm_pw_l', pw); } catch (e) {}
      $('login').hidden = true; $('app').hidden = false;
    });
  }
  $('lf').addEventListener('submit', function (e) {
    e.preventDefault();
    var b = $('lbtn'); b.disabled = true; $('lerr').textContent = '';
    GMApi.call('login', {}, $('lpw').value).then(function (r) {
      b.disabled = false;
      if (!r.ok) { $('lerr').textContent = r.error; return; }
      enter($('lpw').value, $('lrem').checked).catch(function (x) { $('lerr').textContent = x.message; });
    });
  });

  /* ---------- মডাল ---------- */
  function openModal(title, body, wide) {
    $('modalHost').innerHTML = '<div class="veil" id="mv"><div class="sheet' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true"><header><h2>' + title +
      '</h2><button class="x" type="button" data-act="closeModal" aria-label="বন্ধ করুন">✕</button></header>' + body + '</div></div>';
    var f = document.querySelector('#modalHost input:not([type=hidden]),#modalHost select,#modalHost textarea'); if (f && !/^(date|checkbox|file)$/.test(f.type)) f.focus();
  }
  function closeModal() { $('modalHost').innerHTML = ''; document.body.classList.remove('pr-voucher'); }
  $('modalHost').addEventListener('click', function (e) { if (e.target.id === 'mv') closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('modalHost').innerHTML) closeModal(); });
  window.addEventListener('afterprint', function () { document.body.classList.remove('pr-voucher'); });

  /* ---------- চার্ট ---------- */
  function niceMax(v) { if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
  function chart(daily) {
    if (!daily.length) return '<div class="empty">এই সময়ে ডেলিভারড বিক্রি নেই।</div>';
    var W = 640, H = 230, pl = 52, pr = 10, pt = 10, pb = 26, iw = W - pl - pr, ih = H - pt - pb;
    var hi = niceMax(Math.max.apply(null, daily.map(function (d) { return Math.max(d.revenue, d.profit, 0); })));
    var minP = Math.min.apply(null, daily.map(function (d) { return d.profit; }).concat([0]));
    var lo = minP < 0 ? -niceMax(-minP) : 0;
    var y = function (v) { return pt + ih * (hi - v) / (hi - lo); };
    var n = daily.length, slot = iw / n, bw = Math.min(30, slot * .7), out = '';
    var ticks = lo < 0 ? [lo, 0, hi / 2, hi] : [0, hi / 2, hi];
    ticks.forEach(function (t) {
      out += '<line class="ax" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text x="' + (pl - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + nf(t) + '</text>';
    });
    var every = Math.ceil(n / 10);
    daily.forEach(function (d, i) {
      var cx = pl + slot * i + slot / 2, r0 = y(0);
      out += '<rect x="' + (cx - bw / 2) + '" y="' + Math.min(y(d.revenue), r0) + '" width="' + bw + '" height="' + Math.max(1, Math.abs(r0 - y(d.revenue))) + '" rx="2" fill="var(--accent)"/>';
      out += '<rect x="' + (cx - bw * .3) + '" y="' + Math.min(y(d.profit), r0) + '" width="' + (bw * .6) + '" height="' + Math.max(1, Math.abs(r0 - y(d.profit))) + '" rx="2" fill="var(--gold)"/>';
      if (i % every === 0) out += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + bn(d.date.slice(8, 10) + '/' + d.date.slice(5, 7)) + '</text>';
    });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="দিনভিত্তিক বিক্রয় ও লাভের চার্ট">' + out + '</svg>' +
      '<div class="legend"><span><i style="background:var(--accent)"></i>বিক্রয়</span><span><i style="background:var(--gold)"></i>লাভ (খরচ বাদে)</span></div>';
  }

  /* ---------- ভিউ ---------- */
  function range() {
    var t = today();
    if (st.period === 'today') return [t, t];
    if (st.period === 'week') return [addDays(t, -6), t];
    if (st.period === 'month') return [t.slice(0, 8) + '01', t];
    return ['', ''];
  }
  function chipsHtml(list, cur, act) {
    return '<div class="chips">' + list.map(function (c) { return '<button class="chip" type="button" data-act="' + act + '" data-v="' + c[0] + '" aria-pressed="' + (c[0] === cur) + '">' + esc(c[1]) + '</button>'; }).join('') + '</div>';
  }
  function itemsText(o) { var a = o.items.slice(0, 2).map(function (i) { return esc(i.name) + ' × ' + bn(i.qty); }); return a.join(', ') + (o.items.length > 2 ? ' +' + bn(o.items.length - 2) : ''); }

  var VIEWS = {};
  VIEWS.dash = function () {
    var r = range(), R = GM.report(st.db, r[0], r[1]), db = st.db;
    var newN = db.orders.filter(function (o) { return o.status === 'new'; }).length;
    var low = db.products.filter(function (p) { return p.active !== false && p.stock <= 3; });
    var recent = db.orders.slice(0, 5);
    var html = chipsHtml([['today', 'আজ'], ['week', 'গত ৭ দিন'], ['month', 'এই মাস'], ['all', 'সব সময়']], st.period, 'period') +
      '<div class="stack"><div class="kpis">' +
      '<div class="kpi"><span>বিক্রয় (ডেলিভারড)</span><b>' + tk(R.delivered.revenue) + '</b><small>' + bn(R.delivered.count) + 'টি অর্ডার</small></div>' +
      '<div class="kpi ' + (R.net >= 0 ? 'good' : 'bad') + '"><span>নেট লাভ</span><b>' + tk(R.net) + '</b><small>খরচ বাদে</small></div>' +
      '<div class="kpi gold"><span>নতুন অর্ডার</span><b>' + bn(newN) + '</b><small>কনফার্মের অপেক্ষায়</small></div>' +
      '<div class="kpi"><span>চলমান অর্ডার</span><b>' + bn(R.open.count) + '</b><small>সম্ভাব্য ' + tk(R.open.revenue) + '</small></div>' +
      '<div class="kpi"><span>খরচ</span><b>' + tk(R.expenses.total) + '</b><small>' + bn(R.expenses.count) + 'টি এন্ট্রি</small></div>' +
      '<div class="kpi"><span>স্টকের মূল্য</span><b>' + tk(R.stockValue) + '</b><small>' + bn(R.stockQty) + ' পিস</small></div></div>' +
      '<div class="panel"><h2>দিনভিত্তিক বিক্রয় ও লাভ</h2>' + chart(R.daily) + '</div>' +
      '<div class="two"><div class="panel"><h2>সাম্প্রতিক অর্ডার</h2>' + (recent.length ? '<div class="scroll"><table class="t"><tbody>' + recent.map(function (o) {
        return '<tr><td><a href="#orders" data-act="openOrder" data-id="' + esc(o.id) + '">' + esc(o.id) + '</a><br><small class="muted">' + esc(o.customerName) + '</small></td><td>' + badge(o.status) + '</td><td class="r">' + tk(o.total) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty">এখনো কোনো অর্ডার নেই।</div>') + '</div>' +
      '<div class="panel"><h2>স্টক কম</h2>' + (low.length ? '<div class="scroll"><table class="t"><tbody>' + low.map(function (p) {
        return '<tr><td>' + esc(p.name) + '</td><td class="r"><span class="badge ' + (p.stock <= 0 ? 'b-cancelled' : 'b-new') + '">' + (p.stock <= 0 ? 'শেষ' : bn(p.stock) + ' পিস') + '</span></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty">সব পণ্যের স্টক ঠিক আছে।</div>') + '</div></div></div>';
    return { title: 'ড্যাশবোর্ড', html: html, acts: '<button class="btn" type="button" data-act="newSale">+ নতুন বিক্রি</button>' };
  };

  VIEWS.orders = function () {
    var cnt = { all: st.db.orders.length };
    Object.keys(ST).forEach(function (k) { cnt[k] = st.db.orders.filter(function (o) { return o.status === k; }).length; });
    var list = [['all', 'সব (' + bn(cnt.all) + ')']].concat(Object.keys(ST).map(function (k) { return [k, ST[k] + ' (' + bn(cnt[k]) + ')']; }));
    return { title: 'অর্ডার ও বিক্রয়', acts: '<button class="btn" type="button" data-act="newSale">+ নতুন বিক্রি</button>',
      html: chipsHtml(list, st.of, 'ofilter') + '<input class="search" id="oq" type="search" placeholder="অর্ডার নম্বর, নাম বা মোবাইল দিয়ে খুঁজুন" value="' + esc(st.oq) + '" aria-label="অর্ডার খুঁজুন"><div class="orows" id="olist"></div>', after: drawOrders };
  };
  function drawOrders() {
    var q = st.oq.trim().toLowerCase();
    var list = st.db.orders.filter(function (o) {
      return (st.of === 'all' || o.status === st.of) && (!q || (o.id + ' ' + o.customerName + ' ' + o.phone).toLowerCase().indexOf(q) >= 0);
    });
    $('olist').innerHTML = list.length ? list.map(function (o) {
      var wa = waCustomer(o, 'আসসালামু আলাইকুম ' + o.customerName + ', ' + st.db.settings.shopName + ' থেকে আপনার অর্ডার ' + o.id + ' (' + tk(o.total).replace('৳', '') + ' টাকা) নিয়ে যোগাযোগ করছি।');
      return '<div class="orow"><div class="who"><span class="id">' + esc(o.id) + '</span><span class="src">' + (o.source === 'admin' ? 'দোকান' : 'ওয়েব') + '</span><div class="meta">' + fd(o.date) + '</div>' +
        '<b>' + esc(o.customerName) + '</b><span class="meta">' + esc(o.phone ? bn(o.phone) : '') + (o.address ? ' · ' + esc(o.address.slice(0, 48)) : '') + '</span></div>' +
        '<div class="items meta">' + itemsText(o) + '</div>' +
        '<div class="amt"><b>' + tk(o.total) + '</b>' + badge(o.status) + '</div>' +
        '<div class="ctl"><select data-sid="' + esc(o.id) + '" aria-label="স্ট্যাটাস">' + statusOpts(o.status) + '</select>' +
        '<button class="btn sm ghost" type="button" data-act="openOrder" data-id="' + esc(o.id) + '">এডিট</button>' +
        '<button class="btn sm soft" type="button" data-act="voucher" data-id="' + esc(o.id) + '">ভাউচার</button>' +
        (wa ? '<a class="btn sm wa" href="' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') + '</div></div>';
    }).join('') : '<div class="empty">কোনো অর্ডার পাওয়া যায়নি।</div>';
  }

  VIEWS.products = function () {
    var P = st.db.products, sv = 0;
    P.forEach(function (p) { sv += p.stock * p.cost; });
    var rows = P.map(function (p) {
      var m = p.price - p.cost, pct = p.price > 0 ? Math.round(m / p.price * 100) : 0;
      return '<tr><td><div class="pn"><img class="thumb" src="' + esc(imgSrc(p.image)) + '" alt=""><div><b>' + esc(p.name) + '</b><small>' + esc(p.tag) + '</small></div></div></td>' +
        '<td class="r">' + (p.price > 0 ? tk(p.price) : '<span class="muted">দাম নেই</span>') + '</td><td class="r">' + tk(p.cost) + '</td>' +
        '<td class="r ' + (m > 0 ? 'pos' : m < 0 ? 'neg' : '') + '">' + (p.price > 0 ? tk(m) + ' <small>(' + bn(pct) + '%)</small>' : '–') + '</td>' +
        '<td class="r"><span class="badge ' + (p.stock <= 0 ? 'b-cancelled' : p.stock <= 3 ? 'b-new' : 'b-delivered') + '">' + bn(p.stock) + '</span></td>' +
        '<td><label class="sw"><input type="checkbox" data-tog="' + esc(p.id) + '"' + (p.active !== false ? ' checked' : '') + ' aria-label="দোকানে দেখান"><i></i></label></td>' +
        '<td class="r" style="white-space:nowrap"><button class="btn sm ghost" type="button" data-act="editProduct" data-id="' + esc(p.id) + '">এডিট</button> <button class="btn sm soft" type="button" data-act="delProduct" data-id="' + esc(p.id) + '">ডিলিট</button></td></tr>';
    }).join('');
    return { title: 'পণ্য', acts: '<button class="btn" type="button" data-act="newProduct">+ নতুন পণ্য</button>',
      html: '<div class="panel"><div class="scroll"><table class="t"><thead><tr><th>পণ্য</th><th class="r">বিক্রয়মূল্য</th><th class="r">ক্রয়মূল্য</th><th class="r">লাভ/পিস</th><th class="r">স্টক</th><th>দোকানে</th><th></th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="7" class="empty">কোনো পণ্য নেই। “নতুন পণ্য” চাপুন।</td></tr>') + '</tbody><tfoot><tr><td colspan="4">স্টকের মোট মূল্য (ক্রয়মূল্যে)</td><td class="r" colspan="3">' + tk(sv) + '</td></tr></tfoot></table></div></div>' };
  };

  VIEWS.buy = function () {
    var B = st.db.purchases, tot = 0;
    B.forEach(function (b) { tot += b.qty * b.unitCost; });
    var rows = B.map(function (b) {
      return '<tr><td>' + fd(b.date) + '</td><td>' + esc(b.name) + '</td><td class="r">' + bn(b.qty) + '</td><td class="r">' + tk(b.unitCost) + '</td><td class="r">' + tk(b.qty * b.unitCost) + '</td><td>' + esc(b.supplier) + '</td>' +
        '<td class="r" style="white-space:nowrap"><button class="btn sm soft" type="button" data-act="bvoucher" data-id="' + esc(b.id) + '">ভাউচার</button> <button class="btn sm soft" type="button" data-act="delBuy" data-id="' + esc(b.id) + '">ডিলিট</button></td></tr>';
    }).join('');
    return { title: 'ক্রয়', acts: '<button class="btn" type="button" data-act="newBuy">+ নতুন ক্রয়</button>',
      html: '<div class="panel"><p class="hint" style="margin-top:0">ক্রয় যোগ করলে স্টক বাড়ে এবং পণ্যের গড় ক্রয়মূল্য নিজে থেকে হিসাব হয়। ভুল হলে ডিলিট করে আবার যোগ করুন (স্টক ফিরে যাবে)।</p><div class="scroll"><table class="t"><thead><tr><th>তারিখ</th><th>পণ্য</th><th class="r">পরিমাণ</th><th class="r">একক দাম</th><th class="r">মোট</th><th>সরবরাহকারী</th><th></th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="7" class="empty">এখনো কোনো ক্রয় যোগ করা হয়নি।</td></tr>') + '</tbody><tfoot><tr><td colspan="4">মোট ক্রয়</td><td class="r" colspan="3">' + tk(tot) + '</td></tr></tfoot></table></div></div>' };
  };

  VIEWS.exp = function () {
    var E = st.db.expenses, tot = 0;
    E.forEach(function (e) { tot += e.amount; });
    var rows = E.map(function (e) {
      return '<tr><td>' + fd(e.date) + '</td><td>' + esc(e.category) + '</td><td>' + esc(e.note) + '</td><td class="r">' + tk(e.amount) + '</td><td class="r"><button class="btn sm soft" type="button" data-act="delExp" data-id="' + esc(e.id) + '">ডিলিট</button></td></tr>';
    }).join('');
    return { title: 'খরচ', acts: '<button class="btn" type="button" data-act="newExp">+ নতুন খরচ</button>',
      html: '<div class="panel"><div class="scroll"><table class="t"><thead><tr><th>তারিখ</th><th>ধরন</th><th>বিবরণ</th><th class="r">টাকা</th><th></th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="5" class="empty">কোনো খরচ যোগ করা হয়নি।</td></tr>') + '</tbody><tfoot><tr><td colspan="3">মোট খরচ</td><td class="r" colspan="2">' + tk(tot) + '</td></tr></tfoot></table></div></div>' };
  };

  function reportRange() { if (!st.rf && !st.rt && st.rq !== 'all') { var t = today(); st.rf = t.slice(0, 8) + '01'; st.rt = t; } return [st.rf, st.rt]; }
  VIEWS.report = function () {
    var r = reportRange(), R = GM.report(st.db, r[0], r[1]), D = R.delivered;
    function row(l, v, cls) { return '<tr><td>' + l + '</td><td class="r ' + (cls || '') + '">' + v + '</td></tr>'; }
    var cats = Object.keys(R.expenses.byCat).map(function (c) { return row(esc(c), tk(R.expenses.byCat[c])); }).join('');
    var prods = R.byProduct.map(function (p) { return '<tr><td>' + esc(p.name) + '</td><td class="r">' + bn(p.qty) + '</td><td class="r">' + tk(p.revenue) + '</td><td class="r ' + (p.profit >= 0 ? 'pos' : 'neg') + '">' + tk(p.profit) + '</td></tr>'; }).join('');
    var html = '<div class="panel noprint" style="margin-bottom:14px"><div class="grid2"><label class="field">শুরুর তারিখ<input type="date" id="rf" value="' + esc(st.rf) + '"></label><label class="field">শেষ তারিখ<input type="date" id="rt" value="' + esc(st.rt) + '"></label></div>' +
      '<div class="chips" style="margin:10px 0 0"><button class="chip" type="button" data-act="rrange" data-v="today">আজ</button><button class="chip" type="button" data-act="rrange" data-v="week">গত ৭ দিন</button><button class="chip" type="button" data-act="rrange" data-v="month">এই মাস</button><button class="chip" type="button" data-act="rrange" data-v="year">এই বছর</button><button class="chip" type="button" data-act="rrange" data-v="all">সব সময়</button></div></div>' +
      '<div class="stack"><div class="kpis"><div class="kpi"><span>মোট আয়</span><b>' + tk(D.revenue) + '</b></div><div class="kpi"><span>মোট লাভ</span><b>' + tk(D.gross) + '</b><small>খরচের আগে</small></div><div class="kpi ' + (R.net >= 0 ? 'good' : 'bad') + '"><span>নেট লাভ</span><b>' + tk(R.net) + '</b><small>খরচ বাদে</small></div></div>' +
      '<div class="two"><div class="panel"><h2>লাভ-ক্ষতির হিসাব</h2><div class="scroll"><table class="t"><tbody>' +
      row('ডেলিভারড অর্ডার', bn(D.count) + 'টি (' + bn(D.qty) + ' পিস)') + row('পণ্য বিক্রয়', tk(D.items)) + row('(−) ছাড়', tk(D.discount)) + row('(+) ডেলিভারি চার্জ আয়', tk(D.delivery)) +
      row('<b>মোট আয়</b>', '<b>' + tk(D.revenue) + '</b>') + row('(−) পণ্যের ক্রয়মূল্য', tk(D.cogs)) + row('<b>মোট লাভ</b>', '<b>' + tk(D.gross) + '</b>') + row('(−) খরচ', tk(R.expenses.total)) +
      row('<b>নেট লাভ</b>', '<b>' + tk(R.net) + '</b>', R.net >= 0 ? 'pos' : 'neg') + '</tbody></table></div></div>' +
      '<div class="panel"><h2>অন্যান্য হিসাব</h2><div class="scroll"><table class="t"><tbody>' +
      row('চলমান অর্ডার', bn(R.open.count) + 'টি') + row('চলমান অর্ডারের বিক্রয়', tk(R.open.revenue)) + row('চলমান অর্ডারের সম্ভাব্য লাভ', tk(R.open.gross)) +
      row('এই সময়ে পণ্য ক্রয়', tk(R.purchases.total) + ' (' + bn(R.purchases.count) + 'টি)') + row('বর্তমান স্টকের মূল্য', tk(R.stockValue)) + cats + '</tbody></table></div></div></div>' +
      '<div class="panel"><h2>দিনভিত্তিক চার্ট</h2>' + chart(R.daily) + '</div>' +
      '<div class="panel"><h2>পণ্য অনুযায়ী বিক্রি</h2><div class="scroll"><table class="t"><thead><tr><th>পণ্য</th><th class="r">পিস</th><th class="r">বিক্রয়</th><th class="r">লাভ</th></tr></thead><tbody>' +
      (prods || '<tr><td colspan="4" class="empty">এই সময়ে কোনো ডেলিভারড বিক্রি নেই।</td></tr>') + '</tbody></table></div></div></div>';
    return { title: 'হিসাব ও লাভ', html: html, acts: '<button class="btn ghost" type="button" data-act="csv">CSV ডাউনলোড</button><button class="btn ghost" type="button" data-act="printReport">প্রিন্ট</button>' };
  };

  VIEWS.settings = function () {
    var S = st.db.settings;
    function f(k, label, extra, type) { return '<label class="field" for="s_' + k + '">' + label + '<input id="s_' + k + '" type="' + (type || 'text') + '" value="' + esc(S[k]) + '">' + (extra ? '<small>' + extra + '</small>' : '') + '</label>'; }
    var html = '<form id="sf" class="stack" novalidate><div class="panel"><div class="sec">দোকানের তথ্য</div><div class="grid2">' + f('shopName', 'দোকানের নাম') + f('tagline', 'ট্যাগলাইন') + f('address', 'ঠিকানা', 'ভাউচার ও ওয়েবসাইটে দেখাবে') + '</div></div>' +
      '<div class="panel"><div class="sec">যোগাযোগ ও WhatsApp</div><div class="grid2">' + f('phone1', 'ফোন নম্বর ১') + f('phone2', 'ফোন নম্বর ২') +
      f('whatsappNumber', 'WhatsApp নম্বর', 'যেমন ০১৮৪৪৫৩১৩৬২। অর্ডার ও মেসেজ এই নম্বরে যাবে') + f('whatsappLink', 'WhatsApp লিংক (ঐচ্ছিক)', 'গ্রুপ বা চ্যানেলের লিংক। নম্বর থাকলে নম্বরই ব্যবহার হবে') + f('facebookUrl', 'ফেসবুক পেজের লিংক') + '</div></div>' +
      '<div class="panel"><div class="sec">অর্ডারের ইমেইল</div><div class="grid2">' + f('notifyEmail', 'যে ইমেইলে অর্ডারের খবর যাবে', 'ফাঁকা রাখলে Apps Script যে Google অ্যাকাউন্টে বানানো, সেখানে যাবে', 'email') + '</div></div>' +
      '<div class="panel"><div class="sec">ডেলিভারি</div><div class="grid2">' + f('localArea', 'নিজের এলাকার নাম', 'যেমন রাজশাহী') + f('deliveryLocal', 'নিজের এলাকায় ডেলিভারি চার্জ (৳)', '', 'number') + f('deliveryOutside', 'অন্য জেলায় ডেলিভারি চার্জ (৳)', '', 'number') + f('freeDeliveryMin', 'এত টাকার বেশি কিনলে ফ্রি ডেলিভারি (৳)', '০ দিলে বন্ধ', 'number') + f('codNote', 'ক্যাশ অন ডেলিভারি নোট') + '</div></div>' +
      '<div class="panel"><div class="sec">হোমপেজ ও ভাউচার</div><div class="grid2">' + f('heroTitle', 'হোমপেজের বড় লেখা') + '<label class="field" for="s_heroText">হোমপেজের বিবরণ<textarea id="s_heroText" rows="3">' + esc(S.heroText) + '</textarea></label>' + f('voucherNote', 'ভাউচারের নিচের ধন্যবাদ লেখা') + '</div></div>' +
      '<div class="err" id="serr"></div><div><button class="btn" type="submit">সেটিংস সংরক্ষণ করুন</button></div></form>' +
      '<div class="two" style="margin-top:14px"><form id="pf" class="panel stack" novalidate><div class="sec">পাসওয়ার্ড পরিবর্তন</div><label class="field" for="np">নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)<input id="np" type="password" autocomplete="new-password"></label><label class="field" for="np2">আবার লিখুন<input id="np2" type="password" autocomplete="new-password"></label><div class="err" id="perr"></div><div><button class="btn" type="submit">পাসওয়ার্ড বদলান</button></div></form>' +
      '<div class="panel stack"><div class="sec">ডেটা ব্যাকআপ</div><p class="hint" style="margin:0">সব পণ্য, অর্ডার, ক্রয় ও খরচ একটি ফাইলে ডাউনলোড হবে। ডেটা মূল জায়গায় আপনার Google Sheet-এও থাকে।</p><div><button class="btn ghost" type="button" data-act="backup">ব্যাকআপ ডাউনলোড</button></div>' +
      '<p class="hint" style="margin:0">মোড: <b>' + (st.db.mode === 'demo' ? 'ডেমো (এই ব্রাউজারে)' : 'লাইভ (Google Sheet)') + '</b></p></div></div>';
    return { title: 'সেটিংস', html: html, after: function () {
      $('sf').addEventListener('submit', function (e) {
        e.preventDefault();
        var d = {}; ['shopName', 'tagline', 'address', 'phone1', 'phone2', 'whatsappNumber', 'whatsappLink', 'facebookUrl', 'notifyEmail', 'localArea', 'deliveryLocal', 'deliveryOutside', 'freeDeliveryMin', 'codNote', 'heroTitle', 'heroText', 'voucherNote'].forEach(function (k) { d[k] = $('s_' + k).value; });
        api('saveSettings', d).then(function () { toast('সেটিংস সংরক্ষিত হয়েছে'); return refresh(); }).catch(function (x) { $('serr').textContent = x.message; });
      });
      $('pf').addEventListener('submit', function (e) {
        e.preventDefault();
        if ($('np').value !== $('np2').value) { $('perr').textContent = 'দুটি পাসওয়ার্ড মিলছে না।'; return; }
        api('changePassword', { newPassword: $('np').value }).then(function () {
          st.pw = $('np').value; try { sessionStorage.setItem('gm_pw', st.pw); if (localStorage.getItem('gm_pw_l')) localStorage.setItem('gm_pw_l', st.pw); } catch (x) {}
          $('np').value = ''; $('np2').value = ''; $('perr').textContent = ''; toast('পাসওয়ার্ড বদলানো হয়েছে');
        }).catch(function (x) { $('perr').textContent = x.message; });
      });
    } };
  };

  function renderApp() {
    var nNew = st.db.orders.filter(function (o) { return o.status === 'new'; }).length;
    $('sName').textContent = st.db.settings.shopName;
    document.title = st.db.settings.shopName + ' অ্যাডমিন';
    $('nav').innerHTML = NAV.map(function (n) {
      return '<button type="button" data-act="nav" data-v="' + n[0] + '"' + (st.view === n[0] ? ' aria-current="page"' : '') + '>' + ic(n[2]) + '<span>' + n[1] + '</span>' +
        (n[0] === 'orders' && nNew ? '<span class="cnt">' + bn(nNew) + '</span>' : '') + '</button>';
    }).join('');
    var out = (VIEWS[st.view] || VIEWS.dash)();
    $('vtitle').textContent = out.title; $('vacts').innerHTML = out.acts || ''; $('view').innerHTML = out.html;
    $('demo').hidden = st.db.mode !== 'demo';
    if (out.after) out.after();
  }
  function go(v) { st.view = VIEWS[v] ? v : 'dash'; if (st.db) { renderApp(); window.scrollTo(0, 0); } }
  window.addEventListener('hashchange', function () { go(location.hash.replace('#', '')); });

  /* ---------- ছবি ---------- */
  function resizeImage(file, max) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () {
        var im = new Image();
        im.onload = function () {
          var r = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.round(im.width * r); c.height = Math.round(im.height * r);
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
          var u = c.toDataURL('image/jpeg', .82); res({ mime: 'image/jpeg', data: u.split(',')[1], url: u });
        };
        im.onerror = function () { rej(new Error('ছবি পড়া যায়নি।')); }; im.src = fr.result;
      };
      fr.onerror = function () { rej(new Error('ছবি পড়া যায়নি।')); }; fr.readAsDataURL(file);
    });
  }

  /* ---------- পণ্যের মডাল ---------- */
  function productModal(id) {
    var p = id ? find(st.db.products, id) : null;
    p = p || { name: '', tag: '', desc: '', features: [], price: '', cost: '', stock: 0, image: '', active: true, sort: '' };
    function fld(i, l, v, t, ex) { return '<label class="field" for="' + i + '">' + l + '<input id="' + i + '" type="' + (t || 'text') + '" value="' + esc(v) + '"' + (t === 'number' ? ' min="0" step="any"' : '') + '>' + (ex ? '<small>' + ex + '</small>' : '') + '</label>'; }
    openModal(id ? 'পণ্য এডিট' : 'নতুন পণ্য',
      '<form id="mf" class="stack" novalidate>' + fld('pn', 'পণ্যের নাম', p.name) + '<div class="grid2">' + fld('pt', 'ধরন (ট্যাগ)', p.tag, 'text', 'যেমন শেখার বই') + fld('ps', 'সাজানোর ক্রম', p.sort, 'number', 'ছোট সংখ্যা আগে দেখায়') + '</div>' +
      '<label class="field" for="pd">বিবরণ<textarea id="pd" rows="2" maxlength="400">' + esc(p.desc) + '</textarea></label>' + fld('pf', 'বৈশিষ্ট্য (কমা দিয়ে আলাদা করুন)', (p.features || []).join(', ')) +
      '<div class="grid2">' + fld('pp', 'বিক্রয়মূল্য (৳)', p.price, 'number') + fld('pc', 'ক্রয়মূল্য (৳)', p.cost, 'number', 'ক্রয় এন্ট্রি দিলে গড় নিজে হিসাব হবে') + fld('pk', 'স্টক (পিস)', p.stock, 'number') + '</div>' +
      '<div class="hint" id="pm"></div>' +
      '<div class="preview"><img id="pimgp" src="' + esc(imgSrc(p.image)) + '" alt=""><div style="flex:1;min-width:0">' + fld('pimg', 'ছবির লিংক বা পথ', p.image, 'text', 'যেমন magic.jpg') +
      '<div style="margin-top:6px"><label class="btn sm ghost" for="pfile" style="cursor:pointer">ছবি আপলোড</label><input id="pfile" type="file" accept="image/*" hidden> <span class="hint" id="pup"></span></div></div></div>' +
      '<label class="chk"><input type="checkbox" id="pa"' + (p.active !== false ? ' checked' : '') + '> দোকানে দেখান</label>' +
      '<div class="err" id="merr"></div><div class="mfoot"><button class="btn soft" type="button" data-act="closeModal">বাতিল</button><button class="btn" type="submit">সংরক্ষণ</button></div></form>');
    function margin() { var pr = GM.num($('pp').value), c = GM.num($('pc').value); $('pm').textContent = pr > 0 ? 'প্রতি পিসে লাভ: ' + tk(pr - c) + ' (' + bn(Math.round((pr - c) / pr * 100)) + '%)' : ''; }
    $('pp').addEventListener('input', margin); $('pc').addEventListener('input', margin); margin();
    $('pimg').addEventListener('input', function () { $('pimgp').src = imgSrc($('pimg').value); });
    $('pfile').addEventListener('change', function () {
      var f = this.files[0]; if (!f) return;
      $('pup').textContent = 'আপলোড হচ্ছে...';
      resizeImage(f, 800).then(function (im) { return api('uploadImage', { data: im.data, mime: im.mime }); })
        .then(function (r) { $('pimg').value = r.url; $('pimgp').src = r.url; $('pup').textContent = 'আপলোড হয়েছে'; })
        .catch(function (e) { $('pup').textContent = ''; fail(e); });
    });
    $('mf').addEventListener('submit', function (e) {
      e.preventDefault();
      var d = { id: id || '', name: $('pn').value, tag: $('pt').value, sort: $('ps').value, desc: $('pd').value, features: $('pf').value, price: $('pp').value, cost: $('pc').value, stock: $('pk').value, image: $('pimg').value, active: $('pa').checked };
      api('saveProduct', d).then(function () { closeModal(); toast('পণ্য সংরক্ষিত হয়েছে'); return refresh(); }).catch(fail);
    });
  }

  /* ---------- ক্রয় ও খরচের মডাল ---------- */
  function buyModal() {
    var P = st.db.products;
    if (!P.length) { toast('আগে পণ্য যোগ করুন।'); return; }
    openModal('নতুন ক্রয়', '<form id="mf" class="stack" novalidate><div class="grid2"><label class="field" for="bd">তারিখ<input id="bd" type="date" value="' + today() + '"></label>' +
      '<label class="field" for="bp">পণ্য<select id="bp">' + P.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + ' (স্টক ' + bn(p.stock) + ')</option>'; }).join('') + '</select></label>' +
      '<label class="field" for="bq">পরিমাণ<input id="bq" type="number" min="1" step="1" value="1"></label><label class="field" for="bc">একক ক্রয়মূল্য (৳)<input id="bc" type="number" min="0" step="any"></label>' +
      '<label class="field" for="bs">সরবরাহকারী<input id="bs"></label><label class="field" for="bn">নোট<input id="bn"></label></div><div class="tot"><div class="g"><span>মোট</span><span id="bt">৳০</span></div></div>' +
      '<div class="err" id="merr"></div><div class="mfoot"><button class="btn soft" type="button" data-act="closeModal">বাতিল</button><button class="btn" type="submit">ক্রয় যোগ করুন</button></div></form>');
    function pre() { var p = find(P, $('bp').value); if (p) $('bc').value = p.cost || ''; tot(); }
    function tot() { $('bt').textContent = tk(GM.num($('bq').value) * GM.num($('bc').value)); }
    $('bp').addEventListener('change', pre); $('bq').addEventListener('input', tot); $('bc').addEventListener('input', tot); pre();
    $('mf').addEventListener('submit', function (e) {
      e.preventDefault();
      api('savePurchase', { date: $('bd').value, pid: $('bp').value, qty: $('bq').value, unitCost: $('bc').value, supplier: $('bs').value, note: $('bn').value })
        .then(function (r) { closeModal(); toast('ক্রয় যোগ হয়েছে, স্টক বেড়েছে'); return refresh().then(function () { openVoucher('buy', r.purchase.id); }); }).catch(fail);
    });
  }
  function expModal() {
    openModal('নতুন খরচ', '<form id="mf" class="stack" novalidate><div class="grid2"><label class="field" for="ed">তারিখ<input id="ed" type="date" value="' + today() + '"></label>' +
      '<label class="field" for="ec">ধরন<select id="ec">' + CATS.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select></label>' +
      '<label class="field" for="ea">টাকা (৳)<input id="ea" type="number" min="0" step="any"></label><label class="field" for="en">বিবরণ<input id="en"></label></div>' +
      '<div class="err" id="merr"></div><div class="mfoot"><button class="btn soft" type="button" data-act="closeModal">বাতিল</button><button class="btn" type="submit">সংরক্ষণ</button></div></form>');
    $('mf').addEventListener('submit', function (e) {
      e.preventDefault();
      api('saveExpense', { date: $('ed').value, category: $('ec').value, amount: $('ea').value, note: $('en').value }).then(function () { closeModal(); toast('খরচ যোগ হয়েছে'); return refresh(); }).catch(fail);
    });
  }

  /* ---------- অর্ডারের মডাল ---------- */
  function orderModal(id) {
    var o = id ? find(st.db.orders, id) : null, isNew = !o, S = st.db.settings, P = st.db.products;
    if (isNew && !P.length) { toast('আগে পণ্য যোগ করুন।'); return; }
    var lines = o ? o.items.map(function (i) { return { pid: i.pid, qty: i.qty, price: i.price }; }) : [{ pid: P[0].id, qty: 1, price: P[0].price }];
    function popts(sel) { return P.map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === sel ? ' selected' : '') + '>' + esc(p.name) + ' (স্টক ' + bn(p.stock) + ')</option>'; }).join(''); }
    function fld(i, l, v, ex) { return '<label class="field" for="' + i + '">' + l + '<input id="' + i + '" value="' + esc(v) + '">' + (ex ? '<small>' + ex + '</small>' : '') + '</label>'; }
    openModal(isNew ? 'নতুন বিক্রি' : 'অর্ডার ' + esc(o.id),
      '<form id="mf" class="stack" novalidate><div class="sec">গ্রাহক</div><div class="grid2">' + fld('on', 'নাম', o ? o.customerName : '', isNew ? 'ফাঁকা রাখলে “ক্যাশ কাস্টমার”' : '') + fld('op', 'মোবাইল', o ? o.phone : '') +
      '<label class="field" for="oa" style="grid-column:1/-1">ঠিকানা<textarea id="oa" rows="2">' + esc(o ? o.address : '') + '</textarea></label>' + fld('onote', 'নোট', o ? o.note : '') +
      '<label class="field" for="oar">এলাকা<select id="oar">' + opts([['local', S.localArea], ['outside', 'অন্য জেলা']], o ? o.area : 'local') + '</select></label></div>' +
      '<div class="sec">পণ্য</div><div id="ol"></div><div><button class="btn sm ghost" type="button" id="addl">+ পণ্য যোগ করুন</button></div>' +
      '<div class="grid2"><label class="field" for="od">ছাড় (৳)<input id="od" type="number" min="0" step="any" value="' + (o ? o.discount : 0) + '"></label><label class="field" for="ov">ডেলিভারি চার্জ (৳)<input id="ov" type="number" min="0" step="any" value="' + (o ? o.delivery : 0) + '"></label>' +
      '<label class="field" for="os">স্ট্যাটাস<select id="os">' + statusOpts(o ? o.status : 'delivered') + '</select></label></div>' +
      '<div class="tot" id="ot"></div><div class="hint">ডেলিভারড করলে বিক্রয় লাভের হিসাবে ঢুকবে। বাতিল করলে স্টক ফিরে আসবে।</div>' +
      '<div class="err" id="merr"></div><div class="mfoot">' + (o ? '<button class="btn danger" type="button" id="odel">ডিলিট</button><button class="btn soft" type="button" data-act="voucher" data-id="' + esc(o.id) + '">ভাউচার</button>' : '') +
      '<button class="btn soft" type="button" data-act="closeModal">বাতিল</button><button class="btn" type="submit">' + (isNew ? 'বিক্রি যোগ করুন' : 'সংরক্ষণ') + '</button></div></form>', true);
    function recalc() {
      var sub = 0; lines.forEach(function (l) { sub += GM.num(l.qty) * GM.num(l.price); });
      var d = GM.num($('od').value), v = GM.num($('ov').value);
      $('ot').innerHTML = '<div><span>পণ্যের দাম</span><span>' + tk(sub) + '</span></div><div><span>ছাড়</span><span>− ' + tk(d) + '</span></div><div><span>ডেলিভারি</span><span>' + tk(v) + '</span></div><div class="g"><span>মোট</span><span>' + tk(Math.max(0, sub - d + v)) + '</span></div>';
    }
    function draw() {
      $('ol').innerHTML = '<div class="il h"><span>পণ্য</span><span>পরিমাণ</span><span>দর</span><span class="lt">মোট</span><span></span></div>' + lines.map(function (l, i) {
        return '<div class="il" data-i="' + i + '"><select class="ip" aria-label="পণ্য">' + popts(l.pid) + '</select><input class="iq" type="number" min="1" step="1" value="' + esc(l.qty) + '" aria-label="পরিমাণ"><input class="ipr" type="number" min="0" step="any" value="' + esc(l.price) + '" aria-label="দর"><span class="lt">' + tk(GM.num(l.qty) * GM.num(l.price)) + '</span><button type="button" data-rm="' + i + '" aria-label="মুছুন">✕</button></div>';
      }).join(''); recalc();
    }
    $('ol').addEventListener('input', function (e) {
      var row = e.target.closest('.il'); if (!row) return; var i = +row.getAttribute('data-i');
      if (e.target.classList.contains('iq')) lines[i].qty = e.target.value; if (e.target.classList.contains('ipr')) lines[i].price = e.target.value;
      row.querySelector('.lt').textContent = tk(GM.num(lines[i].qty) * GM.num(lines[i].price)); recalc();
    });
    $('ol').addEventListener('change', function (e) {
      if (!e.target.classList.contains('ip')) return; var i = +e.target.closest('.il').getAttribute('data-i'), p = find(P, e.target.value);
      lines[i].pid = p.id; if (p.price > 0) lines[i].price = p.price; draw();
    });
    $('ol').addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; lines.splice(+b.getAttribute('data-rm'), 1); draw(); });
    $('addl').addEventListener('click', function () { lines.push({ pid: P[0].id, qty: 1, price: P[0].price }); draw(); });
    $('od').addEventListener('input', recalc); $('ov').addEventListener('input', recalc);
    draw();
    if (o) $('odel').addEventListener('click', function () {
      if (!confirm('এই অর্ডার মুছে ফেলবেন? স্টক ফিরে আসবে এবং হিসাব থেকে বাদ যাবে।')) return;
      api('deleteOrder', { id: o.id }).then(function () { closeModal(); toast('অর্ডার মুছে ফেলা হয়েছে'); return refresh(); }).catch(fail);
    });
    $('mf').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!lines.length) { $('merr').textContent = 'কমপক্ষে একটি পণ্য দিন।'; return; }
      var d = { customerName: $('on').value, phone: $('op').value, address: $('oa').value, note: $('onote').value, area: $('oar').value, discount: $('od').value, delivery: $('ov').value,
        items: lines.map(function (l) { return { pid: l.pid, qty: l.qty, price: l.price }; }) };
      if (isNew) {
        d.status = $('os').value;
        api('createOrder', d).then(function (r) { closeModal(); toast('বিক্রি যোগ হয়েছে'); return refresh().then(function () { openVoucher('order', r.order.id); }); }).catch(fail);
      } else {
        d.id = o.id;
        api('saveOrder', d).then(function () { return $('os').value !== o.status ? api('setOrderStatus', { id: o.id, status: $('os').value }) : null; })
          .then(function () { closeModal(); toast('সংরক্ষিত হয়েছে'); return refresh(); }).catch(fail);
      }
    });
  }

  /* ---------- ভাউচার ---------- */
  function head(S) {
    return '<div class="vh"><img src="logo.png" alt=""><div><b>' + esc(S.shopName) + '</b><small>' + esc(S.address) + '</small><small>মোবাইল: ' + bn(esc([S.phone1, S.phone2].filter(Boolean).join(', '))) + '</small></div></div>';
  }
  function orderVoucher(o) {
    var S = st.db.settings;
    var rows = o.items.map(function (i, k) { return '<tr><td>' + bn(k + 1) + '</td><td>' + esc(i.name) + '</td><td class="r">' + bn(i.qty) + '</td><td class="r">' + tk(i.price) + '</td><td class="r">' + tk(i.qty * i.price) + '</td></tr>'; }).join('');
    var pay = o.status === 'cancelled' ? '<div class="pay">অর্ডারটি বাতিল করা হয়েছে</div>' : o.payStatus === 'paid' ? '<div class="pay paid">পরিশোধিত (ক্যাশ)</div>' : '<div class="pay">ক্যাশ অন ডেলিভারি: পণ্য হাতে পেয়ে ' + tk(o.total) + ' পরিশোধ করুন</div>';
    return head(S) + '<div class="vt"><h3>ক্যাশ মেমো / বিক্রয় ভাউচার</h3><span>নং: <b>' + esc(o.id) + '</b><br>তারিখ: ' + fd(o.date) + '</span></div>' +
      '<div class="box"><b>' + esc(o.customerName) + '</b>' + (o.phone ? '<br>মোবাইল: ' + bn(esc(o.phone)) : '') + (o.address ? '<br>ঠিকানা: ' + esc(o.address) : '') + (o.note ? '<br>নোট: ' + esc(o.note) : '') + '</div>' +
      '<table><thead><tr><th>#</th><th>পণ্য</th><th class="r">পরিমাণ</th><th class="r">দর</th><th class="r">টাকা</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="vs"><div><span>পণ্যের দাম</span><span>' + tk(o.subtotal) + '</span></div>' + (o.discount ? '<div><span>ছাড়</span><span>− ' + tk(o.discount) + '</span></div>' : '') + '<div><span>ডেলিভারি চার্জ</span><span>' + tk(o.delivery) + '</span></div><div class="g"><span>সর্বমোট</span><span>' + tk(o.total) + '</span></div></div>' +
      pay + '<div class="sign"><span>ক্রেতার স্বাক্ষর</span><span>বিক্রেতার স্বাক্ষর</span></div><div class="thx">' + esc(S.voucherNote) + '</div>';
  }
  function buyVoucher(b) {
    var S = st.db.settings;
    return head(S) + '<div class="vt"><h3>ক্রয় ভাউচার</h3><span>নং: <b>' + esc(b.id.toUpperCase()) + '</b><br>তারিখ: ' + fd(b.date) + '</span></div>' +
      '<div class="box">সরবরাহকারী: <b>' + esc(b.supplier || '–') + '</b>' + (b.note ? '<br>নোট: ' + esc(b.note) : '') + '</div>' +
      '<table><thead><tr><th>পণ্য</th><th class="r">পরিমাণ</th><th class="r">একক দাম</th><th class="r">টাকা</th></tr></thead><tbody><tr><td>' + esc(b.name) + '</td><td class="r">' + bn(b.qty) + '</td><td class="r">' + tk(b.unitCost) + '</td><td class="r">' + tk(b.qty * b.unitCost) + '</td></tr></tbody></table>' +
      '<div class="vs"><div class="g"><span>মোট ক্রয়</span><span>' + tk(b.qty * b.unitCost) + '</span></div></div><div class="sign"><span>গ্রহণকারী</span><span>সরবরাহকারী</span></div>';
  }
  function loadLibs() {
    function add(src, test) { return new Promise(function (res, rej) { if (test()) return res(); var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('PDF টুল লোড হয়নি। ইন্টারনেট দেখুন।')); }; document.head.appendChild(s); }); }
    return add('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', function () { return window.html2canvas; })
      .then(function () { return add('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', function () { return window.jspdf; }); });
  }
  function snap() { return loadLibs().then(function () { return window.html2canvas($('vbox'), { scale: 2, backgroundColor: '#ffffff', useCORS: true }); }); }
  function saveBlob(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function openVoucher(kind, id) {
    var isO = kind === 'order', rec = isO ? find(st.db.orders, id) : find(st.db.purchases, id);
    if (!rec) return;
    var name = (isO ? 'voucher-' : 'purchase-') + rec.id, S = st.db.settings;
    var text = isO ? S.shopName + '\nক্যাশ মেমো ' + rec.id + '\n' + rec.items.map(function (i, k) { return bn(k + 1) + '. ' + i.name + ' × ' + bn(i.qty) + ' = ' + tk(i.qty * i.price); }).join('\n') + '\nসর্বমোট: ' + tk(rec.total) + ' (ক্যাশ অন ডেলিভারি)\n' + S.voucherNote
      : S.shopName + '\nক্রয় ভাউচার ' + rec.id + '\n' + rec.name + ' × ' + bn(rec.qty) + ' = ' + tk(rec.qty * rec.unitCost);
    var wa = isO && rec.phone ? 'https://wa.me/88' + rec.phone + '?text=' + encodeURIComponent(text) : 'https://wa.me/?text=' + encodeURIComponent(text);
    openModal(isO ? 'বিক্রয় ভাউচার' : 'ক্রয় ভাউচার', '<div class="vwrap"><div class="voucher" id="vbox">' + (isO ? orderVoucher(rec) : buyVoucher(rec)) + '</div></div>' +
      '<div class="vactions"><button class="btn" type="button" id="vprint">প্রিন্ট</button><button class="btn ghost" type="button" id="vpdf">PDF ডাউনলোড</button><button class="btn ghost" type="button" id="vpng">ছবি ডাউনলোড</button>' +
      '<button class="btn ghost" type="button" id="vshare">শেয়ার</button><a class="btn wa" href="' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp-এ পাঠান</a></div><div class="err" id="merr"></div>', true);
    $('vprint').addEventListener('click', function () { document.body.classList.add('pr-voucher'); window.print(); setTimeout(function () { document.body.classList.remove('pr-voucher'); }, 1500); });
    $('vpng').addEventListener('click', function () { toast('ছবি তৈরি হচ্ছে...'); snap().then(function (c) { c.toBlob(function (b) { saveBlob(b, name + '.png'); }, 'image/png'); }).catch(fail); });
    $('vpdf').addEventListener('click', function () {
      toast('PDF তৈরি হচ্ছে...');
      snap().then(function (c) {
        var w = 148, h = w * c.height / c.width, pdf = new window.jspdf.jsPDF({ unit: 'mm', format: [w, Math.max(210, h + 10)] });
        pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 5, w, h); pdf.save(name + '.pdf');
      }).catch(fail);
    });
    $('vshare').addEventListener('click', function () {
      snap().then(function (c) { c.toBlob(function (b) {
        var f = new File([b], name + '.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: S.shopName, text: text }).catch(function () {});
        else if (navigator.share) navigator.share({ title: S.shopName, text: text }).catch(function () {});
        else copy(text, 'লেখা কপি হয়েছে, যেখানে ইচ্ছা পেস্ট করুন');
      }, 'image/png'); }).catch(fail);
    });
  }

  /* ---------- রিপোর্ট এক্সপোর্ট ---------- */
  function csvCell(v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function exportCsv() {
    var r = reportRange(), rows = [['তারিখ', 'অর্ডার', 'গ্রাহক', 'পণ্য', 'বিক্রয়', 'ছাড়', 'ডেলিভারি', 'মোট আয়', 'ক্রয়মূল্য', 'লাভ']];
    st.db.orders.filter(function (o) { var d = o.deliveredDate || o.date; return o.status === 'delivered' && (!r[0] || d >= r[0]) && (!r[1] || d <= r[1]); }).forEach(function (o) {
      var items = 0, cogs = 0; o.items.forEach(function (i) { items += i.qty * i.price; cogs += i.qty * i.cost; });
      rows.push([o.deliveredDate || o.date, o.id, o.customerName, o.items.map(function (i) { return i.name + ' x' + i.qty; }).join('; '), items, o.discount, o.delivery, items - o.discount + o.delivery, cogs, items - o.discount + o.delivery - cogs]);
    });
    var R = GM.report(st.db, r[0], r[1]);
    rows.push([], ['মোট খরচ', '', '', '', '', '', '', '', '', R.expenses.total], ['নেট লাভ', '', '', '', '', '', '', '', '', R.net]);
    saveBlob(new Blob(['﻿' + rows.map(function (x) { return x.map(csvCell).join(','); }).join('\n')], { type: 'text/csv;charset=utf-8' }), 'hisab-' + today() + '.csv');
  }

  /* ---------- ক্লিক ও পরিবর্তন ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.getAttribute('data-act'), id = b.getAttribute('data-id'), v = b.getAttribute('data-v');
    switch (a) {
      case 'nav': location.hash = v; go(v); break;
      case 'logout': logout(); break;
      case 'closeModal': closeModal(); break;
      case 'period': st.period = v; renderApp(); break;
      case 'ofilter': st.of = v; renderApp(); break;
      case 'newSale': orderModal(null); break;
      case 'openOrder': orderModal(id); break;
      case 'voucher': openVoucher('order', id); break;
      case 'bvoucher': openVoucher('buy', id); break;
      case 'newProduct': productModal(null); break;
      case 'editProduct': productModal(id); break;
      case 'delProduct':
        if (confirm('এই পণ্য মুছে ফেলবেন? পুরনো অর্ডারের তথ্য ঠিক থাকবে।')) api('deleteProduct', { id: id }).then(function () { toast('পণ্য মুছে ফেলা হয়েছে'); return refresh(); }).catch(fail);
        break;
      case 'newBuy': buyModal(); break;
      case 'delBuy':
        if (confirm('এই ক্রয় মুছবেন? স্টক থেকে ওই পরিমাণ কমে যাবে।')) api('deletePurchase', { id: id }).then(function () { toast('ক্রয় মুছে ফেলা হয়েছে'); return refresh(); }).catch(fail);
        break;
      case 'newExp': expModal(); break;
      case 'delExp':
        if (confirm('এই খরচ মুছে ফেলবেন?')) api('deleteExpense', { id: id }).then(function () { toast('খরচ মুছে ফেলা হয়েছে'); return refresh(); }).catch(fail);
        break;
      case 'rrange': {
        var t = today();
        st.rq = v;
        if (v === 'today') { st.rf = t; st.rt = t; } else if (v === 'week') { st.rf = addDays(t, -6); st.rt = t; } else if (v === 'month') { st.rf = t.slice(0, 8) + '01'; st.rt = t; }
        else if (v === 'year') { st.rf = t.slice(0, 4) + '-01-01'; st.rt = t; } else { st.rf = ''; st.rt = ''; }
        renderApp(); break;
      }
      case 'csv': exportCsv(); break;
      case 'printReport': window.print(); break;
      case 'backup': saveBlob(new Blob([JSON.stringify(st.db, null, 1)], { type: 'application/json' }), 'golden-mart-backup-' + today() + '.json'); break;
    }
  });
  document.addEventListener('input', function (e) { if (e.target.id === 'oq') { st.oq = e.target.value; drawOrders(); } });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.getAttribute && t.getAttribute('data-sid')) {
      api('setOrderStatus', { id: t.getAttribute('data-sid'), status: t.value }).then(function () { toast('স্ট্যাটাস বদলানো হয়েছে'); return refresh(); }).catch(function (x) { toast(x.message); refresh(); });
    } else if (t.getAttribute && t.getAttribute('data-tog')) {
      var p = find(st.db.products, t.getAttribute('data-tog'));
      api('saveProduct', Object.assign({}, p, { active: t.checked })).then(function () { toast(t.checked ? 'পণ্য দোকানে দেখানো হবে' : 'পণ্য দোকান থেকে লুকানো হয়েছে'); return refresh(); }).catch(function (x) { toast(x.message); refresh(); });
    } else if (t.id === 'rf' || t.id === 'rt') {
      st.rf = $('rf').value; st.rt = $('rt').value; st.rq = 'custom'; renderApp();
    }
  });

  /* ---------- শুরু ---------- */
  var h = location.hash.replace('#', ''); if (VIEWS[h]) st.view = h;
  var saved = ''; try { saved = sessionStorage.getItem('gm_pw') || localStorage.getItem('gm_pw_l') || ''; } catch (e) {}
  if (saved) {
    GMApi.call('login', {}, saved).then(function (r) {
      if (r.ok) enter(saved, !!(function () { try { return localStorage.getItem('gm_pw_l'); } catch (e) { return ''; } })()).catch(function () { showLogin(); });
      else showLogin();
    });
  } else showLogin();
})();
