import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { OAuth } from "oauth";
import * as crypto from "crypto";

admin.initializeApp();

const db = admin.firestore();

// CORS設定（コメントアウト - 明示的なCORS設定を使用）
// const corsHandler = cors({
//   origin: true,
//   credentials: true,
//   methods: ['GET', 'POST', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// });

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


  if (!apiKey || !apiSecret) {
    throw new Error(
      "Twitter API credentials are missing from environment variables"
    );
  }

  return new OAuth(
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
export const connectSNSHttp = functions.https.onRequest(async (req, res) => {
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
      console.error("[connectSNSHttp] No valid authorization header found");
      res.status(401).json({
        error: "No valid authorization header found",
        received_header: authHeader,
      });
      return;
    }

    const idToken = authHeader.substring(7);

    // Firebase Admin SDKでトークンを検証
    const decodedToken = await admin.auth().verifyIdToken(idToken);

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


    // 各SNSのOAuth URL生成
    let authUrl = "";
    let isDMSupported = sns_type === "x";

    switch (sns_type) {
      case "x": {
        try {
          const oauth = createTwitterOAuth();

          const result = await new Promise<any>((resolve, reject) => {
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
                    .set({
                      ...oauthData,
                      stateId: stateId,
                    });

                  authUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=${oauthToken}&state=${stateId}`;

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
export const connectSNS = functions.https.onCall(
  async (data: any, context: any) => {
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

                  console.log(
                    `[connectSNS] OAuth token received: ${oauthToken}`
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
                      expiresAt: admin.firestore.FieldValue.serverTimestamp(),
                    };

                    // Firestoreの一時コレクションに保存
                    await db
                      .collection("oauth_temp")
                      .doc(stateId)
                      .set(oauthData);

                    // oauth_tokenでも検索できるようにインデックス用ドキュメントも作成
                    await db
                      .collection("oauth_temp")
                      .doc(`token_${oauthToken}`)
                      .set({
                        ...oauthData,
                        stateId: stateId,
                      });

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
  }
);

// SNS OAuth コールバック処理
export const handleSNSCallback = functions.https.onRequest(async (req, res) => {
  // URLからSNSタイプを抽出（クエリパラメータを除去）
  const urlParts = req.url.split("?")[0].split("/"); // クエリパラメータを除去
  const snsType = urlParts[urlParts.length - 1]; // callback/x から x を取得


  try {
    switch (snsType) {
      case "x": {
        const { oauth_token, oauth_verifier, state } = req.query;

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
          const stateDoc = await db
            .collection("oauth_temp")
            .doc(state as string)
            .get();
          if (stateDoc.exists) {
            authData = stateDoc.data();
            docToDelete = state as string;
          }
        } else {
          // stateパラメータがない場合はoauth_tokenで検索
          const tokenDoc = await db
            .collection("oauth_temp")
            .doc(`token_${oauth_token}`)
            .get();
          if (tokenDoc.exists) {
            authData = tokenDoc.data();
            docToDelete = `token_${oauth_token}`;
            // 元のstateドキュメントも削除するためのstateIdを取得
            const originalStateId = authData?.stateId;
            if (originalStateId) {
              await db.collection("oauth_temp").doc(originalStateId).delete();
            }
          }
        }

        if (!authData) {
          throw new Error("OAuth session not found or expired");
        }

        const oauth = createTwitterOAuth();

        // アクセストークンを取得
        return new Promise<void>((resolve, reject) => {
          oauth.getOAuthAccessToken(
            oauth_token as string,
            authData.oauthTokenSecret,
            oauth_verifier as string,
            async (error, accessToken, accessTokenSecret, results: any) => {
              try {
                if (error) {
                  console.error(
                    "[handleSNSCallback] Twitter access token error:",
                    error
                  );
                  throw error;
                }

                // ユーザー情報を取得
                oauth.get(
                  "https://api.twitter.com/1.1/account/verify_credentials.json",
                  accessToken,
                  accessTokenSecret,
                  async (userError: any, userData: any) => {
                    try {
                      if (userError) {
                        console.error(
                          "[handleSNSCallback] Twitter user info error:",
                          userError
                        );
                        throw userError;
                      }

                      const userInfo = JSON.parse(userData);

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
                        // 既存アカウントがある場合はアクセストークンのみ更新
                        const existingDoc = existingAccountQuery.docs[0];
                        await existingDoc.ref.update({
                          access_token: accessToken,
                          access_token_secret: accessTokenSecret,
                          connected_at:
                            admin.firestore.FieldValue.serverTimestamp(),
                        });
                      } else {
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
const authenticateUser = async (context: any) => {
  // まずcontext.authを確認
  if (context.auth && context.auth.uid) {
    return context.auth;
  }

  // Firebase Functions v2のバグ対応: 手動でトークンを検証
  // rawRequestが存在しない場合も考慮
  const authHeader =
    context.rawRequest?.headers?.authorization ||
    context.rawRequest?.headers?.Authorization;


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

  throw new functions.https.HttpsError(
    "unauthenticated",
    "User not authenticated"
  );
};

// 連携済みSNSアカウント一覧取得 (HTTP function版)
export const getConnectedAccountsHttp = functions.https.onRequest(
  async (req, res) => {
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

      // Firebase Admin SDKでトークンを検証
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      const uid = decodedToken.uid;
      const { sns_type } = req.body || {};

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
        const data = doc.data();
        // セキュリティのため、アクセストークンは返さない
        delete data.access_token;
        delete data.access_token_secret;

        return {
          id: doc.id,
          ...data,
          connected_at:
            data.connected_at?.toDate?.()?.toISOString() || data.connected_at,
        };
      });

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
export const getConnectedAccounts = functions.https.onCall(
  async (data: any, context: any) => {

    try {
      const authenticatedUser = await authenticateUser(context);
      const uid = authenticatedUser.uid;
      const { sns_type } = data;

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
        const data = doc.data();
        // セキュリティのため、アクセストークンは返さない
        delete data.access_token;
        delete data.access_token_secret;

        return {
          id: doc.id,
          ...data,
          connected_at:
            data.connected_at?.toDate?.()?.toISOString() || data.connected_at,
        };
      });

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
  }
);

export const runHashtagDM = functions.https.onCall(
  async (data: any, context: any) => {
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

      if (hashtagData?.sns_type !== "x") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Only X (Twitter) is supported for DM sending"
        );
      }

      // TODO: Implement hashtag processing
      // 1. Fetch posts with hashtag
      // 2. Send DM to post authors  
      // 3. Save to dm_logs collection

      return {
        success: true,
        message: "Hashtag DM process initiated",
        processed_hashtag: hashtagData.hashtag,
      };
    } catch (error) {
      console.error("[runHashtagDM] Error:", error);
      throw new functions.https.HttpsError("internal", "Internal server error");
    }
  }
);

export const runReplyDM = functions.https.onCall(
  async (data: any, context: any) => {
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

      if (postData?.sns_type !== "x") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Only X (Twitter) is supported for DM sending"
        );
      }

      // TODO: Implement reply processing
      // 1. Fetch replies to post
      // 2. Send DM to reply authors
      // 3. Save to dm_logs collection

      return {
        success: true,
        message: "Reply DM process initiated",
        processed_post_id: postData.post_id,
      };
    } catch (error) {
      console.error("[runReplyDM] Error:", error);
      throw new functions.https.HttpsError("internal", "Internal server error");
    }
  }
);

// デバッグ用：認証なしHTTP関数（問題切り分け用） - Firebase Functions v2 compatible
export const debugEnvHttp = functions.https.onRequest(async (req, res) => {
  // CORS設定
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).send();
    return;
  }


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
export const disconnectSNSHttp = functions.https.onRequest(async (req, res) => {
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

    // Firebase Admin SDKでトークンを検証
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const uid = decodedToken.uid;
    const { account_id } = req.body || {};

    if (!account_id) {
      res.status(400).json({
        error: "account_id is required",
      });
      return;
    }

    // アカウントを削除
    await db
      .collection("users")
      .doc(uid)
      .collection("accounts")
      .doc(account_id)
      .delete();

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

// ハッシュタグ登録 (HTTP関数版)
export const registerHashtagHttp = functions.https.onRequest(async (req, res) => {
  // CORS設定 - 明示的に設定
  res.set("Access-Control-Allow-Origin", "https://sivira-step.web.app");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // Authorization headerから手動でトークンを取得
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[registerHashtagHttp] No valid authorization header found");
        res.status(401).json({
          error: "No valid authorization header found",
          received_header: authHeader,
        });
        return;
      }

      const idToken = authHeader.substring(7);

      // Firebase Admin SDKでトークンを検証
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      const uid = decodedToken.uid;
      const { sns_type, account_id, hashtag, dm_message } = req.body || {};

      if (!sns_type || !account_id || !hashtag || !dm_message) {
        res.status(400).json({
          error: "Missing required fields",
          required: ["sns_type", "account_id", "hashtag", "dm_message"],
        });
        return;
      }

      // ハッシュタグデータを作成
      const hashtagData = {
        uid,
        sns_type,
        account_id,
        hashtag: hashtag.replace(/^#/, ''), // # を除去
        dm_message,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        is_active: true,
      };

      // Firestoreに保存
      const docRef = await db.collection("users").doc(uid).collection("hashtags").add(hashtagData);

      res.json({
        success: true,
        message: "ハッシュタグが正常に登録されました",
        hashtag_id: docRef.id,
      });
    } catch (error) {
      console.error("[registerHashtagHttp] Error:", error);

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

// 投稿登録 (HTTP関数版)
export const registerPostHttp = functions.https.onRequest(async (req, res) => {
  // CORS設定 - 明示的に設定
  res.set("Access-Control-Allow-Origin", "https://sivira-step.web.app");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // Authorization headerから手動でトークンを取得
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[registerPostHttp] No valid authorization header found");
        res.status(401).json({
          error: "No valid authorization header found",
          received_header: authHeader,
        });
        return;
      }

      const idToken = authHeader.substring(7);

      // Firebase Admin SDKでトークンを検証
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      const uid = decodedToken.uid;
      const { sns_type, account_id, post_id, post_url, dm_message } = req.body || {};

      if (!sns_type || !account_id || !post_id || !dm_message) {
        res.status(400).json({
          error: "Missing required fields",
          required: ["sns_type", "account_id", "post_id", "dm_message"],
        });
        return;
      }

      // 投稿データを作成
      const postData = {
        uid,
        sns_type,
        account_id,
        post_id,
        post_url: post_url || '',
        dm_message,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        is_active: true,
      };

      // Firestoreに保存
      const docRef = await db.collection("users").doc(uid).collection("posts").add(postData);

      res.json({
        success: true,
        message: "投稿が正常に登録されました",
        post_doc_id: docRef.id,
      });
    } catch (error) {
      console.error("[registerPostHttp] Error:", error);

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

// ハッシュタグ一覧取得 (HTTP関数版)
export const getHashtagsHttp = functions.https.onRequest(async (req, res) => {
  // CORS設定 - 明示的に設定
  res.set("Access-Control-Allow-Origin", "https://sivira-step.web.app");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // Authorization headerから手動でトークンを取得
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[getHashtagsHttp] No valid authorization header found");
      res.status(401).json({
        error: "No valid authorization header found",
        received_header: authHeader,
      });
      return;
    }

    const idToken = authHeader.substring(7);

    // Firebase Admin SDKでトークンを検証
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const uid = decodedToken.uid;

    // ユーザーのハッシュタグ一覧を取得
    const hashtagsRef = db.collection("users").doc(uid).collection("hashtags");
    const snapshot = await hashtagsRef.where("is_active", "==", true).orderBy("created_at", "desc").get();

    const hashtags = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
    }));

    res.json({
      success: true,
      hashtags: hashtags,
      total: hashtags.length,
    });
  } catch (error) {
    console.error("[getHashtagsHttp] Error:", error);

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

// 投稿一覧取得 (HTTP関数版)
export const getPostsHttp = functions.https.onRequest(async (req, res) => {
  // CORS設定 - 明示的に設定
  res.set("Access-Control-Allow-Origin", "https://sivira-step.web.app");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // Authorization headerから手動でトークンを取得
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[getPostsHttp] No valid authorization header found");
      res.status(401).json({
        error: "No valid authorization header found",
        received_header: authHeader,
      });
      return;
    }

    const idToken = authHeader.substring(7);

    // Firebase Admin SDKでトークンを検証
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const uid = decodedToken.uid;

    // ユーザーの投稿一覧を取得
    const postsRef = db.collection("users").doc(uid).collection("posts");
    const snapshot = await postsRef.where("is_active", "==", true).orderBy("created_at", "desc").get();

    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
    }));

    res.json({
      success: true,
      posts: posts,
      total: posts.length,
    });
  } catch (error) {
    console.error("[getPostsHttp] Error:", error);

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

// ハッシュタグ更新 (HTTP関数版)
export const updateHashtagHttp = functions.https.onRequest(async (req, res) => {
  // CORS設定 - 明示的に設定
  res.set("Access-Control-Allow-Origin", "https://sivira-step.web.app");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // Authorization headerから手動でトークンを取得
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[updateHashtagHttp] No valid authorization header found");
      res.status(401).json({
        error: "No valid authorization header found",
        received_header: authHeader,
      });
      return;
    }

    const idToken = authHeader.substring(7);

    // Firebase Admin SDKでトークンを検証
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const uid = decodedToken.uid;
    const { hashtag_id, hashtag, dm_message } = req.body || {};

    if (!hashtag_id || !hashtag || !dm_message) {
      res.status(400).json({
        error: "Missing required fields",
        required: ["hashtag_id", "hashtag", "dm_message"],
      });
      return;
    }

    // ハッシュタグを更新
    await db.collection("users").doc(uid).collection("hashtags").doc(hashtag_id).update({
      hashtag: hashtag.replace(/^#/, ''), // # を除去
      dm_message,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: "ハッシュタグが正常に更新されました",
    });
  } catch (error) {
    console.error("[updateHashtagHttp] Error:", error);

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

// 投稿更新 (HTTP関数版)
export const updatePostHttp = functions.https.onRequest(async (req, res) => {
  // CORS設定 - 明示的に設定
  res.set("Access-Control-Allow-Origin", "https://sivira-step.web.app");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // Authorization headerから手動でトークンを取得
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[updatePostHttp] No valid authorization header found");
      res.status(401).json({
        error: "No valid authorization header found",
        received_header: authHeader,
      });
      return;
    }

    const idToken = authHeader.substring(7);

    // Firebase Admin SDKでトークンを検証
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const uid = decodedToken.uid;
    const { post_doc_id, post_id, post_url, dm_message } = req.body || {};

    if (!post_doc_id || !post_id || !dm_message) {
      res.status(400).json({
        error: "Missing required fields",
        required: ["post_doc_id", "post_id", "dm_message"],
      });
      return;
    }

    // 投稿を更新
    await db.collection("users").doc(uid).collection("posts").doc(post_doc_id).update({
      post_id,
      post_url: post_url || '',
      dm_message,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: "投稿が正常に更新されました",
    });
  } catch (error) {
    console.error("[updatePostHttp] Error:", error);

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

// ハッシュタグ削除 (HTTP関数版)
export const deleteHashtagHttp = functions.https.onRequest(async (req, res) => {
  // CORS設定 - 明示的に設定
  res.set("Access-Control-Allow-Origin", "https://sivira-step.web.app");
  res.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // Authorization headerから手動でトークンを取得
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[deleteHashtagHttp] No valid authorization header found");
      res.status(401).json({
        error: "No valid authorization header found",
        received_header: authHeader,
      });
      return;
    }

    const idToken = authHeader.substring(7);

    // Firebase Admin SDKでトークンを検証
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const uid = decodedToken.uid;
    const { hashtag_id } = req.body || {};

    if (!hashtag_id) {
      res.status(400).json({
        error: "Missing required field: hashtag_id",
      });
      return;
    }

    // ハッシュタグを論理削除
    await db.collection("users").doc(uid).collection("hashtags").doc(hashtag_id).update({
      is_active: false,
      deleted_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: "ハッシュタグが正常に削除されました",
    });
  } catch (error) {
    console.error("[deleteHashtagHttp] Error:", error);

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

// 投稿削除 (HTTP関数版)
export const deletePostHttp = functions.https.onRequest(async (req, res) => {
  // CORS設定 - 明示的に設定
  res.set("Access-Control-Allow-Origin", "https://sivira-step.web.app");
  res.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // Authorization headerから手動でトークンを取得
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[deletePostHttp] No valid authorization header found");
      res.status(401).json({
        error: "No valid authorization header found",
        received_header: authHeader,
      });
      return;
    }

    const idToken = authHeader.substring(7);

    // Firebase Admin SDKでトークンを検証
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const uid = decodedToken.uid;
    const { post_doc_id } = req.body || {};

    if (!post_doc_id) {
      res.status(400).json({
        error: "Missing required field: post_doc_id",
      });
      return;
    }

    // 投稿を論理削除
    await db.collection("users").doc(uid).collection("posts").doc(post_doc_id).update({
      is_active: false,
      deleted_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: "投稿が正常に削除されました",
    });
  } catch (error) {
    console.error("[deletePostHttp] Error:", error);

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
export const debugAuthHttp = functions.https.onRequest(async (req, res) => {
  // CORS設定 - 明示的に設定
  res.set("Access-Control-Allow-Origin", "https://sivira-step.web.app");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

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

  try {
    // Firebase Admin SDKでトークンを検証
    const decodedToken = await admin.auth().verifyIdToken(idToken);

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
