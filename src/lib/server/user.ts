import { currentUser } from "@clerk/nextjs/server";
import { db } from "./db";

export interface SyncedUser {
  id: string;
  email: string;
  displayName: string;
}

/**
 * Upsert the signed-in Clerk user into our `users` table (no webhooks).
 * Returns null when nobody is signed in.
 */
export async function syncUser(): Promise<SyncedUser | null> {
  const user = await currentUser();
  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("Clerk user has no email address. Make email required in the Clerk dashboard.");

  const displayName = user.username ?? user.firstName ?? email.split("@")[0];

  const { error } = await db()
    .from("users")
    .upsert({ id: user.id, email, display_name: displayName }, { onConflict: "id" });
  if (error) throw new Error(`Failed to sync user: ${error.message}`);

  return { id: user.id, email, displayName };
}
