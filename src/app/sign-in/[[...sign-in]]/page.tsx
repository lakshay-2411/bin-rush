import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Suspense fallback={<div className="h-96 w-full max-w-sm animate-pulse rounded-3xl bg-white/70" />}>
        <SignIn />
      </Suspense>
    </main>
  );
}
