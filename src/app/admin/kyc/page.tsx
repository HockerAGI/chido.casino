"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

type KycRequest = {
  id: string;
  user_id: string;
  status: string;
  submitted_at: string;
  id_front_path: string;
  id_back_path?: string;
  selfie_path?: string;
  profiles: {
    username: string;
    email: string;
  } | null;
};

export default function AdminKycPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [requests, setRequests] = useState<KycRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kyc/pending");
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to fetch data");
      }
      setRequests(json.requests || []);
    } catch (e: any) {
      setError(e.message);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPublicUrl = (path: string | undefined | null) => {
    if (!path) return "#";
    const { data } = supabase.storage.from("kyc").getPublicUrl(path);
    return data.publicUrl || "#";
  };

  const handleUpdateRequest = async (userId: string, status: "approved" | "rejected") => {
    try {
      const res = await fetch("/api/admin/users/set-kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, kyc_status: status }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Failed to set status to ${status}`);
      }
      await fetchRequests();
    } catch (e: any) {
      alert(`Error updating request: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black">KYC Requests</h1>
          <Button onClick={fetchRequests} disabled={loading} variant="secondary">
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Error: {error}
          </p>
        )}

        <div className="bg-black/30 border border-white/10 rounded-2xl">
          {loading ? (
            <p className="p-6 text-center text-white/60">Loading requests...</p>
          ) : requests.length === 0 ? (
            <p className="p-6 text-center text-white/60">No pending KYC requests.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {requests.map((req) => (
                <div key={req.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <p className="font-bold">{req.profiles?.username || "(No username)"}</p>
                    <p className="text-sm text-white/60 font-mono">{req.profiles?.email}</p>
                    <p className="text-xs text-white/40 font-mono">User ID: {req.user_id}</p>
                    <p className="text-xs text-white/40">Submitted: {new Date(req.submitted_at).toLocaleString()}</p>
                  </div>

                  <div className="flex-1 flex items-center gap-3">
                    <a href={getPublicUrl(req.id_front_path)} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline">ID Front</Button>
                    </a>
                    {req.id_back_path && (
                      <a href={getPublicUrl(req.id_back_path)} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline">ID Back</Button>
                      </a>
                    )}
                    {req.selfie_path && (
                      <a href={getPublicUrl(req.selfie_path)} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline">Selfie</Button>
                      </a>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button variant="destructive" onClick={() => handleUpdateRequest(req.user_id, "rejected")}>
                      Reject
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleUpdateRequest(req.user_id, "approved")}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
