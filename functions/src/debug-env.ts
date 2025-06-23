import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Firebase Functions v2 対応の認証テスト関数
export const debugEnv = functions.https.onCall(async (data: any, context: any) => {
  // 認証状態を詳しくログ出力
  console.log('[debugEnv] === Authentication Debug ===');
  console.log('[debugEnv] Firebase Functions version: v2');
  console.log('[debugEnv] Request headers:', context.rawRequest?.headers);
  console.log('[debugEnv] Authorization header:', context.rawRequest?.headers?.authorization);
  console.log('[debugEnv] context object keys:', Object.keys(context));
  console.log('[debugEnv] context.auth:', context.auth);
  console.log('[debugEnv] context.auth type:', typeof context.auth);
  console.log('[debugEnv] context.auth.uid:', context.auth?.uid);
  console.log('[debugEnv] context.auth.token:', context.auth?.token);
  console.log('[debugEnv] context.instanceIdToken:', context.instanceIdToken);
  
  // Firebase Functions v2での認証処理を手動で実行
  let authenticatedUser = null;
  
  if (!context.auth || !context.auth.uid) {
    console.log('[debugEnv] context.auth is missing, trying manual verification...');
    
    // Authorization headerから手動でトークンを取得
    const authHeader = context.rawRequest?.headers?.authorization;
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
      } catch (error) {
        console.error('[debugEnv] Token verification failed:', error);
        throw new functions.https.HttpsError("unauthenticated", "Invalid authentication token");
      }
    } else {
      console.error('[debugEnv] No authorization header found');
      throw new functions.https.HttpsError("unauthenticated", "No authentication token provided");
    }
  } else {
    console.log('[debugEnv] Using context.auth');
    authenticatedUser = context.auth;
  }

  console.log('[debugEnv] Authentication successful for user:', authenticatedUser.uid);
  console.log('[debugEnv] User email:', authenticatedUser.email);
  console.log('[debugEnv] User token claims:', authenticatedUser.token);
  console.log('[debugEnv] Environment variables check:');
  console.log(`X_API_KEY: ${process.env.X_API_KEY ? 'SET' : 'NOT_SET'} (length: ${process.env.X_API_KEY?.length})`);
  console.log(`X_API_SECRET: ${process.env.X_API_SECRET ? 'SET' : 'NOT_SET'} (length: ${process.env.X_API_SECRET?.length})`);
  console.log(`X_BEARER_TOKEN: ${process.env.X_BEARER_TOKEN ? 'SET' : 'NOT_SET'} (length: ${process.env.X_BEARER_TOKEN?.length})`);
  console.log(`X_CALLBACK_URL: ${process.env.X_CALLBACK_URL || 'NOT_SET'}`);

  return {
    success: true,
    user_uid: authenticatedUser.uid,
    user_email: authenticatedUser.email,
    auth_time: authenticatedUser.token?.auth_time,
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