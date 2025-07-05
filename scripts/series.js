document.addEventListener('DOMContentLoaded', () => {
  // 綁定 "查看牌組" 按鈕事件
  document.getElementById('view-decks-btn').addEventListener('click', () => {
    window.location.href = '/decks';
  });

  // 綁定下拉選單事件
  document.getElementById('series-select').addEventListener('change', (event) => {
    const selectedSeries = event.target.value;
    if (selectedSeries) {
      window.location.href = `/cards/${selectedSeries}`;
    }
  });
  const lazyImages = document.querySelectorAll('img.lazy');
  lazyImages.forEach(img => {
    img.src = img.dataset.src;
  });
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