import type { Metadata } from "next";
import { MessagesInbox } from "@/components/admin/messages-inbox";
import { listMessages } from "@/lib/server/repo";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const messages = await listMessages();
  return <MessagesInbox messages={messages} />;
}
