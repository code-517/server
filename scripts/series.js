document.addEventListener('DOMContentLoaded', () => {
  const initSlider = (sliderEl, intervalMs = 4000) => {
    const slidesEl = sliderEl.querySelector('.slides');
    const slideEls = Array.from(slidesEl?.children || []);
    const dotsEl = sliderEl.querySelector('.dots');
    if (!slidesEl || !dotsEl || slideEls.length <= 1) return;

    let current = 0;
    let timerId = null;

    const renderDots = () => {
      dotsEl.innerHTML = '';
      slideEls.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', `Slide ${i + 1}`);
        btn.addEventListener('click', () => goTo(i, true));
        dotsEl.appendChild(btn);
      });
    };

    const update = () => {
      slidesEl.style.transform = `translateX(-${current * 100}%)`;
      Array.from(dotsEl.children).forEach((d, i) => d.classList.toggle('active', i === current));
    };

    const goTo = (index, user = false) => {
      current = (index + slideEls.length) % slideEls.length;
      update();
      if (user) restart();
    };

    const next = () => goTo(current + 1);
    const prev = () => goTo(current - 1);

    const start = () => {
      if (timerId !== null) clearInterval(timerId);
      timerId = setInterval(next, intervalMs);
    };

    const stop = () => {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    };

    const restart = () => {
      stop();
      start();
    };

    // 新增左右箭頭按鍵
    const prevBtn = document.createElement('button');
    prevBtn.className = 'slider-arrow slider-prev';
    prevBtn.innerHTML = '❮';
    prevBtn.addEventListener('click', () => { prev(); restart(); });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'slider-arrow slider-next';
    nextBtn.innerHTML = '❯';
    nextBtn.addEventListener('click', () => { next(); restart(); });

    sliderEl.appendChild(prevBtn);
    sliderEl.appendChild(nextBtn);

    renderDots();
    update();
    start();

    sliderEl.addEventListener('mouseenter', stop);
    sliderEl.addEventListener('mouseleave', start);

    // 觸控滑動
    let startX = null;
    sliderEl.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; stop(); }, { passive: true });
    sliderEl.addEventListener('touchend', (e) => {
      if (startX == null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
      startX = null;
      start();
    }, { passive: true });
  };

  document.querySelectorAll('.top-slider, .notice-slider').forEach(el => initSlider(el, 4000));

  // 綁定 "查看牌組" 按鈕事件
  const viewDeckBtn = document.getElementById('view-decks-btn');
  if (viewDeckBtn) {
    viewDeckBtn.addEventListener('click', () => {
      window.location.href = '/decks';
    });
  }

  // 綁定下拉選單事件
  const seriesSelect = document.getElementById('series-select');
  if (seriesSelect) {
    seriesSelect.addEventListener('change', (event) => {
      const selectedSeries = event.target.value;
      if (selectedSeries) {
        window.location.href = `/cards/${selectedSeries}`;
      }
    });
  }

  // 綁定系列卡片點擊事件
  document.querySelectorAll('.series-card').forEach(card => {
    card.addEventListener('click', () => {
      const seriesName = card.getAttribute('data-series-name');
      if (seriesName) {
        window.location.href = `/cards/${seriesName}`;
      }
    });
  });
});