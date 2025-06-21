import * as dotenv from "dotenv";

dotenv.config();
console.log("=== Environment Variables Test ===\n");

function testEnvVar(varName: string, required: boolean = true) {
  const value = process.env[varName];
  const status = value ? "✅ SET" : required ? "❌ MISSING" : "⚠️  OPTIONAL";
  const displayValue = value ? "***HIDDEN***" : "undefined";
  
  console.log(`${status} ${varName}: ${displayValue}`);
}

console.log("📋 X (Twitter) API Configuration:");
testEnvVar("X_API_KEY");
testEnvVar("X_API_SECRET");
testEnvVar("X_CLIENT_ID");
testEnvVar("X_CLIENT_SECRET");
testEnvVar("X_BEARER_TOKEN");

console.log("\n📋 Instagram API Configuration:");
testEnvVar("INSTAGRAM_CLIENT_ID", false);
testEnvVar("INSTAGRAM_CLIENT_SECRET", false);

console.log("\n📋 Threads API Configuration:");
testEnvVar("THREADS_CLIENT_ID", false);
testEnvVar("THREADS_CLIENT_SECRET", false);

console.log("\n📋 TikTok API Configuration:");
testEnvVar("TIKTOK_CLIENT_ID", false);
testEnvVar("TIKTOK_CLIENT_SECRET", false);

console.log("\n📋 Application Configuration:");
testEnvVar("NFT_URL");
testEnvVar("X_CALLBACK_URL", false);

console.log("\n=== Test Summary ===");
console.log("✅ 環境変数の読み込みテストが完了しました");
console.log("📝 実際の値を設定するには:");
console.log("   1. functions/.env.sample を functions/.env にコピー");
console.log("   2. 実際のAPIキー等の値を設定");
console.log("   3. 再度このテストを実行して確認");

console.log("\n🔗 詳細な設定ガイド:");
console.log("   docs/env-setup-guide.md を参照してください");