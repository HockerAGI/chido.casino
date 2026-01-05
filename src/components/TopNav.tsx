"use client";

import Link from "next/link";

export default function TopNav() {
  return (
    <div className="sticky top-0 z-50 border-b border-white/5 bg-chido-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-black tracking-tight">
          <span className="text-chido-cyan drop-shadow-[0_0_12px_rgba(0,240,255,0.55)]">CHIDO</span>{" "}
          <span className="text-chido-red drop-shadow-[0_0_12px_rgba(255,61,0,0.55)]">CASINO</span>
        </Link>

        <Link
          href="/wallet"
          className="rounded-full bg-chido-green px-4 py-2 text-sm font-extrabold text-black shadow-neon-green active:scale-95"
        >
          Wallet
        </Link>
      </div>
    </div>
  );
}