# firestore.md

## 📂 Firestore データ構造

本サービスでは、Firebase Firestore を使用して、ユーザーごとの SNS 連携・配信設定・ログ情報などを保存・管理する。

すべてのデータはログインユーザーの `uid` をルートとして構成される。

```plaintext
/users/{uid}/...
```

---

## 🔑 コレクション一覧（構造）

### 1. users/{uid}/accounts

SNS アカウント接続情報（OAuth トークン・識別情報）

```json
{
  "sns_type": "x", // x | instagram | threads | tiktok
  "account_id": "1234567890",
  "username": "example",
  "access_token": "...",
  "access_token_secret": "...", // X (OAuth 1.0a) の場合
  "created_at": "2025-06-20T12:34:56Z",
  "is_active": true
}
```

---

### 2. users/{uid}/hashtags

ハッシュタグ配信設定（X のみ対応）

```json
{
  "uid": "user123",
  "sns_type": "x", // 現時点では x のみ
  "account_id": "1234567890",
  "hashtag": "#夏のプレゼント",
  "dm_message": "ご参加ありがとうございます！\nNFT取得URL: https://example.com/nft",
  "created_at": "2025-06-20T13:00:00Z",
  "updated_at": "2025-06-21T10:00:00Z", // 編集時のみ
  "is_active": true
}
```

---

### 3. users/{uid}/posts

リプライ監視対象の投稿（X のみ対応）

```json
{
  "uid": "user123",
  "sns_type": "x",
  "account_id": "1234567890",
  "post_id": "987654321",
  "post_url": "https://twitter.com/example/status/987654321",
  "dm_message": "ご質問ありがとうございます！\nNFT取得URL: https://example.com/nft",
  "created_at": "2025-06-20T13:30:00Z",
  "updated_at": "2025-06-21T10:00:00Z", // 編集時のみ
  "is_active": true
}
```

---

### 4. users/{uid}/dm_logs

自動 DM の配信ログ（再送防止用）

```json
{
  "uid": "user123",
  "sns_type": "x",
  "account_id": "1234567890",
  "recipient_user_id": "567890123",
  "dm_type": "hashtag", // "hashtag" | "reply"
  "source_id": "#夏のプレゼント", // ハッシュタグまたは投稿ID
  "sent_at": "2025-06-20T14:00:00Z",
  "status": "success", // "success" | "failed"
  "error_message": null
}
```

---

## 🛡️ アクセス制御

- すべてのコレクションは `users/{uid}/...` の構成にし、Firebase Authentication の `uid` と一致しないユーザーからのアクセスは拒否
- Firestore のセキュリティルールで `request.auth.uid == uid` の条件を厳密に設定する
- 論理削除（`is_active: false`）されたデータは一覧取得APIでは除外される

---

## 📝 フィールド説明

### 共通フィールド
- `uid`: Firebase Authentication のユーザーID
- `created_at`: 作成日時（ISO 8601形式）
- `updated_at`: 更新日時（編集時に自動更新）
- `is_active`: 論理削除フラグ（`false` で削除扱い）

### accounts コレクション
- `sns_type`: SNSの種類（x, instagram, threads, tiktok）
- `account_id`: SNS側のユーザーID
- `username`: SNSのユーザー名（@は含まない）
- `access_token`: OAuth アクセストークン
- `access_token_secret`: OAuth トークンシークレット（X のみ）

### hashtags / posts コレクション
- `dm_message`: DM送信時のメッセージテンプレート（NFT URLを含む）
- `post_url`: 投稿のURL（posts コレクションのみ）

---

## 🔄 今後の拡張予定

- 動的NFT URL生成（現在は固定URL）
- DM送信履歴の詳細表示機能
- 定期実行設定（Firebase Functions の pubsub.schedule 利用）
- Instagram, Threads, TikTok への DM送信対応
- 管理者ユーザーによる集計ビュー（別途集計用コレクションの追加）
