import { Suspense } from "react";
import SignupClient from "./SignupClient";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-white/70">
          Cargando…
        </div>
      }
    >
      <SignupClient />
    </Suspense>
  );
}