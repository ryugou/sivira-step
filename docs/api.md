# api.md

## 🎯 目的
本ドキュメントは、SNS自動DM配信サービスにおけるバックエンドAPIの仕様を定義します。Firebase Functions上で稼働するHTTPS Callable / HTTP Trigger APIを前提とし、クライアント側のUIから呼び出される構成です。

---

## 🔐 認証・認可
- Firebase Authentication によりログイン済みのユーザーのみAPI実行可能。
- 各APIでは `context.auth.uid` を元に、対象リソースのアクセス権限を確認。
- SNSアカウントや登録データはすべて `uid` によってスコープされる（他ユーザーの情報にアクセス不可）。

---

## 📌 API一覧

### 🔄 OAuth Callback エンドポイント

#### `GET /api/sns/callback/:sns_type`
- 各SNSのOAuth認可後にSNS側からリダイレクトされるエンドポイント。
- クエリパラメータに含まれる `code` や `oauth_token`/`oauth_verifier` を元にトークンを取得。
- アクセストークンを用いてアカウント情報を取得し、Firestoreの `accounts` コレクションに保存。
- `:sns_type` は `x`, `instagram`, `threads`, `tiktok` のいずれか。

```ts
Request: GET /api/sns/callback/x?oauth_token=...&oauth_verifier=...

Response: {
  success: true,
  account: {
    sns_type: 'x',
    account_id: string,
    account_name: string
  }
}
```


### ✅ アカウント連携・取得

#### `POST /api/sns/connect`
- 各SNSアカウントとのOAuth連携を開始するURLを生成。
- 現時点で X / Instagram / Threads / TikTok すべて認可処理に対応（接続のみ）。
- DM送信などの機能は X のみ対応。

```ts
Body: {
  sns: 'x' | 'instagram' | 'threads' | 'tiktok'
}
Response: {
  url: string  // SNS側OAuth開始URL
}
```

---

#### `GET /api/sns/accounts`
- ログイン中ユーザーに紐づくSNSアカウント一覧を取得。

```ts
Response: Array<{
  sns_type: 'x' | 'instagram' | 'threads' | 'tiktok',
  account_id: string,
  account_name: string,
  connected: boolean
}>
```

---

### ✅ ハッシュタグ・投稿登録

#### `POST /api/register/hashtag`
- 特定のSNSアカウントに対してハッシュタグを登録。

```ts
Body: {
  sns_type: 'x',  // 現時点では 'x' のみ対応
  account_id: string,
  hashtag: string
}
```

---

#### `POST /api/register/post`
- 特定のSNSアカウントに対して対象投稿（投稿ID/URL）を登録。

```ts
Body: {
  sns_type: 'x',
  account_id: string,
  post_id: string
}
```

---

### ▶️ 実行トリガー（UIから手動実行）

- 現在は、管理画面上の「実行」ボタンから明示的に発火する設計。
- 将来的には Firebase Functions の `pubsub.schedule()` による定期ポーリングに置き換える予定。

#### `POST /api/execute/hashtag`
- 登録済みハッシュタグを対象に、Xの投稿を取得 → 投稿者へDM送信。
- DMには固定のNFT取得URLを含める。

```ts
Body: {
  hashtag_id: string
}
```

---

#### `POST /api/execute/reply`
- 登録済み投稿（post_id）に対してリプライを取得 → リプライ投稿者にDM送信。

```ts
Body: {
  post_id: string
}
```

---

## 🗄️ Firestore構造（保存先）

### `accounts/{account_id}`
- SNSアカウントとユーザー（uid）を紐づけて保持
```ts
{
  uid: string,
  sns_type: 'x' | 'instagram' | 'threads' | 'tiktok',
  access_token: string,
  account_name: string
}
```

### `hashtags/{hashtag_id}`
- 監視対象のハッシュタグと紐づくSNSアカウント
```ts
{
  uid: string,
  sns_type: 'x',
  account_id: string,
  hashtag: string,
  created_at: Timestamp
}
```

### `posts/{post_id}`
- 監視対象の投稿（例：Xの投稿ID）と紐づくSNSアカウント
```ts
{
  uid: string,
  sns_type: 'x',
  account_id: string,
  post_id: string,
  created_at: Timestamp
}
```

### `logs/{uid}/{post_id}`
- 送信済みのDMログを記録して再送防止
```ts
{
  recipient_user_id: string,
  sent_at: Timestamp,
  message_type: 'hashtag' | 'reply'
}
```

---

## 💬 DMテンプレート仕様

- 現時点では DM本文およびNFT取得URLの両方ともアプリケーション内にハードコード。
- NFT取得URLは全ユーザー共通の固定値としてコード内で使用される（秘密情報ではないため .env には含めない）。
- 将来的にはユーザーごとの動的NFTリンクを生成するAPIに差し替える。

---

## ❗ エラーパターンと考慮事項

- SNSアカウント未連携：`403` エラー `SNS account not connected`
- 対象アカウントが他ユーザーのもの：`403` エラー `Permission denied`
- ハッシュタグ・投稿の重複登録：`409` エラー `Already registered`
- X以外のSNSを投稿送信に使用：`400` エラー `SNS not supported for messaging`

---

## 🔁 pubsub移行の想定設計

- 現在：UIボタン → HTTPS Callable / Trigger で `runHashtagDM`, `runReplyDM` 実行
- 将来：Firebase Functions の `pubsub.schedule('* * * * *')` を利用し、対象データを一括処理
- 同一処理関数で `manual = true/false` の切替制御を入れておくと汎用化しやすい

---

## 🔐 エラーレスポンス共通形式
```ts
Response: {
  success: false,
  error: {
    code: string,
    message: string
  }
}
```

---

## 📝 今後の予定（備考）
- DM送信対象SNSを段階的に拡張（まずはX → 他SNS）
- 実行処理は現時点ではボタン操作、将来的には `pubsub.schedule()` による定期実行対応
- DM本文に動的NFTリンクを挿入するAPIは未定（現時点では固定URL）

