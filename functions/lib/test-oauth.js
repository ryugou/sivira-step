"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const oauth_1 = require("oauth");
const dotenv = require("dotenv");
// .envファイルを読み込み
dotenv.config();
const createTwitterOAuth = () => {
    const apiKey = process.env.X_API_KEY;
    const apiSecret = process.env.X_API_SECRET;
    const callbackUrl = process.env.X_CALLBACK_URL || 'https://us-central1-sivira-step.cloudfunctions.net/handleSNSCallback/x';
    console.log('API Key (first 10 chars):', apiKey === null || apiKey === void 0 ? void 0 : apiKey.substring(0, 10));
    console.log('API Secret (first 10 chars):', apiSecret === null || apiSecret === void 0 ? void 0 : apiSecret.substring(0, 10));
    console.log('Callback URL:', callbackUrl);
    return new oauth_1.OAuth('https://api.twitter.com/oauth/request_token', 'https://api.twitter.com/oauth/access_token', apiKey || '', apiSecret || '', '1.0A', callbackUrl, 'HMAC-SHA1');
};
// OAuth テスト
const oauth = createTwitterOAuth();
console.log('Testing OAuth request token...');
oauth.getOAuthRequestToken((error, oauthToken, oauthTokenSecret, results) => {
    if (error) {
        console.error('OAuth Error:', error);
    }
    else {
        console.log('Success!');
        console.log('OAuth Token:', oauthToken);
        console.log('OAuth Token Secret:', oauthTokenSecret);
        console.log('Results:', results);
        const authUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=${oauthToken}`;
        console.log('Auth URL:', authUrl);
    }
});
//# sourceMappingURL=test-oauth.js.map