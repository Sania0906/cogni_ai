import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Award, Download, Share2, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/certificates")({
  head: () => ({ meta: [{ title: "Certificates — CognifyAI" }] }),
  component: Certificates,
});

function Certificates() {
  const [certsList, setCertsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCerts() {
      try {
        setLoading(true);
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

  const handleDownload = async (cert: any) => {
    const certId = cert.id || cert._id || "cert";
    try {
      setDownloadingId(certId);
      const data = await api.downloadCertificate(certId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cognify_certificate_${certId}.json`;
      a.click();
    } catch (err) {
      console.error("Failed to download certificate", err);
    } finally {
      setTimeout(() => setDownloadingId(null), 1000);
    }
  };

  const handleShare = async (cert: any) => {
    const certId = cert.id || cert._id || "cert";
    try {
      const res = await api.shareCertificate(certId);
      const shareUrl = res?.shareUrl || `https://cognify.ai/verify/cert/${certId}`;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopiedId(certId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to share certificate", err);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Certificates" back="/profile" />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground -mt-3 mb-5">
            {certsList.length} verified credentials issued
          </p>
          <div className="space-y-4">
            {certsList.length > 0 ? (
              certsList.map((c) => {
                const certId = c.id || c._id || c.title;
                const isCopied = copiedId === certId;
                const isDownloading = downloadingId === certId;

                return (
                  <div
                    key={certId}
                    className={`rounded-3xl p-6 ${c.color || "bg-gradient-primary"} text-white shadow-glow`}
                  >
                    <Award className="h-8 w-8 mb-3 text-white" />
                    <p className="text-xs text-white/80 uppercase tracking-wider font-semibold">
                      Verified Credential
                    </p>
                    <h2 className="text-xl font-bold mt-1 text-white">{c.title}</h2>
                    <p className="text-xs text-white/80 mt-1">
                      ID: {c.credentialId || `COG-CERT-${String(certId).slice(0, 8).toUpperCase()}`}
                    </p>
                    <p className="text-sm text-white/80 mt-2">
                      Issued {c.issued} · {c.issuer || "CognifyAI Academy"}
                    </p>
                    <div className="flex gap-2 mt-5">
                      <button
                        onClick={() => handleDownload(c)}
                        disabled={isDownloading}
                        className="flex-1 py-2.5 rounded-xl bg-white/20 backdrop-blur text-sm font-semibold flex items-center justify-center gap-1.5 border-0 text-white cursor-pointer hover:bg-white/25 transition-all"
                      >
                        {isDownloading ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" /> Exported
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" /> Download
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleShare(c)}
                        className="flex-1 py-2.5 rounded-xl bg-white/20 backdrop-blur text-sm font-semibold flex items-center justify-center gap-1.5 border-0 text-white cursor-pointer hover:bg-white/25 transition-all"
                      >
                        {isCopied ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" /> Link Copied!
                          </>
                        ) : (
                          <>
                            <Share2 className="h-4 w-4" /> Share
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No certificates earned yet. Complete all lessons in a course to earn credentials.
              </p>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
