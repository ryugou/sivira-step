
## 1. 🎯 プロジェクトの目的

本プロジェクトは、X（旧Twitter）上でのマーケティング施策やカスタマーサポート対応を自動化する「X版Lステップ」的なツールを構築することを目的とする。
特定のハッシュタグ投稿や運営アカウントへのリプライを検知し、指定のメッセージを含むDMをユーザーへ自動送信する。

管理画面は「Firebaseの管理画面」ではなく、クライアントが **Firebase Authentication** にログイン後にアクセスするWeb UIを指す。

---

## 2. 👥 想定ユーザー・利用シーン

### 想定ユーザー

- SNSマーケティング担当者（キャンペーン運営）
- サポート窓口を持つ企業
- NFTを配布したいWeb3関連事業者

### 利用シーン

#### 1. ハッシュタグキャンペーン応募者へのDM配信

- 管理画面でハッシュタグを登録（例：「#夏のプレゼント企画」）
- 該当タグを含む投稿を検知し、投稿者へDM送信（NFT取得URL付き）

#### 2. 運営ツイートへの質問リプライに対する個別DM送信

- 管理画面でツイートURLを登録
- その投稿へのリプライ投稿者にDMを送信（NFT取得URL付き）

※現在は手動実行、将来的にはポーリングまたはWebhook対応

---

## 3. 🛠️ 使用技術・実行構成

| 区分      | 技術                                  |
| ------- | ----------------------------------- |
| フロントエンド | Angular 19 + Tailwind CSS + PrimeNG |
| バックエンド  | Firebase Cloud Functions（Node.js）   |
| ホスティング  | Firebase Hosting                    |
| データベース  | Cloud Firestore                     |
| 認証      | Firebase Authentication             |
| スケジューラ  | `pubsub.schedule()`（将来）             |
| 機密管理    | `.env`（X APIキー等の機密情報のみ）を使用          |

---

## 4. ⚠️ 実装メモ & 注意点
- 登録済みハッシュタグ／投稿は常時監視対象（都度実行でなく保持＆ポーリング）
- 同一ハッシュタグ・投稿に対しての同一ユーザーへの**DMは1回のみ**。Firestore `logs` に送信履歴を保存して再送防止（別のハッシュタグ・投稿に対しては DM 可能）
- **X API** は弊社アプリ経由。クライアントはOAuth認可を経てDM送信
- 開発中は Free プラン（POST月50件）でも可。本番運用は Basic プラン以上必須
- **NFT取得URLは現時点ではすべてのユーザーに同一の固定URL**を送信する  
  ※将来的には、ユーザーごとに異なるURLを外部APIで動的生成する設計を前提とする
- 管理画面はFirebase Authenticationでログインしたクライアント向けUI
- **SNSアカウントはXの他に、Instagram・Threads・TikTokも連携可能（認可のみ対応）**
  - 現時点でハッシュタグ・投稿と連動する機能対応しているのはXのみ
- **1ユーザーあたり、各SNSにおいて複数アカウントの登録が可能**
- Firestore `accounts` コレクションで、`uid` と `sns_type` でSNSアカウントを管理
- **クライアントは自身で登録したSNSアカウントしか操作できない**
- ハッシュタグ・投稿の登録時は、次の順に入力させる：
  1. SNSを選択（X / Instagram / Threads / TikTok）
  2. 選択SNSの連携済みアカウントを一覧表示
  3. アカウントを選択 → ハッシュタグやツイートIDを登録
- **UI上には、連携済みSNSのみが選択肢として表示される**
- **X以外のSNSを選択した場合は、「現在未対応です」とアラートを表示**

---

## 5. 📁 ディレクトリ構成（初期）

```
my-xdm-project/
├── functions/                  
│   └── index.ts
├── src/                        
│   ├── app/
│   │   ├── dashboard/          
│   │   └── auth/               
│   └── environments/           
├── .env                        
├── .env.sample                 
├── firebase.json              
└── README.md
```

---

## 6. 🔐 X API認証構成

- 弊社（運営側）が X API Proプラン or Freeプランでアプリ登録し、APIキー保持
- クライアントは Firebase Auth ログイン後、自身のXアカウントを OAuth 認可
- Instagram / Threads / TikTok はOAuth認可のみ対応（DMなどのAPI連携は未実装）
- 各SNSのアクセストークンは `accounts` コレクションに保存（`sns_type` 付き）

---

## 7. 📨 DM送信仕様

- DM送信対象は現時点で **X（旧Twitter）アカウントのみ**
- 本文には、NFT取得URL（共通固定）を含める
- 選択SNSがX以外だった場合は、DM送信処理は行わず「未対応」アラートを表示
-  同一投稿・ハッシュタグに対しては、一度DMしたユーザに対しては再度同じプログラムが実行サれたとしてもDMを送らないように制御

---

## 8. 🗃️ Firestore構成（想定）

| コレクション     | 用途                                                 |
| ---------- | -------------------------------------------------- |
| `accounts` | クライアントが認可したSNSアカウント（X, Instagram, Threads, TikTok） |
| `hashtags` | SNSアカウント単位で登録されたハッシュタグ                             |
| `tweets`   | SNSアカウント単位で登録されたツイートID                             |
| `logs`     | DM送信の履歴（再送防止用）                                     |

---

## 9. 🔐 環境変数 `.env.sample`

```env
X_API_KEY=...
X_API_SECRET=...
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
```

---
## 10. 🔗 仕様分割（docs/ 以下）

このプロジェクトの詳細仕様は以下のファイルに分割されています：

- `docs/ui.md`：管理画面のUI構成と画面操作の仕様
- `docs/api.md`：APIエンドポイントと入出力仕様
- `docs/auth.md`：FirebaseログインおよびSNS連携の認証フロー
- `docs/firestore.md`：Firestoreにおけるデータ構造とコレクション設計

---

## 11. 🧠 Chain-of-Thought：タスク分解（再構成版 Step 1–10）

### ✅ Step 1: Firestore構成の定義

- `accounts`, `hashtags`, `tweets`, `logs` のコレクションを定義
- 各ドキュメントに `uid`, `sns_type`, `account_id` を含める
- 🔗 参照: `docs/firestore.md`（accounts, hashtags, tweets, logs の構造定義）  

### ✅ Step 2: Firebase Functions のベース作成（初期関数）

- `runHashtagDM()` / `runReplyDM()` のベースコードを作成（取得＋ログ出力）
- 🔗 参照: `docs/api.md`（runHashtagDM, runReplyDM の基本定義）  
- 🔗 参照: `docs/firestore.md`（関数がアクセスするデータ構造）  

### ✅ Step 3: `.env.sample` を作成して環境構築を整える

- Firebase Functions や OAuth連携用のキーを含む
- 🔗 参照: `docs/auth.md`（OAuthクレデンシャルの .env 管理）  

### ✅ Step 4: Angular UI のFirebase Authログインとダッシュボード画面

- Firebase Authログイン → `/dashboard` に遷移
- 🔗 参照: `docs/ui.md`（ログインフォームとダッシュボードUI）  
- 🔗 参照: `docs/auth.md`（Firebase Authentication の設定・uid管理）  

### ✅ Step 5: SNSアカウントの登録・一覧表示を実装

- 各SNSのOAuth連携処理（UIと連携）
- Firestore `accounts` に保存、SNS別にフィルタ表示
- 🔗 参照: `docs/ui.md`（SNS接続画面とアカウント一覧表示）  
- 🔗 参照: `docs/api.md`（/api/sns/connect, /api/sns/callback/:sns_type）  
- 🔗 参照: `docs/auth.md`（OAuth処理の全体フロー）  
- 🔗 参照: `docs/firestore.md`（accounts コレクションの構造）  

### ✅ Step 6: SNS選択 → アカウント選択 → ハッシュタグ/投稿の登録UI

- 連携済みSNSのみ表示、X以外はアラート表示
- Firestoreに保存（`sns_type`, `account_id` 付き）
- 🔗 参照: `docs/ui.md`（SNS→アカウント→投稿/ハッシュタグ登録のUI）  
- 🔗 参照: `docs/api.md`（/api/register/hashtag, /api/register/tweet）  
- 🔗 参照: `docs/firestore.md`（hashtags, tweets 保存構造）  

### ✅ Step 7: 実行ボタン UI + Firebase 呼び出し連携

- 選択SNSがXの場合のみ、関数呼び出し可能
- 🔗 参照: `docs/ui.md`（実行ボタンと連携処理）  
- 🔗 参照: `docs/api.md`（/api/run/hashtag-dm, /api/run/reply-dm）  

### ✅ Step 8: DM送信ロジックの実装（Xアカウントのみ）

- 投稿取得 → DM送信 → logs記録（X以外はスキップ）
- 🔗 参照: `docs/api.md`（DM送信処理の詳細）  
- 🔗 参照: `docs/firestore.md`（ログ保存・対象取得構造）  
- 🔗 参照: `docs/auth.md`（アクセストークン使用）  

### ✅ Step 9: DM本文にNFT URLを挿入する処理

- 固定URLを定数としてDM本文に組み込む
- 🔗 参照: `docs/api.md`（DM本文に含めるURL処理） 

### ✅ Step 10: logsに送信履歴を記録し、再送防止処理を追加

- `uid` + `account_id` + `target_type` でユニーク制御
- 🔗 参照: `docs/firestore.md`（dm_logs の保存形式・再送制御）  

