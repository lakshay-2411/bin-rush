import { Show } from "@clerk/nextjs";
import Link from "next/link";
import { Suspense } from "react";
import { BuddiesCard } from "@/components/BuddiesCard";
import { HomeDashboard, HomeSkeleton } from "@/components/HomeDashboard";
import { HowToPlay, PageShell, primaryButton, secondaryButton } from "@/components/ui";

export default function Home() {
  return (
    <PageShell nav="home">
      {/* Auth state is request-time data, so it streams in behind a Suspense boundary. */}
      <Suspense fallback={<HomeSkeleton />}>
        <Show when="signed-in">
          <HomeDashboard />
        </Show>
        <Show when="signed-out">
          <SignedOutHome />
        </Show>
      </Suspense>
    </PageShell>
  );
}

function SignedOutHome() {
  return (
    <>
      <header className="flex flex-col">
        <span className="text-muted">A 60-second daily game</span>
        <h1 className="text-[32px] leading-tight font-bold">Bin Rush</h1>
      </header>

      <BuddiesCard message="Hi! We're the bin buddies. Help us segregate today's 20 items." />

      <Link href="/sign-up" className={primaryButton}>
        Sign up to play today
      </Link>
      <p className="text-center text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-accent-dark underline">
          Sign in
        </Link>
      </p>
      <Link href="/practice" className={secondaryButton}>
        Try a practice round
      </Link>

      <HowToPlay />
    </>
  );
}
