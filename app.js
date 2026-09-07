/* ===== 星空微动效 ===== */
(function(){
  var canvas = document.getElementById('stars');
  if(!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stars = [], W, H;
  function resize(){ W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; }
  function seed(){
    stars = [];
    var n = Math.max(60, Math.min(Math.round(W*H/9000), 200));
    for(var i=0;i<n;i++){
      stars.push({ x:Math.random()*W, y:Math.random()*H, r:Math.random()*1.1+0.3, base:Math.random()*0.35+0.25, speed:Math.random()*0.9+0.25, phase:Math.random()*Math.PI*2 });
    }
  }
  function draw(t){
    ctx.clearRect(0,0,W,H);
    for(var i=0;i<stars.length;i++){
      var s=stars[i];
      var a = reduced ? s.base : s.base*(0.45+0.55*Math.sin(t*0.001*s.speed+s.phase));
      a = Math.max(0.05, Math.min(a,1));
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle='rgba(236,231,220,'+a.toFixed(3)+')'; ctx.fill();
    }
    if(!reduced) requestAnimationFrame(draw);
  }
  resize(); seed();
  if(reduced){ draw(0); } else { requestAnimationFrame(draw); }
  var rt;
  window.addEventListener('resize', function(){ clearTimeout(rt); rt=setTimeout(function(){ resize(); seed(); },200); });
})();
/* ===== 滚动入场 ===== */
(function(){
  var items = document.querySelectorAll('.reveal');
  if(!items.length) return;
  if(!('IntersectionObserver' in window)){ items.forEach(function(el){ el.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold:0.12, rootMargin:'0px 0px -40px 0px' });
  items.forEach(function(el){ io.observe(el); });
  // 兜底1：1.5s 后仍在视口内但未入场的内容强制显示（兼容移动端多列布局/内嵌浏览器）
  setTimeout(function(){
    items.forEach(function(el){
      if(el.classList.contains('in')) return;
      var r = el.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      if(r.top < vh && r.bottom > 0){ el.classList.add('in'); io.unobserve(el); }
    });
  }, 1500);
  // 兜底2：5s 后所有未入场内容强制显示，保证任何环境下内容可见
  setTimeout(function(){
    items.forEach(function(el){ if(!el.classList.contains('in')) el.classList.add('in'); });
  }, 5000);
})();
/* ===== 子页分类筛选 + 分页 ===== */
(function(){
  var pages = document.querySelectorAll('.series-page');
  if(!pages.length) return;
  pages.forEach(function(page){
    var grid = page.querySelector('.work-grid');
    if(!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.work-card'));
    if(!cards.length) return;
    var perPage = 24;            // 每页 24 张
    var cur = 1;
    var state = { cat: 'all', orient: 'all' };
    var btns = page.querySelectorAll('.filter-btn');
    var prev = page.querySelector('.p-prev');
    var next = page.querySelector('.p-next');
    var num = page.querySelector('.p-num');
    var cnt = page.querySelector('.series-count');
    function visible(){
      return cards.filter(function(c){
        return (state.cat === 'all' || c.getAttribute('data-cat') === state.cat) &&
               (state.orient === 'all' || c.getAttribute('data-orient') === state.orient);
      });
    }
    function pageCount(list){ return Math.max(1, Math.ceil(list.length / perPage)); }
    function sortByYear(a, b){
      var ya = parseInt(a.getAttribute('data-year'), 10) || 0;
      var yb = parseInt(b.getAttribute('data-year'), 10) || 0;
      if(ya !== yb) return yb - ya;
      var ma = parseInt(a.getAttribute('data-month'), 10) || 0;
      var mb = parseInt(b.getAttribute('data-month'), 10) || 0;
      if(ma !== mb) return mb - ma;
      var na = parseInt((a.querySelector('.work-no')||{textContent:'0'}).textContent, 10) || 0;
      var nb = parseInt((b.querySelector('.work-no')||{textContent:'0'}).textContent, 10) || 0;
      return na - nb;
    }
    function render(){
      var list = visible().sort(sortByYear);   // 筛选后仍按年份递减
      var pc = pageCount(list);
      if(cur > pc) cur = pc;
      if(cur < 1) cur = 1;
      cards.forEach(function(c){ c.style.display = 'none'; });
      var start = (cur - 1) * perPage;
      list.slice(start, start + perPage).forEach(function(c){
        c.style.display = 'block';
        c.classList.add('in');   // 保证分页显示时可见
        grid.appendChild(c);     // 重排 DOM，瀑布流列序同步按年份递减
      });
      if(num) num.textContent = cur + ' / ' + pc;
      if(prev) prev.classList.toggle('disabled', cur <= 1);
      if(next) next.classList.toggle('disabled', cur >= pc);
      if(cnt) cnt.textContent = list.length + ' 张';
    }
    if(btns.length){
      btns.forEach(function(btn){
        btn.addEventListener('click', function(){
          var dim = btn.getAttribute('data-dim');
          var val = btn.getAttribute('data-val');
          state[dim] = val;
          btns.forEach(function(b){ if(b.getAttribute('data-dim') === dim) b.classList.remove('on'); });
          btn.classList.add('on');
          cur = 1;
          render();
        });
      });
    }
    if(prev) prev.addEventListener('click', function(){ if(cur > 1){ cur--; render(); } });
    if(next) next.addEventListener('click', function(){ var pc = pageCount(visible()); if(cur < pc){ cur++; render(); } });
    render();
  });
})();
/* ===== 灯箱（支持左右切换 / 视频播放）===== */
(function(){
  var lb = document.getElementById('lightbox');
  if(!lb) return;
  // 仅在有作品/视频卡片数据的页面运行动态按钮逻辑；
  // 首页(index.html)使用 HTML 内静态灯箱按钮(第二套逻辑)，此处跳过避免按钮重复覆盖。
  if(!document.querySelector('.work-card, .films-feature, .films-thumb, .trip-card, .cc-card')) return;
  var lbImg = document.getElementById('lbImg');
  var lbCap = document.getElementById('lbCap');
  var closeBtn = document.getElementById('lbClose');
  // 视频播放器（复用灯箱舞台，点击视频卡片时使用）
  var lbVideo = document.createElement('video');
  lbVideo.controls = true;
  lbVideo.playsInline = true;
  lbVideo.preload = 'metadata';
  lbVideo.style.display = 'none';
  lbVideo.style.maxWidth = '94vw';
  lbVideo.style.maxHeight = '80vh';
  lbVideo.style.width = 'auto';
  lbVideo.style.background = '#000';
  lbVideo.style.borderRadius = '6px';
  lb.appendChild(lbVideo);
  // 左右切换按钮（CSS 样式已就绪）
  var prevBtn = document.createElement('button');
  prevBtn.className = 'lb-nav lb-prev';
  prevBtn.setAttribute('aria-label','上一张');
  prevBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M15 5l-7 7 7 7"/></svg>';
  var nextBtn = document.createElement('button');
  nextBtn.className = 'lb-nav lb-next';
  nextBtn.setAttribute('aria-label','下一张');
  nextBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 5l7 7-7 7"/></svg>';
  lb.appendChild(prevBtn);
  lb.appendChild(nextBtn);
  var seq = [];
  var curIdx = -1;
  var halfL = null, halfR = null;
  // 收集当前筛选 + 分页下可见的图片 / 视频序列
  function refreshSeq(){
    seq = [];
    document.querySelectorAll('.work-card, .films-feature, .films-thumb, .trip-card, .cc-card').forEach(function(c){
      if(c.style.display !== 'none'){
        var src = c.getAttribute('data-img');
        if(src) seq.push({ src: src, video: c.getAttribute('data-video') || '', title: c.getAttribute('data-title') || '', sub: c.getAttribute('data-sub') || '' });
      }
    });
  }
  function showVideo(v){
    lbImg.style.display = 'none';
    lbVideo.style.display = 'block';
    lbVideo.src = v;
    if(halfL) halfL.style.display = 'none';
    if(halfR) halfR.style.display = 'none';
    var p = lbVideo.play();
    if(p && p.catch) p.catch(function(){});
  }
  function showImg(src, alt){
    lbVideo.pause();
    lbVideo.removeAttribute('src');
    lbVideo.load();
    lbVideo.style.display = 'none';
    lbImg.style.display = '';
    lbImg.src = src;
    lbImg.alt = alt || '';
    if(halfL) halfL.style.display = '';
    if(halfR) halfR.style.display = '';
  }
  function paint(i){
    if(!seq.length) return;
    if(i < 0) i = seq.length - 1;
    if(i >= seq.length) i = 0;
    curIdx = i;
    var it = seq[curIdx];
    lbCap.textContent = (it.sub ? it.sub + ' · ' : '') + it.title;
    if(it.video){ showVideo(it.video); }
    else { showImg(it.src, it.title); }
  }
  function open(src, title, sub, video){
    refreshSeq();
    var found = -1;
    for(var i = 0; i < seq.length; i++){ if(seq[i].src === src && (seq[i].video || '') === (video || '')){ found = i; break; } }
    if(found < 0){ for(var j = 0; j < seq.length; j++){ if(seq[j].src === src){ found = j; break; } } }
    curIdx = found >= 0 ? found : 0;
    paint(curIdx);
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close(){
    lbVideo.pause();
    lbVideo.removeAttribute('src');
    lbVideo.load();
    lb.classList.remove('open');
    document.body.style.overflow = '';
  }
  document.querySelectorAll('[data-img]').forEach(function(el){
    el.addEventListener('click', function(){
      open(el.getAttribute('data-img'), el.getAttribute('data-title'), el.getAttribute('data-sub'), el.getAttribute('data-video') || '');
    });
  });
  prevBtn.addEventListener('click', function(e){ e.stopPropagation(); paint(curIdx - 1); });
  nextBtn.addEventListener('click', function(e){ e.stopPropagation(); paint(curIdx + 1); });
  closeBtn.addEventListener('click', close);
  function buildHalf(){
    if(document.querySelector('.lb-half')) return;
    halfL = document.createElement('div');
    halfL.className = 'lb-half lb-left';
    halfL.setAttribute('aria-hidden','true');
    halfL.addEventListener('click', function(e){ e.stopPropagation(); paint(curIdx - 1); });
    halfR = document.createElement('div');
    halfR.className = 'lb-half lb-right';
    halfR.setAttribute('aria-hidden','true');
    halfR.addEventListener('click', function(e){ e.stopPropagation(); paint(curIdx + 1); });
    lb.appendChild(halfL);
    lb.appendChild(halfR);
  }
  buildHalf();
  lb.addEventListener('click', function(e){
    if(e.target.closest && (e.target.closest('.lb-close') || e.target.closest('.lb-prev') || e.target.closest('.lb-next') || e.target.closest('.lb-half'))) return;
    var x = e.clientX;
    paint(x < window.innerWidth / 2 ? curIdx - 1 : curIdx + 1);
  });
  document.addEventListener('keydown', function(e){
    if(!lb.classList.contains('open')) return;
    if(e.key === 'Escape') close();
    else if(e.key === 'ArrowLeft') paint(curIdx - 1);
    else if(e.key === 'ArrowRight') paint(curIdx + 1);
  });
})();
/* ===== 导航当前页高亮 ===== */
(function(){
  var p = document.body.getAttribute('data-page');
  if(!p) return;
  document.querySelectorAll('.nav-links a[href]').forEach(function(a){
    if(a.getAttribute('href') === p + '.html') a.classList.add('active');
  });
  // 下拉按钮：当所在子页命中下拉菜单内链接时高亮
/* ===== 移动端汉堡菜单 ===== */
(function(){
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if(!toggle || !links) return;
  toggle.addEventListener('click', function(e){
    e.stopPropagation();
    var open = links.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  // 点击面板内链接后收起菜单
  links.addEventListener('click', function(e){
    if(e.target.closest('a')){
      links.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  // 点击页面其他区域收起菜单
  document.addEventListener('click', function(e){
    if(!toggle.contains(e.target) && !links.contains(e.target)){
      links.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  // 按 Esc 收起
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){
      links.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();
/* ===== 导航下拉点击支持（移动端无 hover） ===== */
(function(){
  document.querySelectorAll('.nav-links .nav-drop').forEach(function(drop){
    var btn = drop.querySelector('.nav-drop-btn');
    if(!btn) return;
    btn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      drop.classList.toggle('open');
    });
  });
  document.addEventListener('click', function(e){
    document.querySelectorAll('.nav-links .nav-drop.open').forEach(function(drop){
      if(!drop.contains(e.target)) drop.classList.remove('open');
    });
  });
})();
  document.querySelectorAll('.nav-links .nav-item').forEach(function(d){
    if(d.querySelector('a[href="' + p + '.html"]')){
      var b = d.querySelector('.nav-drop-btn');
      if(b) b.classList.add('active');
    }
  });
})();
/* ===== 首页栏目下拉框 ===== */
(function(){
  var drop = document.getElementById('catDrop');
  if(!drop) return;
  var btn = drop.querySelector('.cat-drop-btn');
  if(!btn) return;
  btn.addEventListener('click', function(e){
    e.stopPropagation();
    var open = drop.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('click', function(e){
    if(!drop.contains(e.target)) drop.classList.remove('open');
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') drop.classList.remove('open');
  });
})();
/* ===== 自定义光标：采用 CSS cursor:url 图片光标（cursor_meteor.png 彗星图标），不再使用 canvas，位置由系统保证 ===== */
/* ===== 联系弹窗 ===== */
(function(){
  var modal = document.getElementById('contactModal');
  if(!modal) return;
  var openers = document.querySelectorAll('[data-contact]');
  function open(){
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function close(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }
  for(var i=0;i<openers.length;i++){
    openers[i].addEventListener('click', open);
  }
  var backdrop = modal.querySelector('.cm-backdrop');
  var closeBtn = modal.querySelector('.cm-close');
  if(backdrop) backdrop.addEventListener('click', close);
  if(closeBtn) closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') close();
  });
  // 复制到剪贴板（兼容 file:// 环境）
  function copyText(txt, done){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(done).catch(function(){ legacyCopy(txt, done); });
    } else {
      legacyCopy(txt, done);
    }
  }
  function legacyCopy(txt, done){
    var ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand('copy'); done(); } catch(e) { }
    document.body.removeChild(ta);
  }
  var items = modal.querySelectorAll('.cm-item');
  for(var j=0;j<items.length;j++){
    (function(item){
      var btn = item.querySelector('.cm-copy');
      var val = item.getAttribute('data-copy');
      btn.addEventListener('click', function(){
        copyText(val, function(){
          var origin = btn.textContent;
          btn.textContent = '已复制';
          btn.classList.add('ok');
          setTimeout(function(){
            btn.textContent = origin;
            btn.classList.remove('ok');
          }, 1600);
        });
      });
    })(items[j]);
  }
})();
/* ===== 全局搜索（导航上方） ===== */
(function(){
  var input = document.getElementById('searchInput');
  var results = document.getElementById('searchResults');
  var clear = document.getElementById('searchClear');
  var hint = document.getElementById('searchHint');
  if(!input || !results) return;
  var INDEX = [
    { t:'首页', d:'作品总览 · 摄影分类 · 快速浏览', u:'index.html', tag:'HOME', k:['首页','主页','作品','摄影','分类','Nemo','杨创宇'] },
    { t:'星空系列', d:'银河 · 流星雨 · 深空 · 星野摄影', u:'star.html', tag:'STAR', k:['星空','银河','流星雨','深空','星野','星星','夜晚','延时'] },
    { t:'城市系列', d:'武汉 · 上海 · 重庆 · 城市夜景', u:'city.html', tag:'CITY', k:['城市','武汉','上海','重庆','夜景','城市风光','航拍'] },
    { t:'自然系列', d:'山川 · 河流 · 草原 · 森林 · 海洋', u:'nature.html', tag:'NATURE', k:['自然','山川','河流','草原','森林','海洋','风光','户外'] },
    { t:'旅拍', d:'旅拍影像 · 视频 · 旅行记录', u:'films.html', tag:'TRAVEL', k:['旅拍','影像','视频','旅行','游记'] },
    { t:'摄影教程', d:'前期教程 · 后期教程 · 拍摄与调色', u:'tutorial.html', tag:'TUTORIAL', k:['教程','前期','后期','调色','拍摄','修图','构图','学习'] },
    { t:'商业合作', d:'商业委托 · 旅拍 · 延时 · 摄影指导', u:'commercial.html', tag:'BUSINESS', k:['商业','合作','委托','约拍','商务','摄影指导'] },
    { t:'关于我', d:'杨创宇 · Nemo 爱拍照 · 摄影师简介', u:'about.html', tag:'ABOUT', k:['关于','杨创宇','Nemo','爱拍照','简介','摄影师'] },
    { t:'联系我', d:'微信号 · 电话 · 邮箱 · 商业沟通', u:'#contact', tag:'CONTACT', k:['联系','微信','电话','邮箱','合作'] }
  ];
  function render(q){
    q = q.trim().toLowerCase();
    if(!q){
      results.classList.remove('open');
      results.innerHTML = '';
      if(clear) clear.classList.remove('show');
      return;
    }
    var hit = INDEX.filter(function(it){
      return (it.t + ' ' + it.d + ' ' + it.k.join(' ')).toLowerCase().indexOf(q) > -1;
    });
    var html = '';
    if(!hit.length){
      html = '<div class="sr-panel"><div class="sr-none">没有找到与「' + input.value.trim() + '」相关的内容</div></div>';
    } else {
      html = '<div class="sr-panel">';
      hit.forEach(function(it){
        var href = it.u === '#contact' ? 'index.html' : it.u;
        html += '<a class="sr-item" href="' + href + '"><span class="sr-t"><b>' + it.t + '</b><i>' + it.tag + '</i></span><span class="sr-d">' + it.d + '</span></a>';
      });
      html += '</div>';
    }
    results.innerHTML = html;
    results.classList.add('open');
    if(clear) clear.classList.add('show');
  }
  input.addEventListener('input', function(){ render(input.value); });
  input.addEventListener('focus', function(){ if(input.value.trim()) render(input.value); });
  if(clear) clear.addEventListener('click', function(){ input.value = ''; render(''); input.focus(); });
  document.addEventListener('click', function(e){
    if(!e.target.closest('#searchBar')) results.classList.remove('open');
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){ results.classList.remove('open'); input.blur(); }
  });
  results.addEventListener('mousedown', function(e){ e.preventDefault(); });
})();
/* ===== 联系方式复制（页面内 · 全局） ===== */
(function(){
  var items = document.querySelectorAll('.cm-item');
  if(!items.length) return;
  function feedback(btn){
    var o = btn.textContent;
    btn.textContent = '已复制';
    btn.classList.add('ok');
    setTimeout(function(){ btn.textContent = o; btn.classList.remove('ok'); }, 1600);
  }
  function legacyCopy(val, btn){
    var ta = document.createElement('textarea');
    ta.value = val; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); feedback(btn); } catch(e) { }
    document.body.removeChild(ta);
  }
  for(var i=0;i<items.length;i++){
    (function(item){
      var btn = item.querySelector('.cm-copy');
      var val = item.getAttribute('data-copy');
      btn.addEventListener('click', function(){
        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(val).then(function(){ feedback(btn); }).catch(function(){ legacyCopy(val, btn); });
        } else { legacyCopy(val, btn); }
      });
    })(items[i]);
  }
})();
/* ===== 精选图片灯箱 ===== */
(function(){
  var feat = document.querySelector('.feat-wide');
  var msItems = Array.prototype.slice.call(document.querySelectorAll('.ms-item'));
  var lb = document.getElementById('lightbox');
  if((!msItems.length && !feat) || !lb) return;
  var items = feat ? [feat].concat(msItems) : msItems;
  var img = document.getElementById('lbImg');
  var en = document.querySelector('.lb-en');
  var cn = document.querySelector('.lb-cn');
  var idx = 0;
  function buildHalf(){
    if(document.querySelector('.lb-half')) return;
    var L = document.createElement('div');
    L.className = 'lb-half lb-left';
    L.setAttribute('aria-hidden','true');
    L.addEventListener('click', function(e){ e.stopPropagation(); open(idx-1); });
    var R = document.createElement('div');
    R.className = 'lb-half lb-right';
    R.setAttribute('aria-hidden','true');
    R.addEventListener('click', function(e){ e.stopPropagation(); open(idx+1); });
    lb.appendChild(L);
    lb.appendChild(R);
  }
  function open(i){
    idx = (i + items.length) % items.length;
    var it = items[idx];
    var im = it.querySelector('img');
    img.src = im.getAttribute('src');
    img.alt = im.getAttribute('alt') || '';
    var enEl = it.querySelector('.ms-en') || it.querySelector('.fw-en');
    var cnEl = it.querySelector('.ms-cn') || it.querySelector('.fw-cn');
    en.textContent = enEl ? enEl.textContent : '';
    cn.textContent = cnEl ? cnEl.textContent : '';
    lb.classList.add('open');
    lb.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function close(){
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }
  msItems.forEach(function(it, i){
    it.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); open(feat ? i+1 : i); });
  });
  if(feat) feat.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); open(0); });
  var closeBtn = document.getElementById('lbClose');
  var prevBtn = document.getElementById('lbPrev');
  var nextBtn = document.getElementById('lbNext');
  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', function(e){ e.stopPropagation(); open(idx-1); });
  nextBtn.addEventListener('click', function(e){ e.stopPropagation(); open(idx+1); });
  lb.addEventListener('click', function(e){
    if(e.target.closest && (e.target.closest('.lb-close') || e.target.closest('.lb-prev') || e.target.closest('.lb-next') || e.target.closest('.lb-half'))) return;
    var x = e.clientX;
    open(x < window.innerWidth / 2 ? idx-1 : idx+1);
  });
  buildHalf();
  document.addEventListener('keydown', function(e){
    if(!lb.classList.contains('open')) return;
    if(e.key === 'Escape') close();
    if(e.key === 'ArrowLeft') open(idx-1);
    if(e.key === 'ArrowRight') open(idx+1);
  });
})();
/* ===== 页面转场（星空穿越） ===== */
(function(){
  if(!document.body) return;
  var FLAG = 'pt=1';
  var inTransit = false;
  function isInner(href){
    if(!href) return false;
    if(/^(https?:|mailto:|tel:|javascript:)/i.test(href)) return false;
    if(href.charAt(0) === '#') return false;
    var path = href.split('#')[0];
    return /\.html?$/i.test(path.split('?')[0]);
  }
  function enter(){
    if(location.search.indexOf(FLAG) < 0) return;
    document.documentElement.style.background = '#000';
    var b = document.body;
    b.style.opacity = '0';
    b.style.transition = 'opacity .5s ease';
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){ b.style.opacity = '1'; });
    });
  }
  function build(){
    var d = document.getElementById('pt-warp');
    if(d) return d;
    d = document.createElement('div');
    d.id = 'pt-warp';
    d.setAttribute('aria-hidden','true');
    d.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:99998;background:#000;display:none;';
    d.innerHTML = '<canvas style="position:absolute;inset:0;width:100%;height:100%;"></canvas>';
    document.body.appendChild(d);
    return d;
  }
  function startWarp(href){
    var d = build();
    var canvas = d.querySelector('canvas');
    var w = canvas.width = window.innerWidth;
    var h = canvas.height = window.innerHeight;
    var ctx = canvas.getContext('2d');
    var cx = w/2, cy = h/2;
    var MAXR = Math.hypot(cx, cy);
    var parts = [];
    function spawn(){
      var ang = Math.random()*Math.PI*2;
      var r = Math.sqrt(Math.random()) * MAXR;
      return { a:ang, r:r, base:0.45+Math.random()*0.55, w:0.5+Math.random()*1.7 };
    }
    for(var i=0;i<520;i++){ parts.push(spawn()); }
    d.style.display = 'block';
    var t0 = performance.now();
    var dur = 820;
    var jumped = false;
    var jumpTimer = setTimeout(function(){
      if(jumped) return;
      jumped = true;
      location.href = href + (href.indexOf('?') >= 0 ? '&' : '?') + FLAG;
    }, 380);
    function frame(){
      var t = performance.now() - t0;
      var k = Math.min(1, t/dur);
      var warp = Math.min(1, Math.max(0,(k-0.1)/0.55));
      ctx.clearRect(0,0,w,h);
      var maxV = 6 + 30*warp;
      for(var i=0;i<parts.length;i++){
        var p = parts[i];
        var v = maxV * (0.25 + p.r/MAXR*1.15);
        p.r += v * (0.7 + 0.6*warp);
        var prog = Math.min(1, p.r/MAXR);
        var alpha = (0.22 + 0.6*warp) * (1 - prog*0.35) * p.base;
        if(alpha > 0.02){
          var len = Math.min(9 + v*2.4, p.r*0.9);
          var x1 = cx + Math.cos(p.a)*p.r;
          var y1 = cy + Math.sin(p.a)*p.r;
          var x0 = cx + Math.cos(p.a)*Math.max(0,p.r-len);
          var y0 = cy + Math.sin(p.a)*Math.max(0,p.r-len);
          var grad = ctx.createLinearGradient(x0,y0,x1,y1);
          grad.addColorStop(0,'rgba(236,231,220,0)');
          grad.addColorStop(1,'rgba(236,231,220,'+alpha.toFixed(3)+')');
          ctx.strokeStyle = grad;
          ctx.lineWidth = p.w * (0.55 + 0.45*prog);
          ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
          ctx.fillStyle = 'rgba(245,241,232,'+Math.min(0.95,alpha*1.8).toFixed(3)+')';
          ctx.beginPath(); ctx.arc(x1,y1,Math.max(0.5,p.w*0.7),0,Math.PI*2); ctx.fill();
        }
        if(p.r > MAXR){ parts[i] = spawn(); }
      }
      if(t < dur){ requestAnimationFrame(frame); }
      else { clearTimeout(jumpTimer); d.style.display = 'none'; }
    }
    requestAnimationFrame(frame);
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest ? e.target.closest('a') : null;
    if(!a) return;
    if(a.target && a.target !== '_self') return;
    if(a.hasAttribute('download')) return;
    var href = a.getAttribute('href');
    if(!isInner(href)) return;
    var path = href.split('#')[0].split('?')[0];
    var cur = location.pathname.split('/').pop().split('?')[0];
    if(path === cur) return;
    e.preventDefault();
    if(inTransit) return;
    inTransit = true;
    startWarp(href);
  });
  enter();
})();
/* ===== 破图兜底：图片加载失败自动隐藏，避免白块 ===== */
(function(){
  document.addEventListener('error', function(e){
    var t = e.target;
    if(t && t.tagName === 'IMG'){
      t.style.opacity = '0';
      var p = t.closest ? t.closest('figure,.card,li,.sh-bg') : null;
      if(p){ p.classList.add('img-missing'); }
    }
  }, true);
})();
