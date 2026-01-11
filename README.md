# UNION ARENA 卡牌牌組管理系統（Backend Focus）

## 專案快速導覽（TL;DR）

- **專案類型**：全端 Web 應用（以後端為核心）
- **主要技術**：Node.js / Express / MongoDB / EJS
- **部署環境**：Render（雲端部署，使用環境變數管理機密資訊）
- **我的角色**：獨立完成後端 API、資料庫設計、前端互動與部署
- **解決的問題**：  
  整合卡片價格與效果資料，解決使用者需跨多平台查詢與組牌的不便

---

## 🧩 專案背景與問題解決

### 遇到的問題
- UNION ARENA 卡片資訊分散在多個平台
- 無線上組牌工具，需手動記錄卡片與價格
- 缺乏可分享、可討論的牌組平台

### 解決方式
- 建立 RESTful API 提供卡片與牌組資料
- 使用 MongoDB 文件型資料結構，支援卡片欄位差異
- 設計匿名使用者機制（Cookie + UUID），免登入即可使用
- 提供雲端部署版本，實際對外服務使用者

---

## 🛠️ 技術架構

### Backend
- Node.js 18+
- Express 5
- MongoDB Atlas + Mongoose
- RESTful API 設計
- async / await + try/catch 統一錯誤處理
- HTTP 狀態碼（200 / 400 / 404 / 500）回傳規範化

### Frontend（輔助）
- EJS 模板引擎
- 原生 JavaScript（無框架）
- Cookie 管理使用者狀態

---

## 🔌 API 設計（重點）

### 卡片資料
| Method | Endpoint | 說明 |
|------|---------|------|
| GET | `/series` | 取得所有卡片系列 |
| GET | `/cards/:series` | 取得指定系列卡片 |

### 牌組管理
| Method | Endpoint | 說明 |
|------|---------|------|
| POST | `/deck/add` | 新增卡片至牌組 |
| POST | `/deck/remove` | 移除卡片 |
| POST | `/deck/save` | 儲存牌組並產生分享連結 |
| GET | `/deck/current` | 取得目前使用者牌組 |

---

## 💾 資料庫設計（MongoDB）

### 為何使用 MongoDB
- 卡片資料欄位差異大（部分卡片有特殊效果）
- 文件型結構可避免為少數卡片頻繁修改 schema
- 適合目前低併發、快速迭代的專案型系統

### 資料一致性策略
- 統一欄位格式由應用層控制
- 牌組採用 Last Write Wins
- 已規劃未來可加入版本控制或鎖定機制

---

## 🔒 安全與穩定性設計
- CSRF 防護（csurf）
- API Rate Limit（防止濫用）
- XSS 基本防護（輸入轉義）
- 環境變數管理（GitHub 不存放任何金鑰，MongoDB 連線資訊由 Render 管理）

---

## ⚡ 系統設計與效能考量
- 圖片 Lazy Loading（Intersection Observer）
- MongoDB 查詢加索引（deckName / owner）
- 自動清理 30 天未活動牌組（背景排程）
- 非同步處理避免阻塞主流程

---

## 🚀 部署說明
- **部署平台**：Render
- **環境變數**：
  - `MONGO_URI`
  - `PORT`
- GitHub 公開原始碼，實際金鑰不入版控

---

## 📌 專案特色
- 真實對外服務專案（非 Demo）
- 從 0 設計 API、資料庫與系統流程

---

## 📈 未來優化方向
- 使用者登入（JWT / OAuth）
- 版本控制避免資料覆蓋
- CI/CD 自動部署流程
- API 文件化（Swagger）

---

## 👨‍💻 作者
- 獨立開發者  
- 本專案作為 **後端工程師求職作品集**
