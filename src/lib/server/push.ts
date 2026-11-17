import "server-only";
import { getDb } from "./db";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Sends an Expo push notification about a new contact message to every registered admin device. */
export async function sendNewMessagePush(message: { id: string; name: string; subject: string }) {
  const db = await getDb();
  const tokens = await db.collection("push_tokens").find({}, { projection: { token: 1 } }).toArray();
  if (!tokens.length) return;

  const payload = tokens.map((t) => ({
    to: t.token as string,
    title: `New message from ${message.name.slice(0, 60)}`,
    body: message.subject.slice(0, 120),
    sound: "default",
    priority: "high",
    channelId: "messages",
    data: { messageId: message.id, url: `/admin/messages/${message.id}` },
  }));

  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  // Optional: Expo "enhanced push security" access token.
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

  // Expo accepts up to 100 messages per request.
  for (let i = 0; i < payload.length; i += 100) {
    const res = await fetch(EXPO_PUSH_URL, { method: "POST", headers, body: JSON.stringify(payload.slice(i, i + 100)) });
    const json = (await res.json().catch(() => null)) as { data?: { status: string; details?: { error?: string } }[] } | null;

    // Remove tokens for uninstalled apps so we stop sending to them.
    const dead = (json?.data ?? [])
      .map((r, idx) => (r.details?.error === "DeviceNotRegistered" ? payload[i + idx]!.to : null))
      .filter(Boolean) as string[];
    if (dead.length) await db.collection("push_tokens").deleteMany({ token: { $in: dead } });
  }
}
