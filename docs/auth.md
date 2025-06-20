## 🔐 Firebase Authentication（ログイン）

本サービスでは、**Firebase Authentication** を使用してクライアントユーザーのログイン認証を行う。

- ログイン方式：メールアドレス＆パスワード認証（Googleログイン等は未使用）
- 認証後、ユーザーには一意の `uid` が付与され、全データ操作はこの `uid` をスコープとする

```plaintext
例: /users/{uid}/accounts, /users/{uid}/hashtags など
```

## 🔗 SNSアカウントのOAuth連携（X, Instagram, Threads, TikTok）

各SNSとの接続は、以下のステップでOAuth認証を行う。

### ✅ サポート対象

- X（旧Twitter）
- Instagram 
- Threads 
- TikTok 

---

## 🧭 OAuth 認可フロー（全SNS共通）
1. クライアントはログイン後、管理画面上からSNS連携を開始（対象SNSと「アカウント追加」ボタン）
2. フロントから POST /api/sns/connect を呼び出し、SNSごとの認可URLを取得
3. 取得したURLにリダイレクト（OAuth画面へ）
4. SNS側の認可が完了すると、SNSごとのコールバックURL（例：/api/sns/callback/x, /api/sns/callback/instagram）にリダイレクト
5. コールバック処理でアクセストークン／アカウント情報を保存（Firebase Firestore）

---

## 🧾 Firestore 保存形式（案）

```json
// コレクション: users/{uid}/accounts
{
  "sns_type": "x", // "x" | "instagram" | "threads" | "tiktok"
  "account_id": "123456789",
  "screen_name": "@example",
  "access_token": "...", // 必要に応じて更新
  "refresh_token": "...",
  "connected_at": "2025-06-20T12:34:56Z"
}
```

---

## 🔐 セキュリティ・補足事項

- Firebase Authentication によりログイン状態を常時チェック（未認証状態ではAPI呼び出し不可）
- 各SNSのOAuthクレデンシャル（APIキー等）は Firebase Functions 側で `.env` 管理
- Firestore へのアクセスルールは `uid` によるスコープ制限を厳密に実装

---

## 🧪 今後の対応（予定）

- X以外のSNSへのDM送信機能の解放（APIポリシーに応じて）
- SNSごとのアクセストークン自動更新（refresh\_token による）
- 接続解除機能（アカウントごと）
- 接続済みアカウントの再認証機能

