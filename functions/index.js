const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");

admin.initializeApp();

const RETENTION_DAYS = 30;
const BATCH_LIMIT = 500;

exports.cleanupDeletedClients = onSchedule("every day 02:00", async () => {
  const db = admin.firestore();
  const cutoff = admin.firestore.Timestamp.fromMillis(
    Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
  );

  let totalDeleted = 0;

  while (true) {
    const snapshot = await db
      .collection("clients")
      .where("deletedAt", "<=", cutoff)
      .orderBy("deletedAt", "asc")
      .limit(BATCH_LIMIT)
      .get();

    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    totalDeleted += snapshot.size;
  }

  console.log(`cleanupDeletedClients: deleted ${totalDeleted} clients`);
});
