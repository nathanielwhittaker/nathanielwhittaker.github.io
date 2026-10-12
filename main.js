(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  $('#year').textContent = new Date().getFullYear();

  // ---------- Theme ----------
  $('.theme-toggle').addEventListener('click', () => {
    const root = document.documentElement;
    const current = root.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    root.dataset.theme = current === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  });
  if (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.dataset.theme = 'light';
  }

  // ---------- Ember particles in hero ----------
  const canvas = $('#embers');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    let w, h, parts = [], mouse = { x: -999, y: -999 };
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(70, w / 18));
      parts = Array.from({ length: n }, () => spawn(true));
    };
    const spawn = (anywhere) => ({
      x: Math.random() * w, y: anywhere ? Math.random() * h : h + 10,
      r: Math.random() * 1.8 + .4, vy: -(Math.random() * .45 + .15), vx: (Math.random() - .5) * .2,
      life: Math.random() * Math.PI * 2,
    });
    const hero = $('.hero');
    hero.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
    const tick = () => {
      if (visible) {
        ctx.clearRect(0, 0, w, h);
        const color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        ctx.fillStyle = color;
        for (const p of parts) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 12000) { const f = (12000 - d2) / 12000; p.x += dx * f * .04; p.y += dy * f * .04; }
          p.x += p.vx + Math.sin(p.life) * .15; p.y += p.vy; p.life += .02;
          if (p.y < -10) Object.assign(p, spawn(false));
          ctx.globalAlpha = .25 + .45 * (Math.sin(p.life * 1.7) * .5 + .5) * Math.min(1, p.y / h * 1.4);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }
      }
      requestAnimationFrame(tick);
    };
    addEventListener('resize', resize); resize(); tick();
  }

  // ---------- Count-up stats ----------
  const counters = document.querySelectorAll('[data-count]');
  const runCount = el => {
    const target = +el.dataset.count, suffix = el.dataset.suffix || '', dec = +(el.dataset.decimals || 0);
    const fmt = v => dec ? v.toFixed(dec) : Math.round(v).toLocaleString();
    if (reduceMotion) { el.textContent = fmt(target) + suffix; return; }
    const t0 = performance.now(), dur = 1400;
    const step = t => {
      const k = Math.min(1, (t - t0) / dur), eased = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(target * eased) + (k === 1 ? suffix : '');
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { runCount(e.target); io.unobserve(e.target); }
  }), { threshold: .6 });
  counters.forEach(c => io.observe(c));

  // ---------- Glyph icons for image-less cards ----------
  const GLYPHS = {
    agents: '<circle cx="32" cy="14" r="6"/><circle cx="14" cy="48" r="6"/><circle cx="50" cy="48" r="6"/><circle cx="32" cy="36" r="4"/><path d="M32 20v12M29 38l-10 7M35 38l10 7"/>',
    bolt: '<path d="M36 6 16 36h14l-4 22 22-32H34z"/>',
    slides: '<rect x="8" y="12" width="48" height="32" rx="3"/><path d="M32 44v10M22 56h20"/><rect x="18" y="20" width="16" height="16" rx="1"/><path d="M40 22h8M40 28h8M40 34h6"/>',
    map: '<path d="M32 56s16-15 16-28a16 16 0 0 0-32 0c0 13 16 28 16 28z"/><circle cx="32" cy="28" r="6"/><circle cx="32" cy="28" r="22" stroke-dasharray="3 4" opacity=".5"/>',
    table: '<rect x="10" y="10" width="44" height="44" rx="3"/><path d="M10 24h44M10 38h44M26 10v44M40 10v44"/>',
    bell: '<path d="M16 44h32l-4-6V28a12 12 0 0 0-24 0v10z"/><path d="M28 50a4 4 0 0 0 8 0"/>',
    mail: '<rect x="8" y="16" width="48" height="32" rx="3"/><path d="m8 18 24 18 24-18"/>',
  };
  const glyph = name => `<svg viewBox="0 0 64 64" aria-hidden="true">${GLYPHS[name] || ''}</svg>`;

  // ---------- Filters + grid ----------
  const FILTERS = ['All', 'Game Dev', 'Web', 'Desktop', 'AI / Tooling', 'Open Source', 'Professional'];
  const grid = $('#grid'), filterBar = $('.filters');
  let active = 'All';

  const cardHTML = p => `
    <button class="card ${p.featured ? 'featured' : ''} ${p.professional ? 'pro' : ''}" data-id="${p.id}" style="--a:${p.accent}" aria-label="${esc(p.title)}: open details">
      <div class="thumb ${p.images ? '' : 'glyph'}">
        ${p.images ? `<img src="${p.images[0].src}" alt="${esc(p.images[0].alt)}" loading="lazy">` : glyph(p.glyph)}
      </div>
      <div class="card-body">
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.tagline)}</p>
        <div class="tags">${p.tags.filter(t => t !== 'Personal' && t !== 'Professional').map(t => `<span class="tag">${esc(t)}</span>`).join('')}
          ${p.professional ? '' : `<span class="more" style="margin-left:auto">details →</span>`}</div>
      </div>
    </button>`;

  const personal = PROJECTS.filter(p => !p.professional), pro = PROJECTS.filter(p => p.professional);
  grid.innerHTML = personal.map(cardHTML).join('') +
    `<div class="pro-head"><h3>Professional work</h3><p>${esc(PRO_INTRO)}</p></div>` +
    pro.map(cardHTML).join('');

  const matches = (p, f) => f === 'All' || p.tags.includes(f);
  filterBar.innerHTML = FILTERS.map(f => {
    const n = PROJECTS.filter(p => matches(p, f)).length;
    return n ? `<button class="chip" data-f="${esc(f)}" aria-pressed="${f === active}">${esc(f)}<span class="n">${n}</span></button>` : '';
  }).join('');

  const applyFilter = f => {
    active = f;
    filterBar.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.f === f));
    let i = 0;
    grid.querySelectorAll('.card').forEach(card => {
      const p = PROJECTS.find(x => x.id === card.dataset.id), show = matches(p, f);
      card.classList.toggle('hide', !show);
      card.classList.remove('enter');
      if (show) { void card.offsetWidth; card.style.animationDelay = `${i++ * 45}ms`; card.classList.add('enter'); }
    });
    $('.pro-head').classList.toggle('hide', !pro.some(p => matches(p, f)));
  };
  filterBar.addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) applyFilter(c.dataset.f); });

  // Tilt + spotlight
  if (!reduceMotion && matchMedia('(hover: hover)').matches) {
    grid.addEventListener('pointermove', e => {
      const card = e.target.closest('.card'); if (!card) return;
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${x * 100}%`); card.style.setProperty('--my', `${y * 100}%`);
      card.style.transform = `perspective(900px) rotateX(${(.5 - y) * 5}deg) rotateY(${(x - .5) * 6}deg) translateY(-4px)`;
    });
    grid.addEventListener('pointerout', e => {
      const card = e.target.closest('.card');
      if (card && !card.contains(e.relatedTarget)) card.style.transform = '';
    });
  }

  // ---------- Modal ----------
  const modal = $('#modal'), mBody = $('.m-body', modal);
  let gIndex = 0, gImages = [];

  const setSlide = i => {
    gIndex = (i + gImages.length) % gImages.length;
    const img = $('.gallery img', modal);
    img.style.opacity = 0;
    setTimeout(() => { img.src = gImages[gIndex].src; img.alt = gImages[gIndex].alt; img.style.opacity = 1; }, reduceMotion ? 0 : 150);
    modal.querySelectorAll('.dots button').forEach((d, k) => d.setAttribute('aria-current', k === gIndex));
  };

  const openProject = id => {
    const p = PROJECTS.find(x => x.id === id); if (!p) return;
    gImages = p.images || []; gIndex = 0;
    mBody.style.setProperty('--a', p.accent);
    mBody.innerHTML = `
      ${gImages.length ? `<div class="gallery">
        <img src="${gImages[0].src}" alt="${esc(gImages[0].alt)}">
        ${gImages.length > 1 ? `<button class="g-btn prev" aria-label="Previous image">‹</button><button class="g-btn next" aria-label="Next image">›</button>
        <div class="dots">${gImages.map((_, k) => `<button aria-label="Image ${k + 1}" aria-current="${k === 0}"></button>`).join('')}</div>` : ''}
      </div>` : ''}
      <div class="m-content">
        <h2 id="m-title">${esc(p.title)}</h2>
        <p class="tagline">${esc(p.tagline)}</p>
        ${p.metrics ? `<div class="m-metrics">${p.metrics.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : ''}
        ${p.description.map(d => `<p>${esc(d)}</p>`).join('')}
        ${p.highlights ? `<h4>Highlights</h4><ul>${p.highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
        <h4>Stack</h4><div class="tags">${p.stack.map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>
        ${p.links ? `<div class="m-links">${p.links.map(l => l.internal
          ? `<a class="btn btn-primary" href="${l.href}">${esc(l.label)} →</a>`
          : l.href
          ? `<a class="btn btn-primary" href="${l.href}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`
          : `<span>${esc(l.label)}</span>`).join('')}</div>` : ''}
      </div>`;
    modal.showModal();
    mBody.scrollTop = 0;
    history.replaceState(null, '', `#project/${id}`);
  };

  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.closest('.m-close')) return modal.close();
    if (e.target.closest('.prev')) return setSlide(gIndex - 1);
    if (e.target.closest('.next')) return setSlide(gIndex + 1);
    const dot = e.target.closest('.dots button');
    if (dot) setSlide([...dot.parentNode.children].indexOf(dot));
  });
  modal.addEventListener('keydown', e => {
    if (gImages.length < 2) return;
    if (e.key === 'ArrowLeft') setSlide(gIndex - 1);
    if (e.key === 'ArrowRight') setSlide(gIndex + 1);
  });
  modal.addEventListener('close', () => history.replaceState(null, '', location.pathname));
  grid.addEventListener('click', e => { const c = e.target.closest('.card'); if (c) openProject(c.dataset.id); });

  const deep = location.hash.match(/^#project\/(.+)$/);
  if (deep) openProject(deep[1]);

  // ---------- Pipeline stepper ----------
  const stepsEl = $('.pipe-steps'), detail = $('.pipe-detail');
  stepsEl.innerHTML = '<span class="fill"></span>' + PIPELINE.map((s, i) =>
    `<li><button role="tab" id="ps-${i}" aria-selected="false">${esc(s.name)}</button></li>`).join('');
  const stepBtns = [...stepsEl.querySelectorAll('button')];
  let step = 0, timer = null;

  const showStep = i => {
    step = i;
    const s = PIPELINE[i];
    stepBtns.forEach((b, k) => { b.setAttribute('aria-selected', k === i); b.classList.toggle('done', k < i); });
    const btn = stepBtns[i];
    $('.fill', stepsEl).style.height = `${btn.offsetTop + btn.offsetHeight / 2 - 18}px`;
    detail.innerHTML = `
      <div class="anim">
        <span class="who">Stage ${i + 1} of ${PIPELINE.length} · ${esc(s.who)}</span>
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.body)}</p>
      </div>
      <div class="pipe-nav">
        <button class="prev" ${i === 0 ? 'disabled' : ''}>← Back</button>
        <button class="next" ${i === PIPELINE.length - 1 ? 'disabled' : ''}>Next →</button>
        <button class="auto" aria-pressed="${!!timer}">${timer ? '❚❚ Pause' : '▶ Play'}</button>
      </div>`;
    detail.setAttribute('aria-labelledby', `ps-${i}`);
  };
  const stopAuto = () => { clearInterval(timer); timer = null; };
  const toggleAuto = () => {
    if (timer) stopAuto();
    else {
      if (step === PIPELINE.length - 1) step = -1;
      timer = setInterval(() => { if (step >= PIPELINE.length - 1) { stopAuto(); showStep(step); } else showStep(step + 1); }, 3200);
      showStep(step + 1);
      return;
    }
    showStep(step);
  };
  stepsEl.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { stopAuto(); showStep(stepBtns.indexOf(b)); } });
  detail.addEventListener('click', e => {
    if (e.target.closest('.prev')) { stopAuto(); showStep(step - 1); }
    else if (e.target.closest('.next')) { stopAuto(); showStep(step + 1); }
    else if (e.target.closest('.auto')) toggleAuto();
  });
  stepsEl.addEventListener('keydown', e => {
    const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!d) return;
    e.preventDefault(); stopAuto();
    const n = Math.max(0, Math.min(PIPELINE.length - 1, step + d));
    showStep(n); stepBtns[n].focus();
  });
  showStep(0);
  addEventListener('resize', () => showStep(step));
})();
