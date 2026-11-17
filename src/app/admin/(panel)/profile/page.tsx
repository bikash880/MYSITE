import type { Metadata } from "next";
import { SingletonForm } from "@/components/admin/singleton-form";
import { getSingleton } from "@/lib/server/repo";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const data = await getSingleton("profile");
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your name, bio, photo, CV and social links.</p>
      </div>
      <SingletonForm kind="profile" initial={data as unknown as Record<string, unknown>} />
    </div>
  );
}
