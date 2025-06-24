## 0. 重要

- やり取りは日本語でお願いします。
- 各ステップの終了時には動作確認をお願いします。
- こちら側の作業や指示が必要なときは、勝手な判断をせず必ず確認をしてください

## 1. 🎯 プロジェクトの目的

本プロジェクトは、X（旧 Twitter）上でのマーケティング施策やカスタマーサポート対応を自動化する「X 版 L ステップ」的なツールを構築することを目的とする。
特定のハッシュタグ投稿や運営アカウントへのリプライを検知し、指定のメッセージを含む DM をユーザーへ自動送信する。

管理画面は「Firebase の管理画面」ではなく、クライアントが **Firebase Authentication** にログイン後にアクセスする Web UI を指す。

---

## 2. 👥 想定ユーザー・利用シーン

### 想定ユーザー

- SNS マーケティング担当者（キャンペーン運営）
- サポート窓口を持つ企業
- NFT を配布したい Web3 関連事業者

### 利用シーン

#### 1. ハッシュタグキャンペーン応募者への DM 配信

- 管理画面でハッシュタグを登録（例：「#夏のプレゼント企画」）
- 該当タグを含む投稿を検知し、投稿者へ DM 送信（NFT 取得 URL 付き）

#### 2. 運営ツイートへの質問リプライに対する個別 DM 送信

- 管理画面でツイート URL を登録
- その投稿へのリプライ投稿者に DM を送信（NFT 取得 URL 付き）

※現在は手動実行、将来的にはポーリングまたは Webhook 対応

---

## 3. 🛠️ 使用技術・実行構成

| 区分           | 技術                                       |
| -------------- | ------------------------------------------ |
| フロントエンド | Angular 19 + Tailwind CSS + PrimeNG        |
| バックエンド   | Firebase Cloud Functions（Node.js）        |
| ホスティング   | Firebase Hosting                           |
| データベース   | Cloud Firestore                            |
| 認証           | Firebase Authentication                    |
| スケジューラ   | `pubsub.schedule()`（将来）                |
| 機密管理       | `.env`（X API キー等の機密情報のみ）を使用 |

---

## 4. ⚠️ 実装メモ & 注意点

- 登録済みハッシュタグ／投稿は常時監視対象（都度実行でなく保持＆ポーリング）
- 同一ハッシュタグ・投稿に対しての同一ユーザーへの**DM は 1 回のみ**。Firestore `logs` に送信履歴を保存して再送防止（別のハッシュタグ・投稿に対しては DM 可能）
- **X API** は弊社アプリ経由。クライアントは OAuth 認可を経て DM 送信
- 開発中は Free プラン（POST 月 50 件）でも可。本番運用は Basic プラン以上必須
- **NFT 取得 URL は現時点ではすべてのユーザーに同一の固定 URL**を送信する  
  ※将来的には、ユーザーごとに異なる URL を外部 API で動的生成する設計を前提とする
- 管理画面は Firebase Authentication でログインしたクライアント向け UI
- **SNS アカウントは X の他に、Instagram・Threads・TikTok も連携可能（認可のみ対応）**
  - 現時点でハッシュタグ・投稿と連動する機能対応しているのは X のみ
- **1 ユーザーあたり、各 SNS において複数アカウントの登録が可能**
- Firestore `accounts` コレクションで、`uid` と `sns_type` で SNS アカウントを管理
- **クライアントは自身で登録した SNS アカウントしか操作できない**
- ハッシュタグ・投稿の登録時は、次の順に入力させる：
  1. SNS を選択（X / Instagram / Threads / TikTok）
  2. 選択 SNS の連携済みアカウントを一覧表示
  3. アカウントを選択 → ハッシュタグやツイート ID を登録
- **UI 上には、連携済み SNS のみが選択肢として表示される**
- **X 以外の SNS を選択した場合は、「現在未対応です」とアラートを表示**

---

## 5. 📁 ディレクトリ構成（初期）

```
sivira-step/
├── functions/
│   └── index.ts
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── dashboard/
│       │   └── auth/
│       └── environments/
├── .env
├── .env.sample
├── firebase.json
└── README.md
```

---

## 6. 🔐 X API 認証構成

- 弊社（運営側）が X API Pro プラン or Free プランでアプリ登録し、API キー保持
- クライアントは Firebase Auth ログイン後、自身の X アカウントを OAuth 認可
- Instagram / Threads / TikTok は OAuth 認可のみ対応（DM などの API 連携は未実装）
- 各 SNS のアクセストークンは `accounts` コレクションに保存（`sns_type` 付き）

---

## 7. 📨 DM 送信仕様

- DM 送信対象は現時点で **X（旧 Twitter）アカウントのみ**
- 本文には、NFT 取得 URL（共通固定）を含める
- 選択 SNS が X 以外だった場合は、DM 送信処理は行わず「未対応」アラートを表示
- 同一投稿・ハッシュタグに対しては、一度 DM したユーザに対しては再度同じプログラムが実行サれたとしても DM を送らないように制御

---

## 8. 🗃️ Firestore 構成（想定）

| コレクション | 用途                                                                   |
| ------------ | ---------------------------------------------------------------------- |
| `accounts`   | クライアントが認可した SNS アカウント（X, Instagram, Threads, TikTok） |
| `hashtags`   | SNS アカウント単位で登録されたハッシュタグ                             |
| `posts`      | SNS アカウント単位で登録されたツイート ID                              |
| `logs`       | DM 送信の履歴（再送防止用）                                            |

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

- `docs/ui.md`：管理画面の UI 構成と画面操作の仕様
- `docs/api.md`：API エンドポイントと入出力仕様
- `docs/auth.md`：Firebase ログインおよび SNS 連携の認証フロー
- `docs/firestore.md`：Firestore におけるデータ構造とコレクション設計

---

## 11. 🧠 Chain-of-Thought：タスク分解（再構成版 Step 1–10）

### Step 1: Firestore 構成の定義

- `accounts`, `hashtags`, `posts`, `logs` のコレクションを定義
- 各ドキュメントに `uid`, `sns_type`, `account_id` を含める
- 🔗 参照: `docs/firestore.md`（accounts, hashtags, posts, logs の構造定義）

### Step 2: Firebase Functions のベース作成（初期関数）

- `runHashtagDM()` / `runReplyDM()` のベースコードを作成（取得＋ログ出力）
- 🔗 参照: `docs/api.md`（runHashtagDM, runReplyDM の基本定義）
- 🔗 参照: `docs/firestore.md`（関数がアクセスするデータ構造）

### Step 3: `.env.sample` を作成して環境構築を整える

- Firebase Functions や OAuth 連携用のキーを含む
- 🔗 参照: `docs/auth.md`（OAuth クレデンシャルの .env 管理）

### Step 4: Angular UI の Firebase Auth ログインとダッシュボード画面

- Firebase Auth ログイン → `/dashboard` に遷移
- 🔗 参照: `docs/ui.md`（ログインフォームとダッシュボード UI）
- 🔗 参照: `docs/auth.md`（Firebase Authentication の設定・uid 管理）

### Step 5: SNS アカウントの登録・一覧表示を実装

- 各 SNS の OAuth 連携処理（UI と連携）
- Firestore `accounts` に保存、SNS 別にフィルタ表示
- 🔗 参照: `docs/ui.md`（SNS 接続画面とアカウント一覧表示）
- 🔗 参照: `docs/api.md`（/api/sns/connect, /api/sns/callback/:sns_type）
- 🔗 参照: `docs/auth.md`（OAuth 処理の全体フロー）
- 🔗 参照: `docs/firestore.md`（accounts コレクションの構造）

### Step 6: SNS 選択 → アカウント選択 → ハッシュタグ/投稿の登録 UI

- 連携済み SNS のみ表示、X 以外はアラート表示
- Firestore に保存（`sns_type`, `account_id` 付き）
- **✅ 実装済み**: 登録済みハッシュタグ/投稿の管理機能（一覧表示・編集・削除）
- 🔗 参照: `docs/ui.md`（SNS→ アカウント → 投稿/ハッシュタグ登録の UI）
- 🔗 参照: `docs/api.md`（/api/register/hashtag, /api/register/post, 管理用 API）
- 🔗 参照: `docs/firestore.md`（hashtags, posts 保存構造）

### Step 7: 実行ボタン UI + Firebase 呼び出し連携

- 選択 SNS が X の場合のみ、関数呼び出し可能
- 🔗 参照: `docs/ui.md`（実行ボタンと連携処理）
- 🔗 参照: `docs/api.md`（/api/run/hashtag-dm, /api/run/reply-dm）

### Step 8: DM 送信ロジックの実装（X アカウントのみ）

- 投稿取得 → DM 送信 → logs 記録（X 以外はスキップ）
- 🔗 参照: `docs/api.md`（DM 送信処理の詳細）
- 🔗 参照: `docs/firestore.md`（ログ保存・対象取得構造）
- 🔗 参照: `docs/auth.md`（アクセストークン使用）

### Step 9: DM 本文に NFT URL を挿入する処理

- 固定 URL を定数として DM 本文に組み込む
- 🔗 参照: `docs/api.md`（DM 本文に含める URL 処理）

### Step 10: logs に送信履歴を記録し、再送防止処理を追加

- `uid` + `account_id` + `target_type` でユニーク制御
- 🔗 参照: `docs/firestore.md`（dm_logs の保存形式・再送制御）
