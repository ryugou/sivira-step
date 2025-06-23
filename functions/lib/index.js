"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugAuthHttp =
  exports.disconnectSNSHttp =
  exports.debugEnvHttp =
  exports.runReplyDM =
  exports.runHashtagDM =
  exports.getConnectedAccounts =
  exports.getConnectedAccountsHttp =
  exports.handleSNSCallback =
  exports.connectSNS =
  exports.connectSNSHttp =
    void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const oauth_1 = require("oauth");
const crypto = require("crypto");
admin.initializeApp();
const db = admin.firestore();
// OAuth用の一時データ保存をFirestoreで管理（Firebase Functions v2対応）
// const pendingAuths = new Map<string, any>(); // メモリマップは削除
// Twitter OAuth設定 (Firebase Functions v2 compatible)
const createTwitterOAuth = () => {
  // Firebase Functions v2では process.env のみ使用
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const callbackUrl =
    process.env.X_CALLBACK_URL ||
    "https://us-central1-sivira-step.cloudfunctions.net/handleSNSCallback/x";
  console.log(
    `[createTwitterOAuth] API Key length: ${
      apiKey === null || apiKey === void 0 ? void 0 : apiKey.length
    }, Secret length: ${
      apiSecret === null || apiSecret === void 0 ? void 0 : apiSecret.length
    }`
  );
  console.log(`[createTwitterOAuth] Callback URL: ${callbackUrl}`);
  console.log(`[createTwitterOAuth] Using process.env for credentials`);
  if (!apiKey || !apiSecret) {
    throw new Error(
      "Twitter API credentials are missing from environment variables"
    );
  }
  return new oauth_1.OAuth(
    "https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    apiKey,
    apiSecret,
    "1.0A",
    callbackUrl,
    "HMAC-SHA1"
  );
};
// SNS連携API (HTTP関数版)
exports.connectSNSHttp = functions.https.onRequest(async (req, res) => {
  // CORS設定
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(200).send();
    return;
  }
  console.log("[connectSNSHttp] HTTP request received");
  try {
    // Authorization headerから手動でトークンを取得
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[connectSNSHttp] No valid authorization header found");
      res.status(401).json({
        error: "No valid authorization header found",
        received_header: authHeader,
      });
      return;
    }
    const idToken = authHeader.substring(7);
    console.log("[connectSNSHttp] Found Bearer token, length:", idToken.length);
    // Firebase Admin SDKでトークンを検証
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log(
      "[connectSNSHttp] Token verification successful:",
      decodedToken.uid
    );
    const uid = decodedToken.uid;
    const { sns_type } = req.body || {};
    if (
      !sns_type ||
      !["x", "instagram", "threads", "tiktok"].includes(sns_type)
    ) {
      res.status(400).json({
        error: "Invalid sns_type",
        received: sns_type,
      });
      return;
    }
    console.log(
      `[connectSNSHttp] User ${uid} attempting to connect ${sns_type}`
    );
    // 各SNSのOAuth URL生成
    let authUrl = "";
    let isDMSupported = sns_type === "x";
    switch (sns_type) {
      case "x": {
        try {
          console.log(`[connectSNSHttp] Creating Twitter OAuth instance...`);
          const oauth = createTwitterOAuth();
          const result = await new Promise((resolve, reject) => {
            console.log(`[connectSNSHttp] Requesting OAuth token...`);
            oauth.getOAuthRequestToken(
              async (error, oauthToken, oauthTokenSecret, results) => {
                if (error) {
                  console.error("[connectSNSHttp] Twitter OAuth error:", error);
                  console.error(
                    "[connectSNSHttp] Error details:",
                    JSON.stringify(error)
                  );
                  reject(error);
                  return;
                }
                console.log(
                  `[connectSNSHttp] OAuth token received: ${oauthToken}`
                );
                try {
                  // 一時的にOAuthデータをFirestoreに保存
                  const stateId = crypto.randomBytes(32).toString("hex");
                  const oauthData = {
                    uid,
                    sns_type: "x",
                    oauthToken,
                    oauthTokenSecret,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    expiresAt: admin.firestore.FieldValue.serverTimestamp(), // 10分後に期限切れ
                  };
                  // Firestoreの一時コレクションに保存
                  await db.collection("oauth_temp").doc(stateId).set(oauthData);
                  // oauth_tokenでも検索できるようにインデックス用ドキュメントも作成
                  await db
                    .collection("oauth_temp")
                    .doc(`token_${oauthToken}`)
                    .set(
                      Object.assign(Object.assign({}, oauthData), {
                        stateId: stateId,
                      })
                    );
                  authUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=${oauthToken}&state=${stateId}`;
                  console.log(
                    `[connectSNSHttp] Generated Twitter auth URL: ${authUrl}`
                  );
                  resolve({
                    authUrl: authUrl,
                    stateId: stateId,
                  });
                } catch (firestoreError) {
                  console.error(
                    "[connectSNSHttp] Firestore save error:",
                    firestoreError
                  );
                  reject(new Error("Failed to save OAuth state"));
                }
              }
            );
          });
          res.json({
            success: true,
            authUrl: result.authUrl,
            sns_type: sns_type,
            dmSupported: isDMSupported,
            message: `${sns_type}の認証を開始します`,
          });
          return;
        } catch (err) {
          console.error("[connectSNSHttp] Error creating OAuth instance:", err);
          res.status(500).json({
            error: "OAuth setup failed",
            details: err instanceof Error ? err.message : String(err),
          });
          return;
        }
      }
      case "instagram":
        authUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${process.env.INSTAGRAM_CALLBACK_URL}&scope=user_profile,user_media&response_type=code`;
        break;
      case "threads":
        authUrl = `https://threads.net/oauth/authorize?client_id=${process.env.THREADS_CLIENT_ID}&redirect_uri=${process.env.THREADS_CALLBACK_URL}&scope=threads_basic&response_type=code`;
        break;
      case "tiktok":
        authUrl = `https://www.tiktok.com/auth/authorize/?client_key=${process.env.TIKTOK_CLIENT_ID}&redirect_uri=${process.env.TIKTOK_CALLBACK_URL}&response_type=code&scope=user.info.basic`;
        break;
    }
    if (sns_type !== "x") {
      console.log(
        `[connectSNSHttp] Generated auth URL for ${sns_type}: ${authUrl}`
      );
    }
    res.json({
      success: true,
      authUrl: authUrl,
      sns_type: sns_type,
      dmSupported: isDMSupported,
      message: isDMSupported
        ? `${sns_type}の認証を開始します`
        : `${sns_type}の接続を開始します（DM送信機能は現在未対応）`,
    });
  } catch (error) {
    console.error("[connectSNSHttp] Error:", error);
    if (error instanceof Error && error.message.includes("auth/")) {
      res.status(401).json({
        error: "Authentication failed",
        details: error.message,
      });
    } else {
      res.status(500).json({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
});
// SNS連携API (callable関数版 - 互換性のため残す)
exports.connectSNS = functions.https.onCall(async (data, context) => {
  const authenticatedUser = await authenticateUser(context);
  const uid = authenticatedUser.uid;
  const { sns_type } = data;
  if (
    !sns_type ||
    !["x", "instagram", "threads", "tiktok"].includes(sns_type)
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid sns_type"
    );
  }
  try {
    console.log(`[connectSNS] User ${uid} attempting to connect ${sns_type}`);
    // 各SNSのOAuth URL生成
    let authUrl = "";
    let isDMSupported = sns_type === "x";
    switch (sns_type) {
      case "x": {
        try {
          console.log(`[connectSNS] Creating Twitter OAuth instance...`);
          const oauth = createTwitterOAuth();
          return new Promise((resolve, reject) => {
            console.log(`[connectSNS] Requesting OAuth token...`);
            oauth.getOAuthRequestToken(
              async (error, oauthToken, oauthTokenSecret, results) => {
                if (error) {
                  console.error("[connectSNS] Twitter OAuth error:", error);
                  console.error(
                    "[connectSNS] Error details:",
                    JSON.stringify(error)
                  );
                  reject(
                    new functions.https.HttpsError(
                      "internal",
                      `Twitter OAuth failed: ${JSON.stringify(error)}`
                    )
                  );
                  return;
                }
                console.log(`[connectSNS] OAuth token received: ${oauthToken}`);
                try {
                  // 一時的にOAuthデータをFirestoreに保存
                  const stateId = crypto.randomBytes(32).toString("hex");
                  const oauthData = {
                    uid,
                    sns_type: "x",
                    oauthToken,
                    oauthTokenSecret,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    expiresAt: admin.firestore.FieldValue.serverTimestamp(),
                  };
                  // Firestoreの一時コレクションに保存
                  await db.collection("oauth_temp").doc(stateId).set(oauthData);
                  // oauth_tokenでも検索できるようにインデックス用ドキュメントも作成
                  await db
                    .collection("oauth_temp")
                    .doc(`token_${oauthToken}`)
                    .set(
                      Object.assign(Object.assign({}, oauthData), {
                        stateId: stateId,
                      })
                    );
                  authUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=${oauthToken}&state=${stateId}`;
                  console.log(
                    `[connectSNS] Generated Twitter auth URL: ${authUrl}`
                  );
                  resolve({
                    success: true,
                    authUrl: authUrl,
                    sns_type: sns_type,
                    dmSupported: isDMSupported,
                    message: `${sns_type}の認証を開始します`,
                  });
                } catch (firestoreError) {
                  console.error(
                    "[connectSNS] Firestore save error:",
                    firestoreError
                  );
                  reject(
                    new functions.https.HttpsError(
                      "internal",
                      "Failed to save OAuth state"
                    )
                  );
                }
              }
            );
          });
        } catch (err) {
          console.error("[connectSNS] Error creating OAuth instance:", err);
          throw new functions.https.HttpsError(
            "internal",
            `OAuth setup failed: ${err}`
          );
        }
      }
      case "instagram":
        authUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${process.env.INSTAGRAM_CALLBACK_URL}&scope=user_profile,user_media&response_type=code`;
        break;
      case "threads":
        authUrl = `https://threads.net/oauth/authorize?client_id=${process.env.THREADS_CLIENT_ID}&redirect_uri=${process.env.THREADS_CALLBACK_URL}&scope=threads_basic&response_type=code`;
        break;
      case "tiktok":
        authUrl = `https://www.tiktok.com/auth/authorize/?client_key=${process.env.TIKTOK_CLIENT_ID}&redirect_uri=${process.env.TIKTOK_CALLBACK_URL}&response_type=code&scope=user.info.basic`;
        break;
    }
    if (sns_type !== "x") {
      console.log(
        `[connectSNS] Generated auth URL for ${sns_type}: ${authUrl}`
      );
    }
    return {
      success: true,
      authUrl: authUrl,
      sns_type: sns_type,
      dmSupported: isDMSupported,
      message: isDMSupported
        ? `${sns_type}の認証を開始します`
        : `${sns_type}の接続を開始します（DM送信機能は現在未対応）`,
    };
  } catch (error) {
    console.error("[connectSNS] Error:", error);
    throw new functions.https.HttpsError("internal", "Internal server error");
  }
});
// SNS OAuth コールバック処理
exports.handleSNSCallback = functions.https.onRequest(async (req, res) => {
  // URLからSNSタイプを抽出（クエリパラメータを除去）
  const urlParts = req.url.split("?")[0].split("/"); // クエリパラメータを除去
  const snsType = urlParts[urlParts.length - 1]; // callback/x から x を取得
  console.log(`[handleSNSCallback] Full URL: ${req.url}`);
  console.log(`[handleSNSCallback] URL parts: ${JSON.stringify(urlParts)}`);
  console.log(
    `[handleSNSCallback] Processing callback for SNS type: ${snsType}`
  );
  console.log(`[handleSNSCallback] Query params:`, req.query);
  try {
    switch (snsType) {
      case "x": {
        const { oauth_token, oauth_verifier, state } = req.query;
        console.log(`[handleSNSCallback] OAuth parameters received:`);
        console.log(
          `[handleSNSCallback] - oauth_token: ${
            oauth_token ? "present" : "missing"
          }`
        );
        console.log(
          `[handleSNSCallback] - oauth_verifier: ${
            oauth_verifier ? "present" : "missing"
          }`
        );
        console.log(
          `[handleSNSCallback] - state: ${state ? "present" : "missing"}`
        );
        if (!oauth_token || !oauth_verifier) {
          throw new Error(
            `Missing required OAuth parameters: oauth_token=${
              oauth_token ? "present" : "missing"
            }, oauth_verifier=${
              oauth_verifier ? "present" : "missing"
            }, state=${state ? "present" : "missing"}`
          );
        }
        // Twitter OAuth 1.0aではstateパラメータが含まれないことがある
        // oauth_tokenでFirestoreから認証データを検索する
        let authData = null;
        let docToDelete = null;
        if (state) {
          // stateパラメータがある場合はそれで検索
          console.log(`[handleSNSCallback] Searching by state: ${state}`);
          const stateDoc = await db.collection("oauth_temp").doc(state).get();
          if (stateDoc.exists) {
            authData = stateDoc.data();
            docToDelete = state;
            console.log(
              `[handleSNSCallback] Found auth data using state: ${state}`
            );
          }
        } else {
          // stateパラメータがない場合はoauth_tokenで検索
          console.log(
            `[handleSNSCallback] State parameter missing, searching by oauth_token: ${oauth_token}`
          );
          const tokenDoc = await db
            .collection("oauth_temp")
            .doc(`token_${oauth_token}`)
            .get();
          if (tokenDoc.exists) {
            authData = tokenDoc.data();
            docToDelete = `token_${oauth_token}`;
            // 元のstateドキュメントも削除するためのstateIdを取得
            const originalStateId =
              authData === null || authData === void 0
                ? void 0
                : authData.stateId;
            if (originalStateId) {
              await db.collection("oauth_temp").doc(originalStateId).delete();
            }
            console.log(
              `[handleSNSCallback] Found auth data using oauth_token`
            );
          }
        }
        if (!authData) {
          console.error(
            "[handleSNSCallback] OAuth data not found for token:",
            oauth_token
          );
          console.error("[handleSNSCallback] Checked state:", state);
          console.error(
            "[handleSNSCallback] Checked token doc: token_" + oauth_token
          );
          throw new Error("OAuth session not found or expired");
        }
        console.log(
          `[handleSNSCallback] Found auth data for user: ${authData.uid}`
        );
        const oauth = createTwitterOAuth();
        // アクセストークンを取得
        return new Promise((resolve, reject) => {
          oauth.getOAuthAccessToken(
            oauth_token,
            authData.oauthTokenSecret,
            oauth_verifier,
            async (error, accessToken, accessTokenSecret, results) => {
              try {
                if (error) {
                  console.error(
                    "[handleSNSCallback] Twitter access token error:",
                    error
                  );
                  throw error;
                }
                console.log(
                  `[handleSNSCallback] Access token obtained successfully`
                );
                // ユーザー情報を取得
                oauth.get(
                  "https://api.twitter.com/1.1/account/verify_credentials.json",
                  accessToken,
                  accessTokenSecret,
                  async (userError, userData) => {
                    try {
                      if (userError) {
                        console.error(
                          "[handleSNSCallback] Twitter user info error:",
                          userError
                        );
                        throw userError;
                      }
                      const userInfo = JSON.parse(userData);
                      console.log(
                        `[handleSNSCallback] Retrieved user info for @${userInfo.screen_name}`
                      );
                      // 既存の同じアカウントをチェック
                      const existingAccountQuery = await db
                        .collection("users")
                        .doc(authData.uid)
                        .collection("accounts")
                        .where("sns_type", "==", "x")
                        .where("account_id", "==", userInfo.id_str)
                        .where("is_active", "==", true)
                        .get();
                      if (!existingAccountQuery.empty) {
                        console.log(
                          `[handleSNSCallback] Account @${userInfo.screen_name} already exists, skipping save`
                        );
                        // 既存アカウントがある場合はアクセストークンのみ更新
                        const existingDoc = existingAccountQuery.docs[0];
                        await existingDoc.ref.update({
                          access_token: accessToken,
                          access_token_secret: accessTokenSecret,
                          connected_at:
                            admin.firestore.FieldValue.serverTimestamp(),
                        });
                      } else {
                        console.log(
                          `[handleSNSCallback] Creating new account for @${userInfo.screen_name}`
                        );
                        // 新しいアカウントとして保存
                        await db
                          .collection("users")
                          .doc(authData.uid)
                          .collection("accounts")
                          .add({
                            sns_type: "x",
                            account_id: userInfo.id_str,
                            username: userInfo.screen_name,
                            display_name: userInfo.name,
                            profile_image_url: userInfo.profile_image_url_https,
                            access_token: accessToken,
                            access_token_secret: accessTokenSecret,
                            connected_at:
                              admin.firestore.FieldValue.serverTimestamp(),
                            is_active: true,
                          });
                      }
                      // 一時データを削除
                      if (docToDelete) {
                        await db
                          .collection("oauth_temp")
                          .doc(docToDelete)
                          .delete();
                      }
                      const isExistingAccount = !existingAccountQuery.empty;
                      const statusMessage = isExistingAccount
                        ? "既に接続済みのアカウントです"
                        : "X認証が完了しました";
                      console.log(
                        `[handleSNSCallback] Successfully processed Twitter account @${
                          userInfo.screen_name
                        } (${isExistingAccount ? "existing" : "new"})`
                      );
                      // ポップアップウィンドウを閉じて親ウィンドウに結果を通知するHTMLを返す
                      res.send(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <title>認証完了</title>
                          <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                            .success { color: #28a745; }
                            .info { color: #17a2b8; }
                          </style>
                        </head>
                        <body>
                          <h2 class="${
                            isExistingAccount ? "info" : "success"
                          }">✅ ${statusMessage}</h2>
                          <p>アカウント: @${userInfo.screen_name}</p>
                          <p>このウィンドウは自動的に閉じられます...</p>
                          <script>
                            // 親ウィンドウに認証完了を通知
                            if (window.opener) {
                              window.opener.postMessage({
                                type: 'oauth_success',
                                sns_type: 'x',
                                account: '${userInfo.screen_name}',
                                isExisting: ${isExistingAccount}
                              }, '*');
                            }
                            // 2秒後にウィンドウを閉じる
                            setTimeout(() => {
                              window.close();
                            }, 1000);
                          </script>
                        </body>
                        </html>
                      `);
                      resolve();
                    } catch (err) {
                      console.error(
                        "[handleSNSCallback] Error saving account:",
                        err
                      );
                      res
                        .status(500)
                        .send("Failed to save account information");
                      reject(err);
                    }
                  }
                );
              } catch (err) {
                console.error(
                  "[handleSNSCallback] Access token processing error:",
                  err
                );
                res.status(500).send("OAuth access token failed");
                reject(err);
              }
            }
          );
        });
      }
      case "instagram":
      case "threads":
      case "tiktok": {
        // これらのSNSは現在実装せず、テスト用のリダイレクトのみ
        console.log(`[handleSNSCallback] ${snsType} OAuth not implemented yet`);
        res.redirect(
          `${
            process.env.APP_URL || "http://localhost:4200"
          }/dashboard?sns_connected=${snsType}&status=not_implemented`
        );
        break;
      }
      default:
        throw new Error(`Unsupported SNS type: ${snsType}`);
    }
  } catch (error) {
    console.error("[handleSNSCallback] Error:", error);
    res.status(500).send(`Callback processing failed: ${error}`);
  }
});
// 認証ヘルパー関数
const authenticateUser = async (context) => {
  var _a, _b, _c, _d, _e;
  // まずcontext.authを確認
  if (context.auth && context.auth.uid) {
    return context.auth;
  }
  // Firebase Functions v2のバグ対応: 手動でトークンを検証
  // rawRequestが存在しない場合も考慮
  const authHeader =
    ((_b =
      (_a = context.rawRequest) === null || _a === void 0
        ? void 0
        : _a.headers) === null || _b === void 0
      ? void 0
      : _b.authorization) ||
    ((_d =
      (_c = context.rawRequest) === null || _c === void 0
        ? void 0
        : _c.headers) === null || _d === void 0
      ? void 0
      : _d.Authorization);
  console.log(
    "[authenticateUser] Checking manual auth - headers exist:",
    !!((_e = context.rawRequest) === null || _e === void 0
      ? void 0
      : _e.headers)
  );
  console.log(
    "[authenticateUser] Authorization header:",
    authHeader ? "present" : "missing"
  );
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const idToken = authHeader.substring(7);
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        token: decodedToken,
      };
    } catch (error) {
      console.error("[authenticateUser] Token verification failed:", error);
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Invalid authentication token"
      );
    }
  }
  // callable関数の場合、context.rawRequestがない可能性があるため、
  // クライアントはHTTP関数版を使用することを推奨
  console.error(
    "[authenticateUser] No valid authentication found. context.auth:",
    context.auth,
    "rawRequest exists:",
    !!context.rawRequest
  );
  throw new functions.https.HttpsError(
    "unauthenticated",
    "User not authenticated"
  );
};
// 連携済みSNSアカウント一覧取得 (HTTP function版)
exports.getConnectedAccountsHttp = functions.https.onRequest(
  async (req, res) => {
    // CORS設定
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.status(200).send();
      return;
    }
    console.log("[getConnectedAccountsHttp] === Authentication Debug ===");
    console.log("[getConnectedAccountsHttp] Request headers:", req.headers);
    console.log(
      "[getConnectedAccountsHttp] Authorization header:",
      req.headers.authorization
    );
    try {
      // Authorization headerから手動でトークンを取得
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.error(
          "[getConnectedAccountsHttp] No valid authorization header found"
        );
        res.status(401).json({
          error: "No valid authorization header found",
          received_header: authHeader,
        });
        return;
      }
      const idToken = authHeader.substring(7);
      console.log(
        "[getConnectedAccountsHttp] Found Bearer token, length:",
        idToken.length
      );
      // Firebase Admin SDKでトークンを検証
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      console.log(
        "[getConnectedAccountsHttp] Token verification successful:",
        decodedToken.uid
      );
      const uid = decodedToken.uid;
      const { sns_type } = req.body || {};
      console.log(
        `[getConnectedAccountsHttp] Fetching accounts for user ${uid}, sns_type: ${sns_type}`
      );
      let query = db
        .collection("users")
        .doc(uid)
        .collection("accounts")
        .where("is_active", "==", true);
      if (sns_type) {
        query = query.where("sns_type", "==", sns_type);
      }
      const accountsSnapshot = await query.get();
      const accounts = accountsSnapshot.docs.map((doc) => {
        var _a, _b, _c;
        const data = doc.data();
        // セキュリティのため、アクセストークンは返さない
        delete data.access_token;
        delete data.access_token_secret;
        return Object.assign(Object.assign({ id: doc.id }, data), {
          connected_at:
            ((_c =
              (_b =
                (_a = data.connected_at) === null || _a === void 0
                  ? void 0
                  : _a.toDate) === null || _b === void 0
                ? void 0
                : _b.call(_a)) === null || _c === void 0
              ? void 0
              : _c.toISOString()) || data.connected_at,
        });
      });
      console.log(
        `[getConnectedAccountsHttp] Found ${accounts.length} accounts`
      );
      res.json({
        success: true,
        accounts: accounts,
        total: accounts.length,
      });
    } catch (error) {
      console.error("[getConnectedAccountsHttp] Error:", error);
      if (error instanceof Error && error.message.includes("auth/")) {
        res.status(401).json({
          error: "Authentication failed",
          details: error.message,
        });
      } else {
        res.status(500).json({
          error: "Internal server error",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
);
// 連携済みSNSアカウント一覧取得 (互換性のためcallable版も残す)
exports.getConnectedAccounts = functions.https.onCall(async (data, context) => {
  var _a, _b;
  console.log("[getConnectedAccounts] === Authentication Debug ===");
  console.log("[getConnectedAccounts] context.auth:", context.auth);
  console.log(
    "[getConnectedAccounts] authorization header:",
    (_b =
      (_a = context.rawRequest) === null || _a === void 0
        ? void 0
        : _a.headers) === null || _b === void 0
      ? void 0
      : _b.authorization
  );
  try {
    const authenticatedUser = await authenticateUser(context);
    console.log(
      "[getConnectedAccounts] Authentication successful:",
      authenticatedUser.uid
    );
    const uid = authenticatedUser.uid;
    const { sns_type } = data;
    console.log(
      `[getConnectedAccounts] Fetching accounts for user ${uid}, sns_type: ${sns_type}`
    );
    let query = db
      .collection("users")
      .doc(uid)
      .collection("accounts")
      .where("is_active", "==", true);
    if (sns_type) {
      query = query.where("sns_type", "==", sns_type);
    }
    const accountsSnapshot = await query.get();
    const accounts = accountsSnapshot.docs.map((doc) => {
      var _a, _b, _c;
      const data = doc.data();
      // セキュリティのため、アクセストークンは返さない
      delete data.access_token;
      delete data.access_token_secret;
      return Object.assign(Object.assign({ id: doc.id }, data), {
        connected_at:
          ((_c =
            (_b =
              (_a = data.connected_at) === null || _a === void 0
                ? void 0
                : _a.toDate) === null || _b === void 0
              ? void 0
              : _b.call(_a)) === null || _c === void 0
            ? void 0
            : _c.toISOString()) || data.connected_at,
      });
    });
    console.log(`[getConnectedAccounts] Found ${accounts.length} accounts`);
    return {
      success: true,
      accounts: accounts,
      total: accounts.length,
    };
  } catch (error) {
    console.error("[getConnectedAccounts] Error:", error);
    // 認証エラーの場合は元のエラーを再スロー
    if (
      error instanceof functions.https.HttpsError &&
      error.code === "unauthenticated"
    ) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      "Failed to fetch connected accounts"
    );
  }
});
exports.runHashtagDM = functions.https.onCall(async (data, context) => {
  const authenticatedUser = await authenticateUser(context);
  const uid = authenticatedUser.uid;
  const { hashtag_id } = data;
  if (!hashtag_id) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "hashtag_id is required"
    );
  }
  try {
    // users/{uid}/hashtags/{hashtag_id} の構造に対応
    const hashtagDoc = await db
      .collection("users")
      .doc(uid)
      .collection("hashtags")
      .doc(hashtag_id)
      .get();
    if (!hashtagDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Hashtag not found");
    }
    const hashtagData = hashtagDoc.data();
    if (
      (hashtagData === null || hashtagData === void 0
        ? void 0
        : hashtagData.sns_type) !== "x"
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Only X (Twitter) is supported for DM sending"
      );
    }
    console.log(
      `[runHashtagDM] Processing hashtag: ${hashtagData.hashtag} for account: ${hashtagData.account_id}`
    );
    console.log(
      `[runHashtagDM] TODO: Fetch posts with hashtag ${hashtagData.hashtag}`
    );
    console.log(`[runHashtagDM] TODO: Send DM to post authors`);
    console.log(`[runHashtagDM] TODO: Save to dm_logs collection`);
    return {
      success: true,
      message: "Hashtag DM process initiated",
      processed_hashtag: hashtagData.hashtag,
    };
  } catch (error) {
    console.error("[runHashtagDM] Error:", error);
    throw new functions.https.HttpsError("internal", "Internal server error");
  }
});
exports.runReplyDM = functions.https.onCall(async (data, context) => {
  const authenticatedUser = await authenticateUser(context);
  const uid = authenticatedUser.uid;
  const { post_id } = data;
  if (!post_id) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "post_id is required"
    );
  }
  try {
    // users/{uid}/posts/{post_id} の構造に対応
    const postDoc = await db
      .collection("users")
      .doc(uid)
      .collection("posts")
      .doc(post_id)
      .get();
    if (!postDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Post not found");
    }
    const postData = postDoc.data();
    if (
      (postData === null || postData === void 0
        ? void 0
        : postData.sns_type) !== "x"
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Only X (Twitter) is supported for DM sending"
      );
    }
    console.log(
      `[runReplyDM] Processing post: ${postData.post_id} for account: ${postData.account_id}`
    );
    console.log(`[runReplyDM] TODO: Fetch replies to post ${postData.post_id}`);
    console.log(`[runReplyDM] TODO: Send DM to reply authors`);
    console.log(`[runReplyDM] TODO: Save to dm_logs collection`);
    return {
      success: true,
      message: "Reply DM process initiated",
      processed_post_id: postData.post_id,
    };
  } catch (error) {
    console.error("[runReplyDM] Error:", error);
    throw new functions.https.HttpsError("internal", "Internal server error");
  }
});
// デバッグ用：認証なしHTTP関数（問題切り分け用） - Firebase Functions v2 compatible
exports.debugEnvHttp = functions.https.onRequest(async (req, res) => {
  // CORS設定
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(200).send();
    return;
  }
  console.log("[debugEnvHttp] HTTP debug request received");
  const envVars = {
    process_env_X_API_KEY: process.env.X_API_KEY ? "SET" : "NOT_SET",
    process_env_X_API_SECRET: process.env.X_API_SECRET ? "SET" : "NOT_SET",
    process_env_X_BEARER_TOKEN: process.env.X_BEARER_TOKEN ? "SET" : "NOT_SET",
    process_env_X_CALLBACK_URL: process.env.X_CALLBACK_URL || "NOT_SET",
  };
  res.json({
    success: true,
    message: "HTTP function working - Firebase Functions v2",
    env_vars: envVars,
  });
});
// SNSアカウント切断 (HTTP関数版)
exports.disconnectSNSHttp = functions.https.onRequest(async (req, res) => {
  // CORS設定
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(200).send();
    return;
  }
  try {
    // Authorization headerから手動でトークンを取得
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[disconnectSNSHttp] No valid authorization header found");
      res.status(401).json({
        error: "No valid authorization header found",
        received_header: authHeader,
      });
      return;
    }
    const idToken = authHeader.substring(7);
    console.log(
      "[disconnectSNSHttp] Found Bearer token, length:",
      idToken.length
    );
    // Firebase Admin SDKでトークンを検証
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log(
      "[disconnectSNSHttp] Token verification successful:",
      decodedToken.uid
    );
    const uid = decodedToken.uid;
    const { account_id } = req.body || {};
    if (!account_id) {
      res.status(400).json({
        error: "account_id is required",
      });
      return;
    }
    console.log(
      `[disconnectSNSHttp] Disconnecting account ${account_id} for user ${uid}`
    );
    // アカウントを削除
    await db
      .collection("users")
      .doc(uid)
      .collection("accounts")
      .doc(account_id)
      .delete();
    console.log(
      `[disconnectSNSHttp] Successfully disconnected account ${account_id}`
    );
    res.json({
      success: true,
      message: "アカウントの接続を解除しました",
    });
  } catch (error) {
    console.error("[disconnectSNSHttp] Error:", error);
    if (error instanceof Error && error.message.includes("auth/")) {
      res.status(401).json({
        error: "Authentication failed",
        details: error.message,
      });
    } else {
      res.status(500).json({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
});
// デバッグ用：HTTP関数での認証テスト - Firebase Functions v2 compatible
exports.debugAuthHttp = functions.https.onRequest(async (req, res) => {
  // CORS設定
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(200).send();
    return;
  }
  console.log("[debugAuthHttp] === HTTP Authentication Debug ===");
  console.log("[debugAuthHttp] Request headers:", req.headers);
  console.log(
    "[debugAuthHttp] Authorization header:",
    req.headers.authorization
  );
  // Authorization headerから手動でトークンを取得
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("[debugAuthHttp] No valid authorization header found");
    res.status(401).json({
      error: "No valid authorization header found",
      received_header: authHeader,
    });
    return;
  }
  const idToken = authHeader.substring(7);
  console.log("[debugAuthHttp] Found Bearer token, length:", idToken.length);
  try {
    // Firebase Admin SDKでトークンを検証
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log(
      "[debugAuthHttp] Token verification successful:",
      decodedToken.uid
    );
    const envVars = {
      X_API_KEY: process.env.X_API_KEY ? "SET" : "NOT_SET",
      X_API_SECRET: process.env.X_API_SECRET ? "SET" : "NOT_SET",
      X_BEARER_TOKEN: process.env.X_BEARER_TOKEN ? "SET" : "NOT_SET",
      X_CALLBACK_URL: process.env.X_CALLBACK_URL || "NOT_SET",
    };
    res.json({
      success: true,
      user_uid: decodedToken.uid,
      user_email: decodedToken.email,
      auth_time: decodedToken.auth_time,
      functions_version: "v2",
      authentication_method: "http_manual_verification",
      env_vars: envVars,
    });
  } catch (error) {
    console.error("[debugAuthHttp] Token verification failed:", error);
    res.status(401).json({
      error: "Token verification failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
//# sourceMappingURL=index.js.map
