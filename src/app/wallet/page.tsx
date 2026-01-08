"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let channel: any;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Cargar balance inicial
      const { data } = await supabase
        .from("balances")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      setBalance(data?.balance ?? 0);

      // Realtime
      channel = supabase
        .channel("wallet-balance")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "balances",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setBalance(payload.new.balance);
          }
        )
        .subscribe();
    }

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#06070b] p-6 text-white">
      <div className="mx-auto max-w-md rounded-3xl bg-white/[0.04] p-6 backdrop-blur-xl">
        <h1 className="text-xl font-black">Wallet</h1>

        <div className="mt-6 rounded-2xl bg-black/30 p-5 text-center">
          <div className="text-sm text-white/50">Balance</div>
          <div className="mt-2 text-4xl font-black">
            ${balance?.toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-white/40">
            Actualización en tiempo real
          </div>
        </div>
      </div>
    </div>
  );
}