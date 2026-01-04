document.addEventListener('DOMContentLoaded', () => {

  const boxOverlay = document.querySelector('.store-box-overlay');
  const packLayer = document.getElementById('store-pack-layer');
  const storePhoto = document.querySelector('.store-photo');
  const tearAudio = new Audio('/sounds/tear.mp4');
  tearAudio.preload = 'auto';
  const shuffleAudio = new Audio('/sounds/shuffle.wav');
  shuffleAudio.preload = 'auto';
  const flipAudio = new Audio('/sounds/flip.wav');
  flipAudio.preload = 'auto';
  const fireworkAudio = new Audio('/sounds/firework.mp3');
  fireworkAudio.preload = 'auto';

  if (!boxOverlay || !packLayer) {
    return;
  }

  // 建立遮罩層
  const mask = document.createElement('div');
  mask.className = 'pack-overlay-mask';
  document.body.appendChild(mask);

  // 建立關閉按鈕
  const closeBtn = document.createElement('button');
  closeBtn.className = 'pack-close-btn';
  closeBtn.innerHTML = '✕';
  document.body.appendChild(closeBtn);

  // 建立配率/進度面板
  const createStatusPanel = () => {
    const panel = document.createElement('div');
    panel.className = 'pack-status';
    document.body.appendChild(panel);
    return panel;
  };

  const statusPanel = createStatusPanel();

  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const shuffleArray = (arr) => {
    const cloned = [...arr];
    for (let i = cloned.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
    }
    return cloned;
  };

  const sampleWithoutReplacement = (pool, count, excludeSet = new Set()) => {
    const filtered = pool.filter((card) => !excludeSet.has(card.card_number));
    const shuffled = shuffleArray(filtered);
    if (shuffled.length >= count) {
      return shuffled.slice(0, count);
    }
    const result = [...shuffled];
    while (result.length < count && pool.length > 0) {
      result.push(pickRandom(pool));
    }
    return result.slice(0, count);
  };

  let currentPack = null;
  let allCards = []; // 存储从页面获取的卡片数据
  let lastRevealCards = null;
  let lastRevealMeta = null;
  let revealDisplayed = false;
  const originalPhotoSrc = storePhoto?.getAttribute('src');

  const triggerCelebrateBg = () => {
    if (!storePhoto) return;
    storePhoto.src = '/images/celebrate.png';
  };

  // 从页面中获取系列名称和卡片数据
  const seriesName = document.querySelector('meta[name="series-name"]')?.getAttribute('content');
  const encodedSeries = seriesName ? encodeURIComponent(seriesName.trim()) : '';
  const packImageSrc = encodedSeries
    ? `/images/booster/tg-pack-${encodedSeries}.png`
    : '/images/booster/tg-pack.png';
  const boxImageSrc = encodedSeries
    ? `/images/booster/tg-box-${encodedSeries}.png`
    : '/images/booster/tg-box.png';
  const cardDataElement = document.getElementById('card-data');
  
  if (cardDataElement) {
    try {
      allCards = JSON.parse(cardDataElement.textContent);
    } catch (error) {
      console.error('解析卡片数据失败:', error);
    }
  }

  const isSR = (rare) => /^SR/.test(rare || '');
  const isR = (rare) => /^R/.test(rare || '') && !isSR(rare || '');
  const isStar = (rare) => (rare || '').includes('★');
  const isSrStar = (rare) => isSR(rare) && isStar(rare);
  const isFoilEligible = (rare) => isSR(rare) || isR(rare) || isStar(rare);
  const displayName = (card) => card?.trcard_name || card?.card_name || '';

  let boxNumber = 1;
  let boxCountFromStart = 0; // 从游戏开始累计开盒数
  let srStarCountInCycle = 0; // 当前12盒周期内 SR★ 的出现次数
  let totalPrice = 0; // 累积卡片价格（日元）

  const createBoxPlan = () => {
    const srTarget = Math.random() < 0.5 ? 4 : 5; // 每盒4～5張SR
    const srSlots = new Set(shuffleArray([...Array(16).keys()]).slice(0, srTarget));
    return {
      boxNumber,
      packIndex: 0,
      srTarget,
      srSlots,
      srUsed: 0,
      starUsed: false
    };
  };

  let boxPlan = createBoxPlan();

  const updateStatusPanel = (tipText = '') => {
    if (!statusPanel) return;
    const packDisplay = Math.min(boxPlan.packIndex === 0 ? 1 : boxPlan.packIndex, 16);
    const starText = boxPlan.starUsed ? '已出' : '未出';
    const priceText = totalPrice.toLocaleString('ja-JP');
    statusPanel.innerHTML = `
      <div class="pack-rate-line">配率：1盒16包｜每包8張｜每包1張閃卡（R 或 SR）｜每盒4～5張SR且1張星卡</div>
      <div class="pack-progress">進度：第${boxPlan.boxNumber}盒 第${packDisplay}/16包 ｜ 本盒SR ${boxPlan.srUsed}/${boxPlan.srTarget} ｜ 星卡：${starText}</div>
      <div class="pack-total-price">累積價格：${priceText} 円</div>
      ${tipText ? `<div class="pack-tip">${tipText}</div>` : ''}
    `;
  };

  const createCardsContainer = () => {
    const container = document.createElement('div');
    container.id = 'cards-container';
    container.className = 'cards-container';
    document.body.appendChild(container);
    return container;
  };

  const displayCards = (cards, meta) => {
    const cardsContainer = document.getElementById('cards-container') || createCardsContainer();
    const packBlock = document.createElement('div');
    packBlock.className = 'cards-pack';

    // 计算包内总价格
    let packPrice = 0;
    cards.forEach((card) => {
      if (card.money) {
        const priceStr = card.money.replace(/,/g, '').replace('円', '').trim();
        const price = parseInt(priceStr, 10);
        if (!isNaN(price)) {
          packPrice += price;
        }
      }
    });

    const header = document.createElement('div');
    header.className = 'cards-header';
    const priceDisplay = packPrice > 0 ? ` - ${packPrice.toLocaleString('ja-JP')} 円` : '';
    header.textContent = meta
      ? `第${meta.box}盒 第${meta.pack}包${priceDisplay}`
      : '開包結果';
    header.style.cursor = 'pointer';
    packBlock.appendChild(header);
    
    if (!cards || cards.length === 0) {
      const empty = document.createElement('p');
      empty.style.color = '#fff';
      empty.style.padding = '20px';
      empty.textContent = '沒有找到卡片';
      packBlock.appendChild(empty);
      cardsContainer.appendChild(packBlock);
      return;
    }
    
    const grid = document.createElement('div');
    grid.className = 'cards-pack-grid';
    grid.style.display = 'none';
    
    const lastCard = cards[cards.length - 1];
    const previewGrid = document.createElement('div');
    previewGrid.className = 'cards-pack-grid cards-pack-preview';
    
    if (lastCard) {
      const cardEl = document.createElement('div');
      cardEl.className = `card-item${lastCard.isFoil ? ' foil' : ''}`;
      const priceText = lastCard.money ? ` - ${lastCard.money}` : '';
      cardEl.innerHTML = `
        <img src="${lastCard.image_url}" alt="${displayName(lastCard)}" onerror="this.style.backgroundColor='#333';" />
        <div class="card-info">
          <p class="card-name">${displayName(lastCard)}</p>
          <p class="card-number">${lastCard.card_number}</p>
          <p class="card-rare">稀有度: ${lastCard.rare}${lastCard.isFoil ? ' ｜ 閃卡' : ''}${priceText}</p>
        </div>
      `;
      if (lastCard.isFoil) {
        const badge = document.createElement('span');
        badge.className = 'foil-badge';
        badge.textContent = 'FOIL';
        cardEl.appendChild(badge);
      }
      previewGrid.appendChild(cardEl);
    }
    
    cards.forEach((card) => {
      const cardEl = document.createElement('div');
      cardEl.className = `card-item${card.isFoil ? ' foil' : ''}`;
      const priceText = card.money ? ` - ${card.money}` : '';
      cardEl.innerHTML = `
        <img src="${card.image_url}" alt="${displayName(card)}" onerror="this.style.backgroundColor='#333';" />
        <div class="card-info">
          <p class="card-name">${displayName(card)}</p>
          <p class="card-number">${card.card_number}</p>
          <p class="card-rare">稀有度: ${card.rare}${card.isFoil ? ' ｜ 閃卡' : ''}${priceText}</p>
        </div>
      `;
      if (card.isFoil) {
        const badge = document.createElement('span');
        badge.className = 'foil-badge';
        badge.textContent = 'FOIL';
        cardEl.appendChild(badge);
      }
      grid.appendChild(cardEl);
    });

    let isExpanded = false;
    header.addEventListener('click', () => {
      isExpanded = !isExpanded;
      if (isExpanded) {
        previewGrid.style.display = 'none';
        grid.style.display = 'grid';
        header.classList.add('expanded');
      } else {
        grid.style.display = 'none';
        previewGrid.style.display = 'grid';
        header.classList.remove('expanded');
      }
    });

    packBlock.appendChild(previewGrid);
    packBlock.appendChild(grid);
    cardsContainer.appendChild(packBlock);
  };

  const recordRevealResult = () => {
    if (!revealDisplayed && lastRevealCards) {
      displayCards(lastRevealCards, lastRevealMeta);
      revealDisplayed = true;
    }
  };

  // 逐張滑開展示
  const ensureRevealLayer = () => {
    let layer = document.getElementById('pack-reveal-layer');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = 'pack-reveal-layer';
    layer.className = 'pack-reveal-layer';
    const stack = document.createElement('div');
    stack.className = 'pack-card-stack';
    stack.id = 'pack-card-stack';
    const tip = document.createElement('div');
    tip.className = 'pack-reveal-tip';
    tip.textContent = '';
    layer.appendChild(stack);
    layer.appendChild(tip);
    document.body.appendChild(layer);
    return layer;
  };

  const showPackStack = (cards, meta) => {
    const layer = ensureRevealLayer();
    const oldStack = layer.querySelector('#pack-card-stack');
    const stack = oldStack.cloneNode(false);
    stack.id = 'pack-card-stack';
    oldStack.parentNode.replaceChild(stack, oldStack);

    const setPeekOffsetFor = (cardEl, px, py) => {
      if (!cardEl) return;
      const cap = 16;
      const clamp = (v) => Math.max(Math.min(v, cap), -cap);
      cardEl.style.setProperty('--peek-x', `${clamp(px)}px`);
      cardEl.style.setProperty('--peek-y', `${clamp(py)}px`);
    };

    const spawnFireworks = () => {
      const host = document.body;
      if (!host) return;
      if (fireworkAudio) {
        fireworkAudio.currentTime = 0;
        fireworkAudio.play().catch(() => {});
      }
      const wrap = document.createElement('div');
      wrap.className = 'fireworks-wrap';
      const mkBurst = () => {
        const b = document.createElement('span');
        b.className = 'firework-burst';
        const lx = 35 + Math.random() * 30; // vw
        const ly = 10 + Math.random() * 20; // vh higher (aim closer to top)
        b.style.setProperty('--fx', `${lx}vw`);
        b.style.setProperty('--fy', `${ly}vh`);
        b.style.setProperty('--fscale', `${0.8 + Math.random() * 0.5}`);
        b.style.setProperty('--delay', `${Math.random() * 0.2}s`);
        return b;
      };
      wrap.appendChild(mkBurst());
      wrap.appendChild(mkBurst());
      host.appendChild(wrap);
      setTimeout(() => wrap.remove(), 2200);
    };

    const spawnConfetti = () => {
      const host = document.body;
      if (!host) return;
      const rain = document.createElement('div');
      rain.className = 'confetti-rain';
      const total = 24;
      for (let i = 0; i < total; i += 1) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece';
        const rx = Math.random() * 100; // vw
        const delay = Math.random() * 0.6;
        const duration = 1.5 + Math.random() * 0.8;
        piece.style.setProperty('--rx', `${rx}vw`);
        piece.style.setProperty('--delay', `${delay}s`);
        piece.style.setProperty('--duration', `${duration}s`);
        rain.appendChild(piece);
      }
      host.appendChild(rain);
      setTimeout(() => rain.remove(), 2400);
    };

    const pulseFoil = (cardEl) => {
      if (!cardEl || !cardEl.classList.contains('foil-rare')) return;
      cardEl.classList.add('foil-flash');
      spawnFireworks();
      setTimeout(() => {
        spawnConfetti();
      }, 900);
      setTimeout(() => {
        cardEl.classList.remove('foil-flash');
      }, 1200);
    };

    // 入場動畫：卡堆從卡包位置飛到中央
    stack.classList.add('stack-from-pack');
    stack.addEventListener('animationend', () => stack.classList.remove('stack-from-pack'), { once: true });

    // 播放卡堆出場音效
    if (shuffleAudio) {
      shuffleAudio.currentTime = 0;
      shuffleAudio.play().catch(() => {});
    }

    const order = [...cards];
    let index = 0;
    let isFinished = false;

    const finishReveal = () => {
      if (isFinished) return;
      isFinished = true;
      layer.classList.remove('active');
      setTimeout(() => {
        stack.innerHTML = '';
        // 显示抽卡结果（若未记录）
        recordRevealResult();
        // 自动关闭卡包遮罩
        closePack();
      }, 200);
    };

    const renderCard = (card, depth) => {
      const el = document.createElement('div');
      el.className = 'reveal-card';
      el.style.setProperty('--depth', depth);
      // 確保上層卡片在視覺上覆蓋下層
      el.style.zIndex = `${order.length - depth}`;
      const priceText = card.money ? ` ｜ ${card.money}` : '';
      const isFoilHit = !!card.isFoil && (isSR(card.rare) || isStar(card.rare));
      el.innerHTML = `
        <div class="card-front">
          <img src="${card.image_url}" alt="${displayName(card)}" onerror="this.style.backgroundColor='#333';" />
          <div class="card-front-info">
            <div class="card-front-name">${displayName(card)}</div>
            <div class="card-front-rare">${card.rare}${card.isFoil ? ' ｜ 閃卡' : ''}${priceText}</div>
          </div>
        </div>
      `;
      if (card.isFoil) {
        el.classList.add('foil');
      }
      if (isFoilHit) {
        el.classList.add('foil-rare');
      }
      return el;
    };

    const triggerIfStarActive = () => {
      const currentCard = order[index];
      if (currentCard && isStar(currentCard.rare)) {
        triggerCelebrateBg();
      }
    };

    order.forEach((card, i) => {
      const node = renderCard(card, i);
      node.classList.add('revealed'); // 直接顯示正面
      if (i === 0) {
        node.classList.add('active');
      }
      stack.appendChild(node);
    });

    // 初始預設略往右上露一點邊（只針對當前活躍卡）
    const activeCard = stack.children[index];
    setPeekOffsetFor(activeCard, 12, -4);
    pulseFoil(activeCard);

    // 如果第一張就是星卡，進場時直接觸發慶祝
    triggerIfStarActive();

    let startX = 0;
    let startY = 0;
    let lastDragX = -120; // 預設往左
    let lastDragY = 0;
    let isDragging = false;
    let hasMoved = false;
    const threshold = 120; // 提高距離閾值，滑更遠才翻下一張
    let hasRevealed = false; // 防止重复翻开

    const revealNext = () => {
      if (isFinished || index >= order.length || hasRevealed) {
        return;
      }
      hasRevealed = true;
      if (flipAudio) {
        flipAudio.currentTime = 0;
        flipAudio.play().catch(() => {});
      }
      const current = stack.children[index];
      if (current) {
        const mag = Math.hypot(lastDragX, lastDragY) || 1;
        const normX = lastDragX / mag;
        const normY = lastDragY / mag;
        const swipeDistance = 200;
        current.style.setProperty('--swipe-x', `${normX * swipeDistance}px`);
        current.style.setProperty('--swipe-y', `${normY * swipeDistance}px`);
      }
      if (current) current.classList.add('swiped-away');
      index += 1;
      const next = stack.children[index];
      if (next) {
        next.classList.add('active');
        setPeekOffsetFor(next, 12, -4);
        pulseFoil(next);
      }
      triggerIfStarActive();
      if (index >= order.length) {
        setTimeout(finishReveal, 320);
      }
    };

    const onDown = (e) => {
      if (e.cancelable) e.preventDefault(); // avoid page scroll on touch start
      isDragging = true;
      hasRevealed = false;
      hasMoved = false;
      startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
      const current = stack.children[index];
      if (current) current.classList.add('dragging');
    };

    const onMove = (e) => {
      if (!isDragging || hasRevealed) return;
      if (e.cancelable) e.preventDefault(); // keep swipe from scrolling page
      const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0]?.clientX;
      const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0]?.clientY;
      if (clientX === undefined || clientY === undefined) return;
      const dragX = clientX - startX;
      const dragY = clientY - startY;
      const dragDistance = Math.hypot(dragX, dragY);
      lastDragX = dragX;
      lastDragY = dragY;
      const current = stack.children[index];
      setPeekOffsetFor(current, dragX * 0.08, dragY * 0.08);

      if (current) {
        const factor = 0.0001; // 減少移動幅度
        const maxShift = 0.0001;  // 限制最大偏移
        const shiftX = Math.max(Math.min(dragX * factor, maxShift), -maxShift);
        const shiftY = Math.max(Math.min(dragY * factor, maxShift), -maxShift);
        current.style.transform = `translateX(${shiftX}px) translateY(${shiftY}px) scale(1) rotateX(0deg)`;
      }
      hasMoved = hasMoved || dragDistance > 2;

      // 實時檢測是否達到閾值，類似撕卡包邏輯
      if (hasMoved && dragDistance >= threshold) {
        revealNext();
      }
    };

    const onUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      const current = stack.children[index];
      if (current) current.classList.remove('dragging');
      // 如果還未翻開（沒達到閾值），回彈
      if (!hasRevealed && current) {
        current.style.transition = 'transform 0.3s ease-out';
        current.style.transform = '';
      }
    };

    stack.addEventListener('mousedown', onDown);
    stack.addEventListener('touchstart', onDown, { passive: false });
    stack.addEventListener('mousemove', onMove);
    stack.addEventListener('touchmove', onMove, { passive: false });
    stack.addEventListener('mouseup', onUp);
    stack.addEventListener('touchend', onUp);

    // 點擊背景也可收起（在全部翻完後）
    layer.onclick = (e) => {
      if (index >= order.length && e.target === layer) {
        finishReveal();
      }
    };

    layer.classList.add('active');
  };

  const startNewBox = () => {
    boxNumber += 1;
    boxCountFromStart += 1;
    
    // 每12盒周期重置
    if (boxCountFromStart % 12 === 0) {
      srStarCountInCycle = 0;
    }
    
    boxPlan = createBoxPlan();
    boxPlan.boxNumber = boxNumber;
    updateStatusPanel('新盒開始');
  };

  const drawPack = () => {
    if (allCards.length === 0) {
      console.error('沒有可用的卡片數據');
      return;
    }

    if (!boxPlan || boxPlan.packIndex >= 16) {
      startNewBox();
    }

    // 排除AP卡（卡號包含AP的卡片不會出現在一般卡包中）
    const packableCards = allCards.filter((c) => !c.card_number.includes('AP'));
    
    const srPool = packableCards.filter((c) => isSR(c.rare));
    const rPool = packableCards.filter((c) => isR(c.rare));
    const fillerPool = packableCards.filter((c) => !isFoilEligible(c.rare));
    const starSrPool = srPool.filter((c) => isStar(c.rare));
    const starRPool = rPool.filter((c) => isStar(c.rare));
    const starOtherPool = packableCards.filter(
      (c) => isStar(c.rare) && !isSR(c.rare) && !isR(c.rare)
    );
    const srStarPool = srPool.filter((c) => isSrStar(c.rare)); // SR★/SR★★/SR★★★
    const anyStarPool = [...starSrPool, ...starRPool, ...starOtherPool];
    
    // 如果星卡已出过，从池子中排除星卡
    const nonStarSrPool = boxPlan.starUsed ? srPool.filter((c) => !isStar(c.rare)) : srPool;
    const nonStarRPool = boxPlan.starUsed ? rPool.filter((c) => !isStar(c.rare)) : rPool;

    const packIndex = boxPlan.packIndex;
    const isSrPack = boxPlan.srSlots.has(packIndex);
    boxPlan.packIndex += 1;
    if (isSrPack) boxPlan.srUsed += 1;

    let foilCard = null;
    const remainingPacks = 16 - packIndex;
    const mustUseStar = !boxPlan.starUsed && remainingPacks <= 1;
    
    // 判断是否是必中 SR★ 的最后一包
    const isLastPackOfBox = remainingPacks === 1;
    const remainingBoxesInCycle = 12 - (boxCountFromStart % 12);
    const mustUseSrStar = isLastPackOfBox && srStarCountInCycle === 0 && remainingBoxesInCycle === 1 && srStarPool.length > 0;

    if (mustUseSrStar) {
      // 强制出现 SR★
      foilCard = pickRandom(srStarPool);
      srStarCountInCycle += 1;
    } else if (isSrPack) {
      const mustUseStarSr =
        !boxPlan.starUsed && boxPlan.srUsed >= boxPlan.srTarget && anyStarPool.length > 0;
      if (mustUseStarSr) {
        foilCard = pickRandom(anyStarPool);
      } else if (nonStarSrPool.length > 0) {
        foilCard = pickRandom(nonStarSrPool);
      }
    } else {
      if (mustUseStar && anyStarPool.length > 0) {
        foilCard = pickRandom(anyStarPool);
      } else if (nonStarRPool.length > 0) {
        foilCard = pickRandom(nonStarRPool);
      }
    }

    if (!foilCard) {
      if (rPool.length > 0) {
        foilCard = pickRandom(rPool);
      } else if (srPool.length > 0) {
        foilCard = pickRandom(srPool);
      } else {
        foilCard = pickRandom(allCards);
      }
    }

    if (isStar(foilCard.rare)) {
      boxPlan.starUsed = true;
      triggerCelebrateBg();
    }

    // 追踪 SR★
    if (isSrStar(foilCard.rare)) {
      srStarCountInCycle += 1;
      // SR★ 也算入 SR 張數（即使這包原本不是 SR 槽位）
      if (!isSrPack) {
        boxPlan.srUsed += 1;
      }
    }

    const exclude = new Set([foilCard.card_number]);
    const fillerSource = fillerPool.length >= 7 ? fillerPool : allCards;
    const filler = sampleWithoutReplacement(fillerSource, 7, exclude);
    const packCards = [...filler, { ...foilCard, isFoil: true }]; // 閃卡放最後

    const meta = {
      box: boxPlan.boxNumber,
      pack: boxPlan.packIndex,
      srUsed: boxPlan.srUsed,
      srTarget: boxPlan.srTarget,
      starUsed: boxPlan.starUsed
    };

    // 累积价格
    packCards.forEach((card) => {
      if (card.money) {
        // 解析价格：移除逗号和「円」，然后转换为数字
        const priceStr = card.money.replace(/,/g, '').replace('円', '').trim();
        const price = parseInt(priceStr, 10);
        if (!isNaN(price)) {
          totalPrice += price;
        }
      }
    });

    // 卡包退場動畫
    if (currentPack) {
      currentPack.classList.add('pack-exit');
      currentPack.addEventListener('animationend', () => {
        if (currentPack) {
          currentPack.remove();
          currentPack = null;
        }
      }, { once: true });
    }

    showPackStack(packCards, meta);
    lastRevealCards = packCards;
    lastRevealMeta = meta;
    revealDisplayed = false;
  };

  updateStatusPanel();

  const closePack = () => {
    if (currentPack) {
      currentPack.remove();
      currentPack = null;
    }
    recordRevealResult();
    updateStatusPanel();
    const revealLayer = document.getElementById('pack-reveal-layer');
    if (revealLayer) {
      revealLayer.classList.remove('active');
      const revealStack = revealLayer.querySelector('#pack-card-stack');
      if (revealStack) {
        revealStack.innerHTML = '';
      }
    }
    mask.classList.remove('active');
    closeBtn.classList.remove('active');
  };

  // 依系列切換卡盒背景；沒對應圖就落回預設圖
  if (boxOverlay) {
    boxOverlay.src = boxImageSrc;
    boxOverlay.onerror = () => {
      boxOverlay.onerror = null;
      boxOverlay.src = '/images/booster/tg-box.png';
    };
  }

  const spawnPack = () => {
    if (currentPack) {
      closePack();
    }

    // 新開一包時恢復原店面背景
    if (storePhoto && originalPhotoSrc) {
      storePhoto.src = originalPhotoSrc;
    }

    const pack = document.createElement('div');
    pack.className = 'store-pack';
    
    // 創建上半部
    const topImg = document.createElement('img');
    topImg.src = packImageSrc;
    topImg.alt = '卡包上半部';
    topImg.className = 'pack-top';
    topImg.draggable = false;
    
    // 創建下半部
    const bottomImg = document.createElement('img');
    bottomImg.src = packImageSrc;
    bottomImg.alt = '卡包下半部';
    bottomImg.className = 'pack-bottom';
    bottomImg.draggable = false;
    
    pack.appendChild(topImg);
    pack.appendChild(bottomImg);
    
    // 创建提示线
    const hintLine = document.createElement('div');
    hintLine.className = 'tear-hint-line';
    hintLine.style.width = '80%';
    hintLine.style.left = '10%';
    hintLine.style.top = '20%';
    hintLine.style.display = 'none';
    hintLine.style.position = 'absolute';
    hintLine.style.zIndex = '15';
    pack.appendChild(hintLine);
    
    // 阻止事件冒泡
    pack.addEventListener('click', (e) => e.stopPropagation());
    
    packLayer.appendChild(pack);
    currentPack = pack;

    mask.classList.add('active');
    closeBtn.classList.add('active');

    // 撕开动画完成后，抽牌
    topImg.addEventListener('animationend', () => {
      topImg.remove();
      drawPack();
    }, { once: true });

    // 卡包出現後立即顯示提示線
    hintLine.style.display = 'block';

    // 添加拖拽撕開效果
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let isTorn = false;

    const onDragStart = (e) => {
      if (isTorn) return;
      isDragging = true;
      startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      topImg.classList.add('tearing');
      hintLine.style.display = 'block';
    };

    const onDragMove = (e) => {
      if (!isDragging || isTorn) return;
      e.preventDefault();
      
      const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      currentX = clientX - startX;
      
      const absX = Math.abs(currentX);
      const rotation = Math.min(absX / 8, 15) * (currentX > 0 ? 1 : -1);
      const opacity = Math.max(1 - absX / 200, 0.3);
      topImg.style.transform = `translateX(${currentX}px) rotateY(${rotation}deg)`;
      topImg.style.opacity = opacity;
      
      // 实时检测是否达到撕开阈值
      if (absX >= 40) {
        triggerTear();
      }
    };

    const triggerTear = () => {
      if (isTorn) return;
      isTorn = true;
      isDragging = false;
      
      const direction = currentX > 0 ? 1 : -1;
      const finalX = direction * 200;
      const finalRotate = direction * 30;

      // 播放撕開音效（mp4 也可僅作音檔使用）
      if (tearAudio) {
        tearAudio.currentTime = 0;
        tearAudio.play().catch(() => {});
      }
      
      // 立即移除所有事件监听器
      topImg.removeEventListener('mousedown', onDragStart);
      topImg.removeEventListener('touchstart', onDragStart);
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('touchmove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
      document.removeEventListener('touchend', onDragEnd);
      
      topImg.style.pointerEvents = 'none';
      topImg.style.cursor = 'default';
      hintLine.style.display = 'none';
      topImg.classList.remove('tearing');
      
      // 立即设置动画CSS变量并添加动画类
      topImg.style.setProperty('--final-x', `${finalX}px`);
      topImg.style.setProperty('--final-rotate', `${finalRotate}deg`);
      topImg.classList.add('torn');
      
      // 动画完成后移除上半部
      topImg.addEventListener('animationend', () => {
        topImg.remove();
      }, { once: true });
    };

    const onDragEnd = () => {
      if (!isDragging || isTorn) return;
      isDragging = false;
      topImg.classList.remove('tearing');
      hintLine.style.display = 'none';
      
      const absX = Math.abs(currentX);
      if (absX < 25) {
        // 未达到阈值，弹回原位
        topImg.style.transform = '';
        topImg.style.opacity = '';
      }
      currentX = 0;
    };

    topImg.addEventListener('mousedown', onDragStart);
    topImg.addEventListener('touchstart', onDragStart, { passive: false });
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchend', onDragEnd);
  };

  boxOverlay.addEventListener('click', spawnPack);
  
  boxOverlay.addEventListener('touchend', (e) => {
    e.preventDefault();
    spawnPack();
  });

  closeBtn.addEventListener('click', closePack);
  mask.addEventListener('click', closePack);
});