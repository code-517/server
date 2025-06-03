document.addEventListener('DOMContentLoaded', () => {
  // 綁定 "返回" 按鈕事件
  document.getElementById('go-back-btn').addEventListener('click', () => {
    window.history.back();
  });

  // 綁定 "返回系列" 按鈕事件
  document.getElementById('go-to-series-btn').addEventListener('click', () => {
    window.location.href = '/series';
  });

  // 綁定 "查看牌組" 按鈕事件
  document.getElementById('search-deck-btn').addEventListener('click', () => {
    const deckName = document.getElementById('deckNameInput').value.trim();
    if (deckName) {
      window.location.href = `/decks?name=${encodeURIComponent(deckName)}`;
    } else {
      alert('請輸入牌組名稱！');
    }
  });

  // 綁定 "搜索系列" 按鈕事件
  document.getElementById('search-series-btn').addEventListener('click', () => {
    const seriesName = document.getElementById('seriesSelect').value;
    if (!seriesName) {
      alert('請選擇系列！');
      return;
    }
    if (seriesName === 'all') {
      window.location.href = '/decks'; // 顯示全部牌組
    } else {
      window.location.href = `/decks?series=${encodeURIComponent(seriesName)}`;
    }
  });
});