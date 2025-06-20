# firestore.md

## 📂 Firestore データ構造

本サービスでは、Firebase Firestore を使用して、ユーザーごとのSNS連携・配信設定・ログ情報などを保存・管理する。

すべてのデータはログインユーザーの `uid` をルートとして構成される。

```plaintext
/users/{uid}/...
```

---

## 🔑 コレクション一覧（構造）

### 1. users/{uid}/accounts
SNSアカウント接続情報（OAuthトークン・識別情報）
```json
{
  "sns_type": "x",  // x | instagram | threads | tiktok
  "account_id": "1234567890",
  "screen_name": "@example",
  "access_token": "...",
  "refresh_token": "...",
  "connected_at": "2025-06-20T12:34:56Z"
}
```

---

### 2. users/{uid}/hashtags
ハッシュタグ配信設定（X のみ対応）
```json
{
  "sns_type": "x", // 現時点では x のみ
  "account_id": "1234567890",
  "hashtag": "#夏のプレゼント",
  "created_at": "2025-06-20T13:00:00Z",
  "enabled": true
}
```

---

### 3. users/{uid}/tweets
リプライ監視対象の投稿ID（X のみ対応）
```json
{
  "sns_type": "x",
  "account_id": "1234567890",
  "tweet_id": "987654321",
  "created_at": "2025-06-20T13:30:00Z",
  "enabled": true
}
```

---

### 4. users/{uid}/dm_logs
自動DMの配信ログ
```json
{
  "sns_type": "x",
  "account_id": "1234567890",
  "recipient_user_id": "567890123",
  "dm_type": "hashtag" | "reply",
  "source_id": "#夏のプレゼント" | "987654321",
  "sent_at": "2025-06-20T14:00:00Z",
  "status": "success" | "failed",
  "error_message": null
}
```

---

## 🛡️ アクセス制御

- すべてのコレクションは `users/{uid}/...` の構成にし、Firebase Authentication の `uid` と一致しないユーザーからのアクセスは拒否
- Firestore のセキュリティルールで `request.auth.uid == uid` の条件を厳密に設定する

---

## 🔄 今後の拡張予定

- DMテンプレートのカスタマイズ機能（users/{uid}/dm_templates）
- 投稿毎の返信パターン設定（users/{uid}/reply_templates）
- 管理者ユーザーによる集計ビュー（別途集計用コレクションの追加）

