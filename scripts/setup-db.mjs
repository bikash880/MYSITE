// npm run db:setup — creates indexes and the default profile/settings documents. Safe to re-run.
import { connect, DEFAULT_PROFILE, DEFAULT_SETTINGS, ensureIndexes } from "./_db.mjs";

const { client, db } = await connect();
try {
  await ensureIndexes(db);
  const now = new Date();
  await db.collection("profile").updateOne(
    { _id: "main" },
    { $setOnInsert: { ...DEFAULT_PROFILE, updated_at: now } },
    { upsert: true },
  );
  await db.collection("settings").updateOne(
    { _id: "main" },
    { $setOnInsert: { ...DEFAULT_SETTINGS, updated_at: now } },
    { upsert: true },
  );
  console.log(`✔ Database "${db.databaseName}" is ready (indexes + default profile/settings).`);
} finally {
  await client.close();
}
