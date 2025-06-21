# 🔐 環境変数設定ガイド

## 📋 概要

このガイドでは、sivira-stepプロジェクトの環境変数設定について説明します。
本プロジェクトでは、フロントエンド用とFirebase Functions用の2つの環境変数ファイルを使用します。

## 📁 ファイル構成

```
sivira-step/
├── .env.sample          # フロントエンド用テンプレート
├── .env                 # フロントエンド用実際の設定 (作成必要)
├── functions/
│   ├── .env.sample      # Firebase Functions用テンプレート  
│   └── .env             # Firebase Functions用実際の設定 (作成必要)
```

## 🚀 セットアップ手順

### Step 1: テンプレートファイルをコピー

```bash
# プロジェクトルートで実行
cp .env.sample .env
cp functions/.env.sample functions/.env
```

### Step 2: Firebase設定を取得・入力

1. **Firebase Console** にアクセス
   - https://console.firebase.google.com/
   - プロジェクト選択 → 設定 → 全般

2. **ウェブアプリの設定**をコピー
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     // ...
   }
   ```

3. **.env** ファイルに設定を記入
   ```env
   FIREBASE_API_KEY=AIza...
   FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   FIREBASE_PROJECT_ID=your-project-id
   # ...
   ```

### Step 3: SNS API キーの設定

#### 🐦 X (Twitter) API - **必須**

1. **X Developer Portal** にアクセス
   - https://developer.x.com/
   - プロジェクト作成 → APIキー取得

2. **重要な注意点:**
   - DM送信機能には **Basic プラン以上** が必要
   - Free プランでは月50回のPOST制限
   - OAuth 2.0 認証を使用

3. **設定項目:**
   ```env
   X_API_KEY=your_api_key
   X_API_SECRET=your_api_secret  
   X_CLIENT_ID=your_client_id
   X_CLIENT_SECRET=your_client_secret
   X_BEARER_TOKEN=your_bearer_token
   ```

#### 📷 Instagram API - **オプション**

1. **Meta for Developers** にアクセス
   - https://developers.facebook.com/
   - アプリ作成 → Instagram Basic Display 追加

2. **現在の対応状況:**
   - OAuth認証のみ対応
   - DM送信は未実装

#### 🧵 Threads API - **オプション**

1. **Meta for Developers** で設定
2. 現在はOAuth認証のみ対応

#### 🎵 TikTok API - **オプション**

1. **TikTok for Developers** にアクセス
   - https://developers.tiktok.com/
2. 現在はOAuth認証のみ対応

### Step 4: その他の設定

#### NFT配布URL
```env
# 全ユーザー共通で送信されるURL
NFT_URL=https://your-nft-site.com/claim
```

#### OAuth コールバックURL
```env
# プロジェクトIDを実際の値に置き換え
X_CALLBACK_URL=https://your-project-id.web.app/api/sns/callback/x
```

## 🔒 セキュリティ注意事項

### ✅ 安全な管理方法

- `.env` ファイルは `.gitignore` に含まれており、Git管理外
- Firebase Functions デプロイ時に自動的に環境変数として設定
- 機密情報のため他者との共有は禁止

### ❌ 避けるべき行為

- `.env` ファイルをGitにコミット
- APIキーをコードに直接記述
- 機密情報をSlackやメールで共有

## 🧪 開発環境での確認

### 環境変数読み込みテスト

```bash
# Firebase Functions ディレクトリで実行
cd functions
npm run build
node lib/env-test.js
```

### 期待される出力
```
✅ SET X_API_KEY: ***HIDDEN***
✅ SET X_API_SECRET: ***HIDDEN***
✅ SET NFT_URL: ***HIDDEN***
```

## 🚨 トラブルシューティング

### よくある問題

1. **環境変数が読み込まれない**
   - ファイル名が `.env` になっているか確認
   - ファイルの場所が正しいか確認

2. **Firebase Functions で環境変数が使えない**
   - `functions/.env` ファイルが存在するか確認
   - Firebase予約済みプレフィックス（`FIREBASE_`）を使っていないか確認

3. **X API が動作しない**
   - APIキーが正しく設定されているか確認
   - Basic プラン以上に契約されているか確認

## 📞 サポート

設定に関して問題がある場合は、以下を確認してください：

1. `.env.sample` ファイルの最新版を使用
2. APIキーが正確にコピーされている
3. 必要なSNS APIプランに契約済み

それでも解決しない場合は、プロジェクト管理者にお問い合わせください。