import { createFileRoute } from "@tanstack/react-router";
import { Award, Download, Share2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/certificates")({
  head: () => ({ meta: [{ title: "Certificates — CognifyAI" }] }),
  component: Certificates,
});

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

function Certificates() {
  const [certsList, setCertsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCerts() {
      try {
        const data = await api.getCertificates();
        setCertsList(data);
      } catch (err) {
        console.error("Failed to load certificates", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCerts();
  }, []);

  return (
    <AppShell>
      <PageHeader title="Certificates" back="/profile" />
      
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground -mt-3 mb-5">{certsList.length} earned credentials</p>
          <div className="space-y-4">
            {certsList.length > 0 ? (
              certsList.map((c) => (
                <div key={c._id || c.title} className={`rounded-3xl p-6 ${c.color || "bg-gradient-primary"} text-white shadow-glow`}>
                  <Award className="h-8 w-8 mb-3" />
                  <p className="text-xs text-white/80 uppercase tracking-wider">Certificate</p>
                  <h2 className="text-xl font-bold mt-1">{c.title}</h2>
                  <p className="text-sm text-white/80 mt-2">Issued {c.issued}</p>
                  <div className="flex gap-2 mt-5">
                    <button className="flex-1 py-2 rounded-xl bg-white/20 backdrop-blur text-sm font-semibold flex items-center justify-center gap-1.5 border-0 text-white cursor-pointer hover:bg-white/25">
                      <Download className="h-4 w-4" /> Download
                    </button>
                    <button className="flex-1 py-2 rounded-xl bg-white/20 backdrop-blur text-sm font-semibold flex items-center justify-center gap-1.5 border-0 text-white cursor-pointer hover:bg-white/25">
                      <Share2 className="h-4 w-4" /> Share
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No certificates earned yet.</p>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
