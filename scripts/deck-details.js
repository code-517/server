document.addEventListener('DOMContentLoaded', () => {
  // 從 HTML 的 data-* 屬性中讀取數據
  const body = document.body;
  const deckData = {
    deck: JSON.parse(body.getAttribute('data-deck')),
    deckName: body.getAttribute('data-deck-name'),
    deckIdea: body.getAttribute('data-deck-idea'),
    comments: JSON.parse(body.getAttribute('data-comments') || '[]'),
    totalPrice: parseFloat(body.getAttribute('data-total-price')) || 0,
  };
  // 初始化 window.deckData
  window.deckData = deckData;

  if (!window.deckData || !window.deckData.deck) {
    console.error('window.deckData is undefined or invalid!');
    return;
  }
  const fullscreenLayer = document.getElementById('fullscreen-image-layer');
  if (fullscreenLayer) {
    fullscreenLayer.onclick = function (e) {
      // 只在點擊背景時關閉，點擊圖片本身不關閉
      if (e.target === fullscreenLayer) {
        fullscreenLayer.style.display = 'none';
        document.getElementById('fullscreen-image').src = '';
      }
    };
  }
  const { deck, deckName, deckIdea, comments } = window.deckData;

  // 依必要能量顏色+數字排序
  const colorOrder = ['黃', '藍', '紅', '綠', '無'];
  function getEnergySortKey(card) {
    const val = card.details?.["必要エナジー"] || '';
    const color = val.replace(/[0-9\-]/g, '') || '無';
    const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
    const colorIdx = colorOrder.indexOf(color);
    return [colorIdx === -1 ? 99 : colorIdx, isNaN(num) ? 0 : num];
  }
  deck.sort((a, b) => {
    const [colorA, numA] = getEnergySortKey(a);
    const [colorB, numB] = getEnergySortKey(b);
    if (colorA !== colorB) return colorA - colorB;
    return numA - numB;
  });

  // 渲染卡片（含數量）
  renderDeckCards();

  // 綁定 "返回" 按鈕事件
  document.getElementById('go-back-btn').addEventListener('click', () => {
    window.history.back();
  });
  const copyBtn = document.getElementById('copy-deck-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      // 解析 data-deck
      const deckData = document.body.getAttribute('data-deck');
      if (!deckData) {
        console.error('未找到 data-deck 屬性！');
        return;
      }
  
      const deck = JSON.parse(deckData);
  
      // 確保 deck.cards 存在且有內容
      if (!deck || !deck.length || !deck[0]?.series) {
        console.error('牌組資料無效或沒有卡片！');
        return;
      }
  
      // 獲取第一張卡片的 series，並將空格替換為 "_"
    const seriesName = encodeURIComponent(
      deck[0].series.replace(/\s+/g, '_') // 替換空格
                    .replace(/[・：×]/g, '_') // 替換特殊字符
                    .replace(/の/g, '的') // 替換日文「の」為中文「的」
    );

      // 存入 localStorage
      localStorage.setItem('copiedDeck', JSON.stringify(deck));
  
      // 跳轉到該系列卡片頁
      window.location.href = `/cards/${seriesName}?copied=1`;
    });
  }
  // 設置思路分享內容
  document.getElementById('deck-idea').value = deckIdea || '尚未提供思路分享';

  // 初始化留言區
  const commentsList = document.getElementById('comments-list');
  const commentCount = document.getElementById('comment-count');

  // 渲染留言列表
  comments.forEach((comment) => {
    const commentItem = document.createElement('li');
    commentItem.innerHTML = `<strong>匿名用戶：</strong> ${comment.comment} <em>(${new Date(comment.timestamp).toLocaleString()})</em>`;
    commentsList.appendChild(commentItem);
  });

  // 綁定 "輸出牌組圖片" 按鈕事件
   document.getElementById('export-deck-btn').addEventListener('click', () => {
    const deckContainer = document.querySelector('.deck-container');
    const backgroundImage = new Image();
    backgroundImage.src = '/images/name.png';
  
    backgroundImage.onload = () => {
      html2canvas(deckContainer, { backgroundColor: null }).then((canvas) => {
        const cardCanvas = document.createElement('canvas');
        const ctx = cardCanvas.getContext('2d');
  
        // 根據螢幕尺寸動態設置畫布大小
        const isMobile = window.innerWidth <= 768; // 判斷是否為手機螢幕
        const canvasWidth = isMobile ? Math.max(backgroundImage.width, canvas.width) : Math.max(backgroundImage.width, canvas.width);
        const canvasHeight = isMobile
          ? backgroundImage.height + canvas.height + 50 // 手機螢幕高度調整
          : backgroundImage.height + canvas.height + 100;
  
        cardCanvas.width = canvasWidth;
        cardCanvas.height = canvasHeight;
  
        // 填充背景
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, cardCanvas.width, cardCanvas.height);
  
        // 繪製背景圖片
        ctx.drawImage(backgroundImage, 0, 0, backgroundImage.width, backgroundImage.height);
  
        // 動態調整文字大小和間距
        const textX = backgroundImage.width + (isMobile ? 15 : 30); // 手機螢幕文字位置調整
        const textYStart = isMobile ? 70 : 140; // 手機螢幕文字起始位置調整
        const spacing = isMobile ? 70 : 140; // 手機螢幕文字間距調整
  
        ctx.fillStyle = 'black';
        ctx.font = isMobile ? '30px Arial' : '60px Arial'; // 手機螢幕文字大小調整
        ctx.fillText(`牌組名稱: ${window.deckData.deckName}`, textX, textYStart);
        ctx.fillText(`系列: ${window.deckData.deck[0]?.series || '未知系列'}`, textX, textYStart + spacing);
        ctx.fillText(`總金額: ${window.deckData.totalPrice || 0} 日圓`, textX, textYStart + spacing * 2);
  
        // 繪製分隔線
        const lineY = backgroundImage.height + 10;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(canvasWidth, lineY);
        ctx.stroke();
  
        // 繪製卡片
        const cardX = 0;
        const cardY = lineY + 10;
        ctx.drawImage(canvas, cardX, cardY, canvas.width, canvas.height);
  
        // 下載圖片
        const link = document.createElement('a');
        link.download = 'deck-image.png';
        link.href = cardCanvas.toDataURL('image/png');
        link.click();
      });
    };
  
    backgroundImage.onerror = () => {
      alert('無法加載背景圖片，請檢查圖片路徑是否正確！');
    };
  });
  // 渲染卡片函數（含數量）
  function renderDeckCards() {
    const deckContainer = document.querySelector('.deck-container');
    deckContainer.innerHTML = '';
    deck.forEach((card, idx) => {
      const cardDiv = document.createElement('div');
      cardDiv.className = 'deck-card';
      cardDiv.setAttribute('data-index', idx);
      cardDiv.innerHTML = `
        <img src="${card.image_url}" alt="${card.card_name}">
        <div>${card.trcard_name || card.card_name || '無名稱'}</div>
        <div>${card.details?.["必要エナジー"] || ''}</div>
        <div class="card-count">x${card.number || 1}</div>
      `;
      cardDiv.addEventListener('click', () => showModal(idx));
      deckContainer.appendChild(cardDiv);
    });
  }

  // 綁定 "關閉彈窗" 按鈕事件
  document.getElementById('close-modal-btn').addEventListener('click', () => {
    document.getElementById('card-modal').style.display = 'none';
  });

  // 綁定留言表單提交事件
  document.getElementById('comment-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const commentInput = document.getElementById('commentInput');
    const comment = commentInput.value.trim();
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    if (!comment) {
      alert('留言內容不能為空！');
      return;
    }

    fetch(`/shared-decks/${deckName}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ comment }),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.message || '留言失敗');
          });
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          const commentsList = document.getElementById('comments-list');
          commentsList.innerHTML = '';
          data.comments.forEach((comment) => {
            const newComment = document.createElement('li');
            newComment.innerHTML = `<strong>匿名用戶：</strong> ${comment.comment} <em>(${new Date(comment.timestamp).toLocaleString()})</em>`;
            commentsList.appendChild(newComment);
          });

          document.getElementById('comment-count').textContent = `留言數量：${data.commentCount}`;
          commentInput.value = '';
        } else {
          alert(`留言失敗：${data.message}`);
        }
      })
      .catch((error) => {
        if (error.message === '留言過於頻繁，請稍後再試！') {
          alert('您留言過於頻繁，請稍後再試！');
        } else if (error.message === '留言數量已達上限！') {
          alert('該牌組的留言數量已達上限，無法繼續留言！');
        } else {
          alert(error.message);
        }
      });
  });

  function highlightKeywords(effectText) {
  // 定義關鍵字及其顏色
  const keywordStyles = {
    "啟動": "color: rgb(112, 209, 253);",
    "攻擊時": "color: rgb(112, 209, 253);",
    "阻擋時": "color: rgb(112, 209, 253);",
    "登場時": "color:rgb(112, 209, 253);",
    "退場時": "color:rgb(112, 209, 253);",
    "如果在你的回合中": "color:rgb(112, 209, 253);",
    "在對手的回合中": "color:rgb(112, 209, 253);",
    "在前線時": "color:rgb(112, 209, 253);",
    "在前線的情況": "color:rgb(112, 209, 253);",
    "如果在對手的回合中": "color:rgb(112, 209, 253);",
    "1回合1次": "color:rgb(112, 209, 253);",
    "衝擊無效": "color:rgb(235, 245, 94);",
    "衝擊失效": "color:rgb(235, 245, 94);",
    "衝擊": "color:rgb(235, 245, 94);",
    "滑步": "color:rgb(235, 245, 94);",
    "狙擊": "color:rgb(235, 245, 94);",
    "阻擋": "color:rgb(235, 245, 94);",
    "兩次阻擋": "color:rgb(235, 245, 94);",
    "兩次攻擊": "color:rgb(235, 245, 94);",
    "傷害": "color:rgb(235, 245, 94);",
    "突襲": "color:rgb(253, 161, 153);",
    "此卡退場": "color:rgb(253, 161, 153);",

  };

  // 使用正則表達式替換關鍵字
  const highlightedText = effectText.replace(
    new RegExp(Object.keys(keywordStyles).join('|'), 'g'),
    (matched) => `<span style="${keywordStyles[matched]}">${matched}</span>`
  );

  return highlightedText;
  }
  function showModal(index) {
    const card = deck[index];
    if (!card) return;
  
    document.getElementById('modal-image').src = card.image_url || '';
    const modalImage = document.getElementById('modal-image');
    modalImage.onclick = function () {
      const fullscreenLayer = document.getElementById('fullscreen-image-layer');
      const fullscreenImg = document.getElementById('fullscreen-image');
      fullscreenImg.src = card.image_url || '';
      fullscreenLayer.style.display = 'flex';
    };
  
    document.getElementById('modal-name').textContent = card.trcard_name || card.card_name || '無名稱';
    document.getElementById('modal-number').textContent = card.card_number || '無資料';
    document.getElementById('modal-rarity').textContent = card.rare || '無資料';
    document.getElementById('modal-color').textContent = card.details?.["必要エナジー"]?.replace(/[0-9]/g, '') || '無';
    document.getElementById('modal-generation').textContent = card.details?.["発生エナジー"] || '無';
    document.getElementById('modal-price').textContent = card.money || '無價格資料';
    document.getElementById('modal-energy').textContent = card.details?.["必要エナジー"] || '無';
    document.getElementById('modal-ap').textContent = card.details?.["AP"] || '無';
    document.getElementById('modal-bp').textContent = card.details?.["BP"] || '無';
    document.getElementById('modal-type').textContent = card.details?.["trカード種類"] || card.details?.["カード種類"] || '無';
  
    // 處理效果文字中的換行符
  const effect = card.details?.["tr効果"] || card.details?.["効果"] || '無';
  const effectHtml = highlightKeywords(effect || '')
    .replace(/\\n/g, '<br>')
    .replace(/\n/g, '<br>');
  document.getElementById('modal-effect').innerHTML = effectHtml;

  // 處理觸發文字中的換行符並高亮關鍵字
  const trigger = card.details?.["trトリガー"] || card.details?.["トリガー"] || '無';
  const triggerHtml = highlightKeywords(trigger || '')
    .replace(/\\n/g, '<br>')
    .replace(/\n/g, '<br>');
  document.getElementById('modal-trigger').innerHTML = triggerHtml;


  document.getElementById('card-modal').style.display = 'flex';
}
});