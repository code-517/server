const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config(); // 載入環境變數
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const csrf = require('csurf');
const { v4: uuidv4 } = require('uuid'); // 使用 UUID 庫生成唯一 ID

// 初始化 MongoDB Atlas 連接

const uri = process.env.MONGO_URI; // 從環境變數中獲取連接字串
if (!process.env.MONGO_URI) {
  console.error('❌ 環境變數 MONGO_URI 未設置，請檢查 .env 文件');
  process.exit(1); // 終止應用程式
}
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ 成功連接 MongoDB Atlas!"))
  .catch(err => console.error("❌ 無法連接 MongoDB Atlas:", err));

// 定義資料模型
const cardSchema = new mongoose.Schema({
  series: String,
  card_name: String,
  trcard_name: String,
  card_number: String,
  rare: String,
  details: Object,
  money: String,
  image_url: String,
});
const Card = mongoose.model('Card', cardSchema);

const deckSchema = new mongoose.Schema({
  deckName: String,
  deckIdea: String,
  cards: [
    {
      card_number: String,
      rare: String,
      number: Number,
      image_url: String,
      card_name: String,
      series: String,
      details: Object,
      money: String,
    },
  ],
  owner: String, // 匿名用戶 ID
  createdAt: { type: Date, default: Date.now },
  lastAccessed: { type: Date, default: Date.now }, // 新增最後訪問時間
});
const Deck = mongoose.model('Deck', deckSchema);

const commentSchema = new mongoose.Schema({
  deckName: String,
  anonymousId: String,
  comment: String,
  timestamp: { type: Date, default: Date.now },
});
const Comment = mongoose.model('Comment', commentSchema);

// 中間件設置
app.use(express.json()); // 用於解析 JSON 主體
app.use(cookieParser());
app.use(express.urlencoded({ extended: true })); // 支持解析 URL 編碼的請求主體
app.use(helmet());
app.use(csrf({ cookie: true }));
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// 設定 EJS 模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
/////////////
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 分鐘
  max: 80, // 每個 IP 最多 100 次請求
  message: { success: false, message: '請求過於頻繁，請稍後再試！' }, // 返回 JSON 格式的錯誤訊息
});
app.use(globalLimiter);

////////////
app.use(express.json({ limit: '1mb' })); // 限制 JSON 請求大小為 1MB
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // 限制 URL 編碼請求大小為 1MB
///////////
app.use(csrf({ cookie: true }));

// 在模板中傳遞 CSRF token
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// 設定資料夾路徑
const cardDirectory = path.join(__dirname, 'card');
const deskDirectory = path.join(__dirname, 'decks');


// 中間件：為每個用戶分配匿名 ID
app.use((req, res, next) => {
  if (!req.cookies.anonymousId) {
    const anonymousId = uuidv4(); // 生成唯一 ID
    res.cookie('anonymousId', anonymousId, { maxAge: 30 * 24 * 60 * 60 * 1000 }); // 存儲在 Cookie 中，有效期 30 天
  }
  next();
});

// 確保 decks 資料夾存在
if (!fs.existsSync(deskDirectory)) {
  fs.mkdirSync(deskDirectory);
}
const commentsDirectory = path.join(__dirname, 'comments');

// 確保 comments 資料夾存在
if (!fs.existsSync(commentsDirectory)) {
  fs.mkdirSync(commentsDirectory);
}
// 合併卡片的函數
async function mergeDeck(deck) {
  const mergedDeck = [];
  const cardMap = {};

  deck.forEach(card => {
    const uniqueKey = `${card.card_number}-${card.rare}`;
    if (cardMap[uniqueKey]) {
      cardMap[uniqueKey].number += 1;
    } else {
      cardMap[uniqueKey] = { ...card, number: 1 };
    }
  });

  for (const key in cardMap) {
    mergedDeck.push(cardMap[key]);
  }
  await Deck.updateOne({ owner: anonymousId }, { cards: mergedDeck });

  return mergedDeck;
}
async function generateUniqueDeckName() {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  let name = '';

  do {
    name = '';
    // 隨機生成兩個字母
    for (let i = 0; i < 2; i++) {
      name += letters[Math.floor(Math.random() * letters.length)];
    }

    // 隨機生成兩個數字
    for (let i = 0; i < 2; i++) {
      name += numbers[Math.floor(Math.random() * numbers.length)];
    }
  } while (await Deck.exists({ deckName: name })); // 如果名稱已存在於 MongoDB，重新生成

  return name;
}
async function queryDeck(deckName) {
  try {
    const deck = await Deck.findOne({ deckName }).lean();
    if (deck) {
      console.log('查詢到的牌組:', deck);
    } else {
      console.error('找不到指定的牌組');
    }
  } catch (error) {
    console.error('查詢牌組時發生錯誤:', error);
  }
}
// 首頁路由
app.get('/', (req, res) => {
  res.redirect('/series'); // 直接跳轉到選擇系列的頁面
});
const PRIZES = ["今天晚餐錢我出", "50元購物金+寶寶抱抱", "30元飲料金+寶寶親親"];

// Ichiban Kuji 抽獎頁面
app.get('/bobo', (req, res) => {
  let remaining = req.query.remaining
    ? req.query.remaining.split(",")
    : [...PRIZES];
  const shuffled = remaining.sort(() => Math.random() - 0.5);
  res.render("index", { shuffled, remaining: shuffled });
});


app.get('/use', (req, res) => {
  res.render('use', {
    useImages: ['/images/use/1.jpg', '/images/use/2.jpg',"/images/use/3.jpg","/images/use/4.jpg","/images/use/5.jpg"],
  });
});
// 新增 /series API，返回卡片系列檔案名稱列表

app.get('/series', async (req, res) => {
  try {
    if (!mongoose.connection.readyState || !mongoose.connection.db) {
      return res.status(503).send('資料庫尚未連線完成，請稍後再試');
    }
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections
      .map(col => col.name)
      .filter(name => name !== 'comments' && name !== 'decks');

    // 直接用系列名稱組合封面圖路徑
    const seriesData = collectionNames.map(name => ({
      name,
      image: `/images/series/${name}.png`, // 或 .png
    }));
    res.render('series', {
      seriesData,
      noticeSliderImages: [
        '/images/slider/notice1.jpg',
        '/images/slider/notice2.jpg',
        '/images/slider/notice3.jpg'
      ],
      noticeSliderLinks: [
        "https://server-r0qo.onrender.com/use",
        'https://server-r0qo.onrender.com/cards/%E7%A5%9E%E6%A8%82%E9%89%A2',
        'https://server-r0qo.onrender.com/cards/%E6%9D%B1%E4%BA%AC%E5%96%B0%E7%A8%AE'
      ]
    });
  } catch (err) {
    console.error('查詢系列時發生錯誤:', err);
    res.status(500).send('伺服器錯誤');
  }
});

// 卡片詳細資料頁面
app.get('/cards/:series', async (req, res) => {
  const { series } = req.params;
  const anonymousId = req.cookies.anonymousId;

  try {
    // 找出用戶的臨時牌組
    const userDeck = await Deck.findOne({ owner: anonymousId, deckName: { $exists: false } });
    if (userDeck && userDeck.cards.length > 0) {
      // 取得臨時牌組所有卡片的系列（去重）
      const deckSeriesSet = new Set(userDeck.cards.map(card => card.series));
      // 如果臨時牌組裡的系列不是只有一種，或不是這次要進入的系列，就清空
      if (deckSeriesSet.size !== 1 || !deckSeriesSet.has(series)) {
        await Deck.deleteOne({ owner: anonymousId, deckName: { $exists: false } });
      }
    }
  } catch (err) {
    console.error('切換系列時檢查/刪除臨時牌組失敗:', err);
  }
  try {

    // 動態選擇集合
    const DynamicCard = mongoose.connection.db.collection(series);
    const cards = await DynamicCard.find({}).toArray(); // 查詢該集合中的所有卡片

    // 處理卡片資料
    const cardsWithIndex = cards.map((card, index) => {
      if (card.details) {
        if (card.details["tr効果"]) {
          card.details["tr効果"] = card.details["tr効果"].replace(/\n/g, '<br>');
        }
        if (card.details["trトリガー"]) {
          card.details["trトリガー"] = card.details["trトリガー"].replace(/\n/g, '<br>');
        }
      }
      return { ...card, index }; // 注意：`toObject()` 不適用於直接從集合查詢的資料
    });

    res.render('card-details', { fileName: series, cards: cardsWithIndex });
  } catch (err) {
    console.error('查詢卡片時發生錯誤:', err);
    res.status(500).send('伺服器錯誤');
  }
});

// 模擬牌組資料
const userDecks = {}; // 用戶牌組存儲


// 新增卡片到牌組
app.post('/deck/add', async (req, res) => {
  const { cards, card } = req.body; // 接收多張卡片或單張卡片
  const anonymousId = req.cookies.anonymousId;

  if ((!cards || !Array.isArray(cards)) && !card) {
    return res.status(400).json({ success: false, message: '卡片資料無效' });
  }

  try {
    let userDeck = await Deck.findOne({ owner: anonymousId, deckName: { $exists: false } });

    if (!userDeck) {
      userDeck = new Deck({ owner: anonymousId, cards: [] });
    }

    // 處理多張卡片或單張卡片
    const cardsToAdd = Array.isArray(cards) ? cards : card ? [card] : [];

    cardsToAdd.forEach(cardItem => {
      const existingCard = userDeck.cards.find(c => c.card_number === cardItem.card_number && c.rare === cardItem.rare);
      if (existingCard) {
        existingCard.number += cardItem.number || 1; // 如果已存在，增加數量
      } else {
        userDeck.cards.push({
          card_number: cardItem.card_number,
          rare: cardItem.rare,
          image_url: cardItem.image_url || '/images/default-card.png',
          card_name: cardItem.card_name || '無名稱',
          series: cardItem.series || '未知系列',
          details: cardItem.details || {},
          money: cardItem.money || '0 円',
          number: cardItem.number || 1,
        });
      }
    });

    await userDeck.save();
    res.json({ success: true, message: '卡片已新增到牌組', deck: userDeck.cards });
  } catch (err) {
    console.error('新增卡片到牌組時發生錯誤:', err);
    res.status(500).json({ success: false, message: '新增卡片失敗' });
  }
});
// 從牌組移除卡片
app.post('/deck/remove', async (req, res) => {
  const { card } = req.body;
  const anonymousId = req.cookies.anonymousId;

  if (!card || !card.card_number) {
    return res.status(400).json({ success: false, message: '卡片資料無效' });
  }

  try {
    const userDeck = await Deck.findOne({ owner: anonymousId, deckName: { $exists: false } });

    if (!userDeck) {
      return res.status(404).json({ success: false, message: '找不到用戶的牌組' });
    }

    let cardIndex;

    // 特殊處理卡片種類為「アクションポイント」或「行動卡」
    if (card.details && (card.details['カード種類'] === 'アクションポイント' || card.details['カード種類'] === '行動卡')) {
      cardIndex = userDeck.cards.findIndex(c => 
        c.card_number === card.card_number // 僅匹配卡號
      );
    } else {
      // 一般卡片移除邏輯
      cardIndex = userDeck.cards.findIndex(c => 
        c.card_number === card.card_number && 
        (c.rare === card.rare || !c.rare || !card.rare) // 放寬稀有度匹配條件
      );
    }

    if (cardIndex !== -1) {
      userDeck.cards[cardIndex].number -= 1;
      if (userDeck.cards[cardIndex].number <= 0) {
        userDeck.cards.splice(cardIndex, 1);
      }
      await userDeck.save();
      res.json({ success: true, message: '卡片已從牌組移除', deck: userDeck.cards });
    } else {
      res.status(404).json({ success: false, message: '找不到要移除的卡片' });
    }
  } catch (err) {
    console.error('移除卡片時發生錯誤:', err);
    res.status(500).json({ success: false, message: '移除卡片失敗' });
  }
});
// 儲存牌組到 JSON 檔案
app.post('/deck/save', async (req, res) => {
  const anonymousId = req.cookies.anonymousId;

  try {
    const userDeck = await Deck.findOne({ owner: anonymousId, deckName: { $exists: false } }); // 只找臨時牌組

    if (!userDeck || userDeck.cards.length === 0) {
      return res.status(400).json({ success: false, message: '牌組為空，無法保存' });
    }

    let { deckName, deckIdea } = req.body;

    // 如果名稱為空或已存在於資料庫，生成新的名稱
    while (!deckName || await Deck.exists({ deckName })) {
      deckName = await generateUniqueDeckName(); // 生成隨機名稱
    }

    const newDeck = new Deck({
      deckName,
      deckIdea,
      cards: userDeck.cards,
      owner: anonymousId,
    });
    await newDeck.save();

    // 只刪除臨時牌組（沒有 deckName 的）
    await Deck.deleteOne({ owner: anonymousId, deckName: { $exists: false } });

    res.json({ success: true, message: `牌組已儲存，名稱為 ${deckName}`, deckName });
  } catch (err) {
    console.error('儲存牌組時發生錯誤:', err);
    res.status(500).json({ success: false, message: '儲存牌組時發生錯誤' });
  }
});

app.get('/decks', async (req, res) => {
  const { series, name } = req.query;

  try {
    let query = { deckName: { $exists: true, $ne: "" } }; // 只查有 deckName 的
    if (series) {
      query['cards.series'] = { $regex: series, $options: 'i' };
    }
    if (name) {
      query.deckName = { $regex: name, $options: 'i' };
    }

    const decks = await Deck.find(query).lean();
    // ...existing code...

    // 提取所有系列名稱
    const seriesList = [...new Set(decks.flatMap(deck => deck.cards.map(card => card.series)))];

    // 加載留言數量和最新留言時間
    const decksWithComments = await Promise.all(
      decks.map(async (deck) => {
        const comments = await Comment.find({ deckName: deck.deckName }).sort({ timestamp: -1 });
        const commentCount = comments.length;
        const latestCommentTime = commentCount > 0 ? comments[0].timestamp : null;

        // 從 deck.cards 中隨機選取一張卡片作為封面圖片
        const randomCard = deck.cards.length > 0
          ? deck.cards[Math.floor(Math.random() * deck.cards.length)]
          : null;

        return {
          ...deck,
          coverImage: randomCard?.image_url || '/images/default-cover.jpg', // 提供預設圖片
          commentCount,
          latestCommentTime,
        };
      })
    );

    res.render('decks', { decks: decksWithComments, seriesList });
  } catch (err) {
    console.error('查詢牌組時發生錯誤:', err);
    res.status(500).send('伺服器錯誤');
  }
});
// 獲取指定牌組的詳細內容
const lastAccessTimes = {}; // 用於記錄每個牌組的最後訪問時間

app.get('/decks/:deckName', async (req, res) => {
  const { deckName } = req.params;

  try {
    const deck = await Deck.findOne({ deckName });
    if (!deck) {
      return res.status(404).send('找不到指定的卡組');
    }

    // 更新最後訪問時間
    deck.lastAccessed = new Date();
    await deck.save();

    const totalPrice = deck.cards.reduce((sum, card) => {
      const price = card.money ? parseFloat(card.money.replace(/[^0-9.]/g, '')) || 0 : 0;
      return sum + price * (card.number || 1);
    }, 0);

    const comments = await Comment.find({ deckName }).sort({ timestamp: -1 });

    res.render('deck-details', {
      deck: deck.cards,
      totalPrice,
      deckName: deck.deckName,
      deckIdea: deck.deckIdea || '無',
      comments, // 傳遞留言數據
      commentCount: comments.length, // 傳遞留言數量
      csrfToken: req.csrfToken(), // 傳遞 CSRF token
    });
  } catch (err) {
    console.error('查詢牌組詳細資料時發生錯誤:', err);
    res.status(500).send('伺服器錯誤');
  }
});
app.post('/deck/clear', async (req, res) => {
  const anonymousId = req.cookies.anonymousId;

  try {
    // 只刪除臨時牌組
    const result = await Deck.deleteOne({ owner: anonymousId, deckName: { $exists: false } });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: '找不到用戶的臨時牌組' });
    }
    res.json({ success: true, message: '臨時牌組已清空' });
  } catch (err) {
    console.error('清空用戶牌組時發生錯誤:', err);
    res.status(500).json({ success: false, message: '清空牌組失敗' });
  }
});
setInterval(async () => {
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 1 個月前的時間

  try {
    // 找出 1 個月內沒有被訪問且沒有新的留言的牌組
    const deletedDecks = await Deck.deleteMany({
      lastAccessed: { $lt: oneMonthAgo }, // 最後訪問時間超過 1 個月
      deckName: { $exists: true, $ne: "" }, // 確保是有名稱的牌組
      $nor: [
        { deckName: { $in: await Comment.find({ timestamp: { $gte: oneMonthAgo } }).distinct('deckName') } }, // 1 個月內有留言的牌組
      ],
    });
    console.log(`刪除了 ${deletedDecks.deletedCount} 個過期的牌組`);
  } catch (err) {
    console.error('清理過期資料時發生錯誤:', err);
  }
}, 24 * 60 * 60 * 1000); // 每天執行一次 // 每天執行一次 // 每 1 分鐘檢查一次
// 分享牌組
app.post('/share-deck', async (req, res) => {
  const { deckName, cards } = req.body;
  const anonymousId = req.cookies.anonymousId;

  if (!deckName || !cards || cards.length === 0) {
    return res.status(400).json({ success: false, message: '牌組名稱或卡片內容無效' });
  }

  try {
    const newDeck = new Deck({
      deckName,
      cards,
      owner: anonymousId,
    });
    await newDeck.save();
    res.json({ success: true, message: '牌組已成功分享！' });
  } catch (err) {
    console.error('分享牌組時發生錯誤:', err);
    res.status(500).json({ success: false, message: '分享牌組失敗' });
  }
});
// 獲取所有分享的牌組
app.get('/shared-decks', async (req, res) => {
  try {
    const decks = await Deck.find().lean(); // 查詢所有分享的牌組
    const sharedDecks = decks.map(deck => ({
      name: deck.deckName,
      owner: deck.owner,
      path: `/shared-decks/${deck._id}`, // 使用 MongoDB 的 `_id` 作為唯一標識
    }));

    res.render('shared-decks', { decks: sharedDecks });
  } catch (err) {
    console.error('查詢分享牌組時發生錯誤:', err);
    res.status(500).send('伺服器錯誤');
  }
});
// 設置留言頻率限制
const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 每分鐘
  max: 5, // 每分鐘最多 5 次請求
  message: { success: false, message: '留言過於頻繁，請稍後再試！' },
});
// 防止 XSS 的轉義函數
const escapeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

app.post('/shared-decks/:deckName/comment', commentLimiter, async (req, res) => {
  const { deckName } = req.params;
  let { comment } = req.body;
  const anonymousId = req.cookies.anonymousId;

  if (!comment || comment.trim().length === 0) {
    return res.status(400).json({ success: false, message: '留言內容不能為空！' });
  }

  // 對留言內容進行轉義（防止 XSS）
  comment = escapeHtml(comment);

  try {
    // 檢查該牌組的留言數量是否已達上限
    const existingComments = await Comment.find({ deckName });
    if (existingComments.length >= 20) {
      return res.status(400).json({ success: false, message: '留言數量已達上限！' });
    }

    // 儲存新留言到 MongoDB
    const newComment = new Comment({
      deckName,
      anonymousId,
      comment,
    });
    await newComment.save();

    // 返回最新留言數量和完整留言列表
    const updatedComments = await Comment.find({ deckName }).sort({ timestamp: -1 });
    res.json({
      success: true,
      message: '留言已成功發表！',
      commentCount: updatedComments.length,
      comments: updatedComments,
    });
  } catch (err) {
    console.error('發表留言時發生錯誤:', err);
    res.status(500).json({ success: false, message: '發表留言失敗！' });
  }
});
app.get('/deck/current', async (req, res) => {
  const anonymousId = req.cookies.anonymousId;

  try {
    // 只找臨時牌組
    const userDeck = await Deck.findOne({ owner: anonymousId, deckName: { $exists: false } }).lean();
    if (!userDeck) {
      return res.json({ success: true, deck: [] }); // 沒有臨時牌組就回傳空
    }

    // 確保返回的每張卡片資料完整
    const completeDeck = userDeck.cards.map(card => ({
      card_number: card.card_number,
      rare: card.rare,
      image_url: card.image_url || '/images/default-card.png', // 提供預設圖片
      card_name: card.card_name || '無名稱', // 提供預設名稱
      series: card.series || '未知系列',
      details: card.details || {}, // 提供預設空物件
      money: card.money || '0 円', // 提供預設價格
      number: card.number || 1,
    }));

    res.json({ success: true, deck: completeDeck });
  } catch (err) {
    console.error('查詢用戶牌組時發生錯誤:', err);
    res.status(500).json({ success: false, message: '查詢用戶牌組失敗' });
  }
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器正在運行，訪問 http://localhost:${PORT}`);
});