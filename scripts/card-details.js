const cards = JSON.parse(document.getElementById('card-data').textContent);

let deck = [];
let deckSortMode = 'original'; // 'energy' 或 'original'
let translationMode = false;

const filters = {
  rarity: new Set(),
  color: new Set(),
  energy: new Set(),
  ap: new Set(),
  type: new Set(),
};

document.addEventListener('DOMContentLoaded', () => {
  const copiedDeck = localStorage.getItem('copiedDeck');
  if (copiedDeck) {
    const copiedCards = JSON.parse(copiedDeck);
    deck = [...deck, ...copiedCards]; // 合併複製的牌組到當前牌組
    localStorage.removeItem('copiedDeck');

    // 調用 /deck/add API 將複製的牌組同步到伺服器
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    fetch('/deck/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ cards: copiedCards }), // 傳送複製的牌組
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          deck = data.deck; // 更新本地的 deck 陣列
          updateDeckDisplay(); // 更新顯示
        } else {
          console.error(`新增失敗：${data.message}`);
        }
      })
      .catch(error => {
        console.error('新增複製牌組時發生錯誤:', error);
      });

    updateDeckDisplay(); // 更新顯示
  } else {
    // 新增：從伺服器獲取臨時牌組
    fetch('/deck/current', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          deck = data.deck; // 更新本地的 deck 陣列
          updateDeckDisplay(); // 更新顯示
        } else {
          console.error(`獲取臨時牌組失敗：${data.message}`);
        }
      })
      .catch(error => {
        console.error('獲取臨時牌組時發生錯誤:', error);
      });
  }
    
      // 角色名稱搜尋功能
  const searchInput = document.getElementById('character-search-input');
  const searchBtn = document.getElementById('character-search-btn');
  const cardContainer = document.getElementById('card-container');

  function filterByCharacterName() {
    const keyword = searchInput.value.trim().toLowerCase();
    const cardDivs = cardContainer.querySelectorAll('.card');
    cardDivs.forEach(div => {
      const idx = div.getAttribute('data-index').replace('card-', '');
      const card = cards[idx];
      const name = (card.card_name || '').toLowerCase();
      const trname = (card.trcard_name || '').toLowerCase();
      const cardType = (card.details?.["カード種類"] || '').toLowerCase();
      const trCardType = (card.details?.["trカード種類"] || '').toLowerCase();
  
      // 如果輸入 ap，搜尋行動點卡
      if (keyword === 'ap') {
        if (cardType.includes('アクションポイント') || trCardType.includes('行動卡')) {
          div.style.display = '';
        } else {
          div.style.display = 'none';
        }
      } else if (keyword === '' || name.includes(keyword) || trname.includes(keyword)) {
        div.style.display = '';
      } else {
        div.style.display = 'none';
      }
    });
  }

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', filterByCharacterName);
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') filterByCharacterName();
    });
  }
});
  // 綁定按鈕事件
  document.getElementById('toggle-menu-btn').addEventListener('click', toggleMenu);
  document.getElementById('toggle-filters-btn').addEventListener('click', toggleFilters);
  document.getElementById('toggle-translation-btn').addEventListener('click', toggleTranslationMode);
  document.getElementById('go-to-series-btn').addEventListener('click', goToSeries);
  document.getElementById('view-decks-btn').addEventListener('click', viewDecks);
  const backToTopBtn = document.getElementById('back-to-top-btn');
  // 篩選按鈕事件
  document.getElementById('sort-energy-btn').addEventListener('click', () => {
    deckSortMode = 'energy';
    updateDeckDisplay();
  });
  document.getElementById('sort-original-btn').addEventListener('click', () => {
    deckSortMode = 'original';
    updateDeckDisplay();
  });
  document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => {
      const type = button.dataset.type;
      const value = button.dataset.value;
      toggleFilter(button, type, value);
    });
  });
  document.querySelectorAll('.remove-from-deck-btn').forEach(button => {
    button.addEventListener('click', () => {
      event.stopPropagation(); // 阻止事件冒泡
      const index = parseInt(button.getAttribute('data-index'), 10); // 獲取索引
      const card = cards[index]; // 根據索引獲取卡片資料
      if (card) {
        removeOneFromDeck(card.card_number, card.rare); // 傳遞卡片的 card_number 和 rare
      } else {
        console.error('找不到對應的卡片資料，索引:', index);
      }
    });
  });
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) { // 當滾動超過 300px 時顯示按鈕
      backToTopBtn.style.display = 'block';
    } else {
      backToTopBtn.style.display = 'none';
    }
  });
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth' // 平滑滾動
    });
  });
  document.querySelectorAll('.add-to-deck-btn').forEach(button => {
    button.addEventListener('click', () => {
      event.stopPropagation(); // 阻止事件冒泡
      const index = button.getAttribute('data-index');
      addToDeck(index);
    });
  });  // 關閉篩選欄
    document.getElementById('deck-container').addEventListener('click', event => {
    if (event.target.classList.contains('add-btn')) {
      const cardNumber = event.target.getAttribute('data-card-number');
      const cardRare = event.target.getAttribute('data-card-rare');
      addToDeckFromDeck(cardNumber, cardRare);
    }
  
    if (event.target.classList.contains('remove-btn')) {
      const cardNumber = event.target.getAttribute('data-card-number');
      const cardRare = event.target.getAttribute('data-card-rare');
      removeOneFromDeck(cardNumber, cardRare);
    }
  });
    // 綁定關閉側邊選單按鈕
    const closeMenuButton = document.getElementById('close-menu-btn');
    if (closeMenuButton) {
      closeMenuButton.addEventListener('click', toggleMenu);
    }
  
    // 綁定關閉篩選欄按鈕
    const closeFiltersButton = document.getElementById('close-filters-btn');
    if (closeFiltersButton) {
      closeFiltersButton.addEventListener('click', toggleFilters);
    }

  // 創建牌組按鈕
  document.getElementById('save-deck-btn').addEventListener('click', saveDeck);

  // 清空牌組按鈕
  document.getElementById('clear-deck-btn').addEventListener('click', clearDeck);

  // 點擊卡片顯示詳細內容
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const cardNumber = card.getAttribute('data-card-number');
      const cardRare = card.getAttribute('data-rarity');
      showModal(cardNumber, cardRare);
    });
  });
function toggleMenu() {
  const menu = document.getElementById('side-menu');
  const mainContent = document.getElementById('main-content');
  const cardContainer = document.querySelector('.card-container');
  const menuButtons = document.querySelector('.menu-buttons');

  menu.classList.toggle('open');
  mainContent.classList.toggle('shifted');
  cardContainer.classList.toggle('shifted');

  if (menu.classList.contains('open')) {
    menuButtons.classList.add('hidden');
  } else {
    menuButtons.classList.remove('hidden');
  }
}

function toggleFilters() {
  const filterContainer = document.getElementById('filter-container');
  const overlay = document.getElementById('overlay');
  const menuButtons = document.querySelector('.menu-buttons');

  filterContainer.classList.toggle('open');
  overlay.classList.toggle('active');

  if (filterContainer.classList.contains('open')) {
    menuButtons.classList.add('hidden');
  } else {
    menuButtons.classList.remove('hidden');
  }
}

function toggleFilter(button, type, value) {
  const isSelected = button.classList.contains('selected');

  if (isSelected) {
    button.classList.remove('selected');
    filters[type].delete(value);
  } else {
    button.classList.add('selected');
    filters[type].add(value);
  }

  applyFilters();
}

function applyFilters() {
  const cards = document.querySelectorAll('.card');

  // 如果所有篩選條件都為空或包含空字串 ""，顯示所有卡片
  const noFiltersApplied = Object.values(filters).every(filterSet => 
    filterSet.size === 0 || filterSet.has("")
  );
  if (noFiltersApplied) {
    cards.forEach(card => {
      card.style.display = 'block';
    });
    return;
  }

  cards.forEach(card => {
    const cardRarity = card.getAttribute('data-rarity');
    const cardType = card.getAttribute('data-type') || '';
    let cardColor = card.getAttribute('data-color');
    const cardEnergy = card.getAttribute('data-energy');
    const cardAP = parseInt(card.getAttribute('data-ap'), 10);
    const cardNumber = card.getAttribute('data-card-number') || ''; // 確保 cardNumber 不為 null

    cardColor = cardColor.replace(/^(綠-|黃-|紅-|藍-)/, '').replace(/[0-9]/g, '').replace(/\+/g, '');
    const matchesType = filters.type.size === 0 || filters.type.has("") || filters.type.has(cardType) || 
      (filters.type.has("預組") && cardNumber.includes("ST")) || 
      (filters.type.has("補充包") && cardNumber.includes("BT"));
    const matchesRarity = filters.rarity.size === 0 || filters.rarity.has("") || Array.from(filters.rarity).some(rarity => {
      if (rarity === "AP") {
        return cardNumber.includes("AP"); // 檢查 cardNumber 是否包含 "AP"
      }
      return cardRarity && cardRarity.startsWith(rarity); // 確保 cardRarity 不為 null 或 undefined
    });
    const matchesColor = filters.color.size === 0 || filters.color.has("") || filters.color.has(cardColor || '無');
    const matchesEnergy = filters.energy.size === 0 || filters.energy.has("") || (cardEnergy !== 'null' && filters.energy.has(cardEnergy));    
    const matchesAP = filters.ap.size === 0 || filters.ap.has("") || filters.ap.has(cardAP.toString());
    if (matchesRarity && matchesColor && matchesEnergy && matchesAP && matchesType) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}
function goToSeries() {
  window.location.href = '/series';
}

function saveDeck() {
  const deckNameInput = document.getElementById('deck-name-input');
  const deckIdeaInput = document.getElementById('deck-idea-input');
  let deckName = deckNameInput.value.trim();
  let deckIdea = deckIdeaInput.value.trim();

  // 檢查牌組名稱長度是否超過 8 個字元
  if (deckName.length > 8) {
    alert('牌組名稱不能超過 8 個字元，請重新輸入。');
    return; // 阻止保存操作
  }

  if (!deckName) {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    deckName = '';
    for (let i = 0; i < 2; i++) {
      deckName += letters[Math.floor(Math.random() * letters.length)];
    }
    for (let i = 0; i < 2; i++) {
      deckName += numbers[Math.floor(Math.random() * numbers.length)];
    }
  }

  const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

  fetch('/deck/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CSRF-Token': csrfToken, // 傳遞 CSRF token
    },
    body: JSON.stringify({ deckName, deckIdea }), // 傳送牌組名稱和思路分享
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert(`牌組已保存，名稱為: ${data.deckName}`);
        deck = [];
        updateDeckDisplay();
        resetCardCounts(); // 重置卡片數量
        deckNameInput.value = '';
        deckIdeaInput.value = '';
      } else {
        alert(`保存失敗: ${data.message}`);
      }
    })
    .catch(error => {
      console.error('保存牌組時發生錯誤:', error);
      alert('保存牌組時發生錯誤');
    });
}
function viewDecks() {
  window.location.href = '/decks';
}

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

function showModal(cardNumber, cardRare) {
  const card = cards.find(card =>
    card.card_number === cardNumber &&
    (card.rare === cardRare || card.rare === null || cardRare === null)
  );

  if (!card) {
    alert('找不到卡片資料');
    return;
  }

  const cardName = translationMode
    ? card.trcard_name || card.card_name || '無名稱'
    : card.card_name || '無名稱';

  const effect = translationMode
    ? card.details?.["tr効果"] || '無'
    : card.details?.["効果"] || '無';

  const trigger = translationMode
    ? card.details?.["trトリガー"] || '無'
    : card.details?.["トリガー"] || '無';

  const cardType = translationMode
    ? card.details?.["trカード種類"] || card.details?.["カード種類"] || '無'
    : card.details?.["カード種類"] || '無';
  // 確保 effect 和 trigger 存在，否則使用空字串
  const effectHtml = highlightKeywords(effect || '')
    .replace(/\\n/g, '<br>')
    .replace(/\n/g, '<br>');

  const triggerHtml = highlightKeywords(trigger || '')
    .replace(/\\n/g, '<br>')
    .replace(/\n/g, '<br>');

  const modalContent = `
    <div class="modal-content">
      <button class="close-btn close-modal-btn">×</button>
      <div class="modal-left">
        <img id="modal-image" src="${card.image_url || ''}" alt="${card.card_name || '無名稱'}" style="cursor:zoom-in;">
      </div>
      <div class="modal-right">
        <h3>${cardName}</h3>
        <p><strong>卡號:</strong> ${card.card_number || '無資料'}</p>
        <p><strong>稀有度:</strong> ${card.rare || '無資料'}</p>
        <p><strong>特徵:</strong> ${card.details?.["特徴"] || '無資料'}</p>
        <p><strong>顏色:</strong> ${(card.details?.["必要エナジー"]?.replace(/[0-9]/g, '').replace('青', '藍')) || '無'}</p>
        <p><strong>產生:</strong> ${(card.details?.["発生エナジー"]?.replace('青', '藍')) || '無'}</p>
        <p><strong>價格:</strong> ${card.money || '無價格資料'}</p>
        <hr>
        <p><strong>必要能量:</strong> ${(card.details?.["必要エナジー"]?.replace('青', '藍')) || '無'}</p>
        <p><strong>AP:</strong> ${card.details?.["AP"] || '無'}</p>
        <p><strong>BP:</strong> ${card.details?.["BP"] || '無'}</p>
        <p><strong>卡片種類:</strong> ${cardType}</p>
        <div><strong>效果:</strong><br>${effectHtml}</div>
        <div><strong>觸發:</strong><br>${triggerHtml}</div>
      </div>
    </div>
  `;
  
  const modal = document.getElementById('card-modal');
  modal.innerHTML = modalContent;
  modal.style.display = 'flex';
  const closeModalButton = modal.querySelector('.close-modal-btn');
  if (closeModalButton) {
    closeModalButton.style.background = '#ff5c5c';
    closeModalButton.style.color = '#fff';
    closeModalButton.addEventListener('click', closeCardModal);
  }

  // 新增：點擊圖片放大
  const modalImage = modal.querySelector('#modal-image');
  if (modalImage) {
    modalImage.addEventListener('click', () => {
      showImageOverlay(modalImage.src, modalImage.alt);
    });
  }
}

// 新增：放大圖片層函數
function showImageOverlay(src, alt) {
  let overlay = document.getElementById('image-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'image-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 99999;
    overlay.innerHTML = `<img src="${src}" alt="${alt}" style="max-width:90vw;max-height:90vh;box-shadow:0 0 20px #000;border-radius:10px;cursor:zoom-out;">`;
    overlay.addEventListener('click', () => {
      overlay.style.display = 'none';
    });
    document.body.appendChild(overlay);
  } else {
    overlay.innerHTML = `<img src="${src}" alt="${alt}" style="max-width:90vw;max-height:90vh;box-shadow:0 0 20px #000;border-radius:10px;cursor:zoom-out;">`;
    overlay.style.display = 'flex';
  }
}

function closeCardModal() {
  const modal = document.getElementById('card-modal');
  modal.style.display = 'none';
}

function toggleTranslationMode() {
  translationMode = !translationMode;
  const translationButton = document.getElementById('toggle-translation-btn');
  if (translationButton) {
    translationButton.textContent = translationMode ? '顯示日文' : '顯示中文';
  } else {
    console.warn('Translation button not found.');
  }

  const cardsElements = document.querySelectorAll('.card');
  cardsElements.forEach(card => {
    const cardNumber = card.getAttribute('data-card-number');
    const cardData = cards.find(c => c.card_number === cardNumber);

    if (cardData) {
      const cardName = translationMode
        ? cardData.trcard_name || cardData.card_name || '無名稱'
        : cardData.card_name || '無名稱';

      const cardTitleElement = card.querySelector('h2');
      if (cardTitleElement) cardTitleElement.textContent = cardName;

      const cardTypeElement = card.querySelector('.card-type');
      if (cardTypeElement) {
        const cardType = translationMode
          ? cardData.details?.["trカード種類"] || cardData.details?.["カード種類"] || '無'
          : cardData.details?.["カード種類"] || '無';
        cardTypeElement.textContent = `卡片種類: ${cardType}`;
      }
    } else {
      console.error(`Card data not found for card number: ${cardNumber}`);
    }
  });
}
function addToDeck(index) {
  const card = cards[index];
  if (!card) {
    console.error('找不到卡片資料，索引:', index);
    alert('找不到卡片資料');
    return;
  }


  const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

  fetch('/deck/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CSRF-Token': csrfToken, // 傳遞 CSRF token
    },
    body: JSON.stringify({ card }), // 傳送卡片資料
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        deck = data.deck; // 更新本地的 deck 陣列
        updateDeckDisplay(); // 再次更新側邊選單顯示
        updateCardCount(index); // 更新卡片數量
      } else {
        alert(`新增失敗：${data.message}`);
      }
    })
    .catch(error => {
      console.error('新增卡片時發生錯誤:', error);
      alert('新增卡片時發生錯誤');
    });
}
function updateDeckDisplay() {
  const deckContainer = document.getElementById('deck-container');
  const deckCount = document.getElementById('deck-count');
  const totalPriceElement = document.getElementById('total-price');

  if (deck.length === 0) {
    deckContainer.innerHTML = '<p>牌組為空</p>';
    deckCount.textContent = '0';
    totalPriceElement.textContent = '總價格: 0 日元';
    return;
  }
  deckContainer.innerHTML = '';

  if (deckSortMode === 'energy') {
    // 依必要能量分組排序
    const groupMap = {};
    let totalPrice = 0;
    deck.forEach(card => {
      let energy = card.details && card.details["必要エナジー"] ? card.details["必要エナジー"].replace(/[^0-9]/g, '') : '無';
      if (energy === '') energy = '0';
      if (!groupMap[energy]) groupMap[energy] = [];
      groupMap[energy].push(card);

      const price = parseFloat((card.money || '0').replace(/[^0-9.]/g, '')) || 0;
      totalPrice += price * card.number;
    });

    const sortedEnergies = Object.keys(groupMap).sort((a, b) => {
      if (a === '0') return -1;
      if (b === '無') return 1;
      return parseInt(a) - parseInt(b);
    });

    let totalCardCount = 0;
    sortedEnergies.forEach(energy => {
      const cardsInGroup = groupMap[energy];
      const groupCount = cardsInGroup.reduce((sum, c) => sum + c.number, 0);

      const groupBlock = document.createElement('div');
      groupBlock.style.marginBottom = '20px';

      const groupTitle = document.createElement('div');
      groupTitle.style.fontWeight = 'bold';
      groupTitle.style.fontSize = '20px';
      groupTitle.style.margin = '10px 0 5px 0';
      groupTitle.textContent = `${energy}能 - ${groupCount}張`;
      groupBlock.appendChild(groupTitle);

      const groupCardsRow = document.createElement('div');
      groupCardsRow.style.display = 'flex';
      groupCardsRow.style.flexWrap = 'wrap';
      groupCardsRow.style.gap = '10px';
      groupCardsRow.style.marginBottom = '10px';

      cardsInGroup.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('deck-card');
        cardElement.innerHTML = `
          <img src="${card.image_url}" alt="${card.card_name}">
          <span class="card-count">${card.number}</span>
          <div class="button-group">
            <button class="add-btn" data-card-number="${card.card_number}" data-card-rare="${card.rare}">+</button>
            <button class="remove-btn" data-card-number="${card.card_number}" data-card-rare="${card.rare}">-</button>
          </div>
        `;
        const addButton = cardElement.querySelector('.add-btn');
        const removeButton = cardElement.querySelector('.remove-btn');
        addButton.addEventListener('click', () => addToDeckFromDeck(card.card_number, card.rare));
        removeButton.addEventListener('click', () => removeOneFromDeck(card.card_number, card.rare));
        styleButton(addButton, 'add');
        styleButton(removeButton, 'remove');
        groupCardsRow.appendChild(cardElement);
      });

      groupBlock.appendChild(groupCardsRow);
      deckContainer.appendChild(groupBlock);
      totalCardCount += groupCount;
    });

    deckCount.textContent = totalCardCount;
    totalPriceElement.textContent = `總價格: ${Math.round(totalPrice)} 日元`;
  } else {
    // 不排序，直接依加入順序顯示
    let totalPrice = 0;
    let totalCardCount = 0;
    deck.forEach(card => {
      const cardElement = document.createElement('div');
      cardElement.classList.add('deck-card');
      cardElement.style.marginBottom = '10px';
      cardElement.innerHTML = `
        <img src="${card.image_url}" alt="${card.card_name}">
        <span class="card-count">${card.number}</span>
        <div class="button-group">
          <button class="add-btn" data-card-number="${card.card_number}" data-card-rare="${card.rare}">+</button>
          <button class="remove-btn" data-card-number="${card.card_number}" data-card-rare="${card.rare}">-</button>
        </div>
      `;
      const addButton = cardElement.querySelector('.add-btn');
      const removeButton = cardElement.querySelector('.remove-btn');
      addButton.addEventListener('click', (event) => {
        event.stopPropagation();
        addToDeckFromDeck(card.card_number, card.rare);
      });     
      removeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        removeOneFromDeck(card.card_number, card.rare);
      });     
      styleButton(addButton, 'add');
      styleButton(removeButton, 'remove');
      deckContainer.appendChild(cardElement);

      const price = parseFloat((card.money || '0').replace(/[^0-9.]/g, '')) || 0;
      totalPrice += price * card.number;
      totalCardCount += card.number;
    });
    deckCount.textContent = totalCardCount;
    totalPriceElement.textContent = `總價格: ${Math.round(totalPrice)} 日元`;
  }
}
// 美化按鈕的輔助函數
function styleButton(button, type) {
  button.style.border = 'none';
  button.style.borderRadius = '50%';
  button.style.width = '40px';
  button.style.height = '40px';
  button.style.fontSize = '20px';
  button.style.cursor = 'pointer';
  button.style.transition = 'all 0.3s ease';
  button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';

  if (type === 'add') {
    button.style.backgroundColor = '#007bff'; // 藍色
    button.style.color = '#fff';
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#0056b3'; // 深藍色
      button.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.2)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = '#007bff'; // 恢復藍色
      button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    });
  } else if (type === 'remove') {
    button.style.backgroundColor = '#dc3545'; // 紅色
    button.style.color = '#fff';
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#c82333'; // 深紅色
      button.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.2)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = '#dc3545'; // 恢復紅色
      button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    });
  }
}

function removeOneFromDeck(cardNumber, cardRare) {
  const normalizedRare = cardRare === null || cardRare === 'null' ? '無資料' : cardRare;

  const cardIndex = deck.findIndex(card => 
    card.card_number === cardNumber && 
    (card.rare || '無資料') === normalizedRare
  );

  if (cardIndex === -1) {
    return; // 提前退出函數
  }

  const cardToRemove = deck[cardIndex];
  if (cardToRemove.number > 1) {
    cardToRemove.number -= 1; // 減少數量
  } else {
    deck.splice(cardIndex, 1); // 如果數量為 0，移除卡片
  }

  // 更新顯示
  updateDeckDisplay();

  const index = cards.findIndex(card => 
    card.card_number === cardNumber && 
    (card.rare || '無資料') === normalizedRare
  );
  if (index !== -1) {
    updateCardCount(index); // 更新卡片數量顯示
  } else {
    console.warn('找不到對應的卡片資料，無法更新卡片數量顯示');
  }

  const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
  fetch('/deck/remove', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ card: cardToRemove }),
  })
    .then(response => response.json())
    .then(data => {
      if (!data.success) {
        alert(`移除失敗：${data.message}`);
      } else {
        deck = data.deck; // 更新本地的 deck 陣列
        updateDeckDisplay();
      }
    })
    .catch(error => {
      console.error('移除卡片時發生錯誤：', error);
      alert('移除卡片時發生錯誤');
    });
}
function updateCardCount(index) {
  const cardCountElement = document.getElementById(`card-count-${index}`);
  if (!cardCountElement) {
    return; // 如果元素不存在，退出函數
  }

  const card = cards[index];
  const deckCard = deck.find(item => item.card_number === card.card_number && item.rare === card.rare);

  const count = deckCard ? deckCard.number : 0; // 使用 number 屬性更新數量
  cardCountElement.textContent = count; // 更新數量

  // 添加動畫類名
  cardCountElement.classList.add('animate');

  // 在動畫結束後移除類名
  cardCountElement.addEventListener('animationend', () => {
    cardCountElement.classList.remove('animate');
  }, { once: true }); // 確保只執行一次
}
function closeCardModal() {
  const modal = document.getElementById('card-modal');
  modal.style.display = 'none';
}

function addToDeckFromDeck(cardNumber, cardRare) {
  const normalizedRare = cardRare === null || cardRare === 'null' ? '無資料' : cardRare;

  const card = cards.find(card => 
    card.card_number === cardNumber && 
    (card.rare || '無資料') === normalizedRare
  );

  if (card) {
    const existingCard = deck.find(item => item.card_number === card.card_number && item.rare === card.rare);
    if (existingCard) {
      existingCard.number += 1; // 增加數量
    } else {
      deck.push({ ...card, rare: card.rare || '無資料', number: 1 }); // 初始化數量為 1
    }
    updateDeckDisplay();

    // 更新卡片數量顯示
    const index = cards.findIndex(c => c.card_number === card.card_number && (c.rare || '無資料') === (card.rare || '無資料'));
    if (index !== -1) {
      updateCardCount(index); // 更新卡片數量顯示
    } else {
      console.warn('找不到對應的卡片資料，無法更新卡片數量顯示');
    }

    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    fetch('/deck/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ card }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          deck = data.deck; // 更新本地的 deck 陣列
          updateDeckDisplay(); // 更新顯示
        } else {
          alert(`新增失敗：${data.message}`);
        }
      })
      .catch(error => {
        console.error('新增卡片時發生錯誤：', error);
        alert('新增卡片時發生錯誤');
      });
  } else {
    console.error('Card not found:', { cardNumber, cardRare });
    alert('找不到對應的卡片');
  }
}



function clearDeck() {
  if (confirm('確定要清空牌組嗎？')) {
    deck = [];
    updateDeckDisplay();
    resetCardCounts(); // 重置卡片數量

    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    fetch('/deck/clear', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken, // 傳遞 CSRF token
      },
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          alert('牌組已清空');
        } else {
          alert(`清空失敗：${data.message}`);
        }
      })
      .catch(error => {
        console.error('清空牌組時發生錯誤：', error);
        alert('清空牌組時發生錯誤');
      });
  }
}
function resetCardCounts() {
  const cardCountIndicators = document.querySelectorAll('.card-count-indicator');
  cardCountIndicators.forEach(indicator => {
    indicator.textContent = '0'; // 將數值重置為 0
  });
}
window.onload = () => {
  const theme = document.body.classList.contains('dark-mode') ? 'dark-mode' : 'light-mode';
  document.body.classList.add(theme);
};