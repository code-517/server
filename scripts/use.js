const slider = document.getElementById('use-slider');
if (slider) {
  const slidesEl = slider.querySelector('.slides');
  const slideEls = [...slider.querySelectorAll('.slide')];
  const prevBtn = slider.querySelector('.nav.prev');
  const nextBtn = slider.querySelector('.nav.next');
  const dotsEl = slider.querySelector('.dots');
  const total = slideEls.length;
  let index = 0;
  let timer;
  let startX = 0;
  let deltaX = 0;

  const goTo = (i) => {
    index = (i + total) % total;
    slidesEl.style.transform = `translateX(-${index * 100}%)`;
    [...dotsEl.children].forEach((d, di) => {
      d.classList.toggle('active', di === index);
    });
  };

  const startAuto = () => {
    stopAuto();
    timer = setInterval(() => goTo(index + 1), 4000);
  };
  const stopAuto = () => timer && clearInterval(timer);

  // dots
  slideEls.forEach((_, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', `第 ${i + 1} 張`);
    b.addEventListener('click', () => { goTo(i); startAuto(); });
    dotsEl.appendChild(b);
  });

  prevBtn.addEventListener('click', () => { goTo(index - 1); startAuto(); });
  nextBtn.addEventListener('click', () => { goTo(index + 1); startAuto(); });

  // hover pause
  slider.addEventListener('mouseenter', stopAuto);
  slider.addEventListener('mouseleave', startAuto);

  // touch swipe
  slidesEl.addEventListener('touchstart', (e) => {
    stopAuto();
    startX = e.touches[0].clientX;
    deltaX = 0;
  }, { passive: true });
  slidesEl.addEventListener('touchmove', (e) => {
    deltaX = e.touches[0].clientX - startX;
  }, { passive: true });
  slidesEl.addEventListener('touchend', () => {
    if (Math.abs(deltaX) > 40) {
      goTo(index + (deltaX < 0 ? 1 : -1));
    }
    startAuto();
  });

  goTo(0);
  startAuto();
}