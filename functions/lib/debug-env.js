"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugEnv = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Firebase Functions v2 対応の認証テスト関数
exports.debugEnv = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    // 認証状態を詳しくログ出力
    console.log('[debugEnv] === Authentication Debug ===');
    console.log('[debugEnv] Firebase Functions version: v2');
    console.log('[debugEnv] Request headers:', (_a = context.rawRequest) === null || _a === void 0 ? void 0 : _a.headers);
    console.log('[debugEnv] Authorization header:', (_c = (_b = context.rawRequest) === null || _b === void 0 ? void 0 : _b.headers) === null || _c === void 0 ? void 0 : _c.authorization);
    console.log('[debugEnv] context object keys:', Object.keys(context));
    console.log('[debugEnv] context.auth:', context.auth);
    console.log('[debugEnv] context.auth type:', typeof context.auth);
    console.log('[debugEnv] context.auth.uid:', (_d = context.auth) === null || _d === void 0 ? void 0 : _d.uid);
    console.log('[debugEnv] context.auth.token:', (_e = context.auth) === null || _e === void 0 ? void 0 : _e.token);
    console.log('[debugEnv] context.instanceIdToken:', context.instanceIdToken);
    // Firebase Functions v2での認証処理を手動で実行
    let authenticatedUser = null;
    if (!context.auth || !context.auth.uid) {
        console.log('[debugEnv] context.auth is missing, trying manual verification...');
        // Authorization headerから手動でトークンを取得
        const authHeader = (_g = (_f = context.rawRequest) === null || _f === void 0 ? void 0 : _f.headers) === null || _g === void 0 ? void 0 : _g.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const idToken = authHeader.substring(7);
            console.log('[debugEnv] Found Bearer token, length:', idToken.length);
            try {
                // Firebase Admin SDKでトークンを検証
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                console.log('[debugEnv] Token verification successful:', decodedToken.uid);
                authenticatedUser = {
                    uid: decodedToken.uid,
                    email: decodedToken.email,
                    token: decodedToken
                };
            }
            catch (error) {
                console.error('[debugEnv] Token verification failed:', error);
                throw new functions.https.HttpsError("unauthenticated", "Invalid authentication token");
            }
        }
        else {
            console.error('[debugEnv] No authorization header found');
            throw new functions.https.HttpsError("unauthenticated", "No authentication token provided");
        }
    }
    else {
        console.log('[debugEnv] Using context.auth');
        authenticatedUser = context.auth;
    }
    console.log('[debugEnv] Authentication successful for user:', authenticatedUser.uid);
    console.log('[debugEnv] User email:', authenticatedUser.email);
    console.log('[debugEnv] User token claims:', authenticatedUser.token);
    console.log('[debugEnv] Environment variables check:');
    console.log(`X_API_KEY: ${process.env.X_API_KEY ? 'SET' : 'NOT_SET'} (length: ${(_h = process.env.X_API_KEY) === null || _h === void 0 ? void 0 : _h.length})`);
    console.log(`X_API_SECRET: ${process.env.X_API_SECRET ? 'SET' : 'NOT_SET'} (length: ${(_j = process.env.X_API_SECRET) === null || _j === void 0 ? void 0 : _j.length})`);
    console.log(`X_BEARER_TOKEN: ${process.env.X_BEARER_TOKEN ? 'SET' : 'NOT_SET'} (length: ${(_k = process.env.X_BEARER_TOKEN) === null || _k === void 0 ? void 0 : _k.length})`);
    console.log(`X_CALLBACK_URL: ${process.env.X_CALLBACK_URL || 'NOT_SET'}`);
    return {
        success: true,
        user_uid: authenticatedUser.uid,
        user_email: authenticatedUser.email,
        auth_time: (_l = authenticatedUser.token) === null || _l === void 0 ? void 0 : _l.auth_time,
        functions_version: 'v2',
        authentication_method: context.auth ? 'context.auth' : 'manual_verification',
        env_vars: {
            X_API_KEY: process.env.X_API_KEY ? 'SET' : 'NOT_SET',
            X_API_SECRET: process.env.X_API_SECRET ? 'SET' : 'NOT_SET',
            X_BEARER_TOKEN: process.env.X_BEARER_TOKEN ? 'SET' : 'NOT_SET',
            X_CALLBACK_URL: process.env.X_CALLBACK_URL || 'NOT_SET'
        }
    };
});
//# sourceMappingURL=debug-env.js.map