import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

export const runHashtagDM = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User not authenticated");
  }

  const uid = context.auth.uid;
  const { hashtag_id } = data;

  if (!hashtag_id) {
    throw new functions.https.HttpsError("invalid-argument", "hashtag_id is required");
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

export const runReplyDM = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User not authenticated");
  }

  const uid = context.auth.uid;
  const { post_id } = data;

  if (!post_id) {
    throw new functions.https.HttpsError("invalid-argument", "post_id is required");
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