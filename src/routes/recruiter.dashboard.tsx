import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Bookmark,
  BookmarkCheck,
  Download,
  Users,
  SlidersHorizontal,
  ArrowRight,
  Activity,
  ShieldCheck,
  X,
} from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/recruiter/dashboard")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Recruiter Dashboard — CognifyAI" }] }),
  component: RecruiterDashboard,
});

function RecruiterDashboard() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [minExp, setMinExp] = useState(0);

  // Compare Modal State
  const [selectedForCompare, setSelectedForCompare] = useState<any[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const data = await api.getRecruiterCandidates(skillFilter, minExp);
      setCandidates(data);
    } catch (err) {
      toast.error("Failed to fetch candidates");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShortlist = async (candidateId: string) => {
    try {
      const res = await api.toggleShortlist(candidateId);
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidateId ? { ...c, is_shortlisted: res.shortlisted } : c,
        ),
      );
      toast.success(
        res.shortlisted ? "Candidate Shortlisted" : "Removed from Shortlist",
      );
    } catch (err) {
      toast.error("Failed to update shortlist");
    }
  };

  const handleToggleCompare = (candidate: any) => {
    setSelectedForCompare((prev) => {
      const exists = prev.find((p) => p.id === candidate.id);
      if (exists) return prev.filter((p) => p.id !== candidate.id);
      if (prev.length >= 3) {
        toast.error("You can only compare up to 3 candidates at once.");
        return prev;
      }
      return [...prev, candidate];
    });
  };

  const downloadReport = () => {
    const shortlisted = candidates.filter((c) => c.is_shortlisted);
    if (shortlisted.length === 0) {
      toast.error("No candidates shortlisted to report.");
      return;
    }

    let csv = "Name,Email,Job Title,ATS Score,Experience (Years)\n";
    shortlisted.forEach((c) => {
      csv += `"${c.name}","${c.email}","${c.current_job_title}","${c.ats_score}","${c.experience_years}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "shortlisted_candidates.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Report Downloaded");
  };

  const filteredCandidates = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.current_job_title &&
        c.current_job_title.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <AdminShell title="Recruiter Dashboard">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search candidates by name or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 rounded-2xl bg-card shadow-card pl-11 pr-4 text-sm font-medium border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              if (selectedForCompare.length > 1) setShowCompareModal(true);
              else toast.error("Select at least 2 candidates to compare.");
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all ${selectedForCompare.length > 1 ? "bg-primary text-white border-primary shadow-glow" : "bg-card text-muted-foreground border-border"}`}
          >
            <Users className="h-4 w-4" />
            Compare ({selectedForCompare.length})
          </button>
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card text-card-foreground border border-border font-bold text-sm hover:bg-muted/50 transition-colors"
          >
            <Download className="h-4 w-4 text-primary" />
            Export
          </button>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-card shadow-card rounded-2xl p-5 mb-6 border border-border/50 flex flex-col md:flex-row gap-5 items-center">
        <div className="flex items-center gap-3 text-muted-foreground font-semibold text-sm mr-4 shrink-0">
          <SlidersHorizontal className="h-4 w-4" />
          Advanced Filters
        </div>
        <div className="flex-1 w-full flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Target Skills
            </label>
            <input
              type="text"
              placeholder="e.g. React, Node.js"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              onBlur={fetchCandidates}
              onKeyDown={(e) => e.key === "Enter" && fetchCandidates()}
              className="w-full bg-muted/40 rounded-xl px-4 py-2.5 text-sm border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="w-full md:w-48">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex justify-between">
              <span>Min. Experience</span>
              <span className="text-primary">{minExp} yrs</span>
            </label>
            <input
              type="range"
              min="0"
              max="15"
              value={minExp}
              onChange={(e) => {
                setMinExp(Number(e.target.value));
              }}
              onMouseUp={fetchCandidates}
              onTouchEnd={fetchCandidates}
              className="w-full accent-primary mt-1"
            />
          </div>
        </div>
      </div>

      {/* Candidates Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground font-medium">
          No candidates match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCandidates.map((c) => {
            const isComparing = selectedForCompare.some((p) => p.id === c.id);
            return (
              <div
                key={c.id}
                className={`bg-card shadow-card rounded-2xl p-5 border-2 transition-all ${isComparing ? "border-primary" : "border-transparent"} hover:-translate-y-1`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-primary text-white flex items-center justify-center font-bold text-lg shrink-0">
                      {c.name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-card-foreground leading-tight">
                        {c.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {c.current_job_title || "Software Engineer"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleShortlist(c.id)}
                    className="p-2 -mr-2 -mt-2 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    {c.is_shortlisted ? (
                      <BookmarkCheck className="h-5 w-5 text-primary fill-primary/20" />
                    ) : (
                      <Bookmark className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-muted/30 rounded-xl p-3 border border-border/40">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                      ATS Score
                    </p>
                    <div className="flex items-end gap-1">
                      <span className="text-xl font-extrabold text-card-foreground leading-none">
                        {c.ats_score}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium pb-0.5">
                        / 100
                      </span>
                    </div>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3 border border-border/40">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                      Experience
                    </p>
                    <div className="flex items-end gap-1">
                      <span className="text-xl font-extrabold text-card-foreground leading-none">
                        {c.experience_years}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium pb-0.5">
                        Years
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-5">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
                    Top Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.skills.slice(0, 5).map((s: string) => (
                      <span
                        key={s}
                        className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-bold"
                      >
                        {s}
                      </span>
                    ))}
                    {c.skills.length > 5 && (
                      <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-[10px] font-bold">
                        +{c.skills.length - 5}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleToggleCompare(c)}
                  className={`w-full py-2.5 rounded-xl font-bold text-sm transition-colors border ${isComparing ? "bg-primary/10 text-primary border-primary/30" : "bg-card text-card-foreground border-border hover:bg-muted/50"}`}
                >
                  {isComparing ? "Remove from Compare" : "Select to Compare"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Compare Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in bg-background/80 backdrop-blur-sm">
          <div className="bg-card w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in slide-in-from-bottom-8">
            <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Compare Candidates</h2>
                  <p className="text-xs text-muted-foreground">
                    Evaluating {selectedForCompare.length} candidates
                    side-by-side
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-2 rounded-full hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedForCompare.map((c) => (
                  <div
                    key={c.id}
                    className="border-2 border-border/50 rounded-2xl p-5 flex flex-col relative overflow-hidden"
                  >
                    {c.ats_score > 85 && (
                      <div className="absolute top-0 right-0 bg-success text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                        Top Match
                      </div>
                    )}

                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-16 w-16 rounded-full bg-gradient-primary text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-lg">
                        {c.name[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight">
                          {c.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {c.current_job_title}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6 flex-1">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold uppercase text-muted-foreground">
                            ATS Score
                          </span>
                          <span className="text-lg font-black text-primary">
                            {c.ats_score}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${c.ats_score}%` }}
                          />
                        </div>
                      </div>

                      <div className="border-t border-border/50 pt-4">
                        <span className="text-xs font-bold uppercase text-muted-foreground mb-3 block">
                          Core Metrics
                        </span>
                        <div className="flex justify-between items-center bg-muted/30 p-3 rounded-xl mb-2">
                          <span className="text-sm font-medium">
                            Experience
                          </span>
                          <span className="text-sm font-bold">
                            {c.experience_years} Years
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-muted/30 p-3 rounded-xl">
                          <span className="text-sm font-medium">
                            Shortlisted
                          </span>
                          <span className="text-sm font-bold">
                            {c.is_shortlisted ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-border/50 pt-4">
                        <span className="text-xs font-bold uppercase text-muted-foreground mb-3 block">
                          Skills Match
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {c.skills.slice(0, 8).map((s: string) => (
                            <span
                              key={s}
                              className="px-2.5 py-1 rounded-lg bg-card border border-border shadow-sm text-xs font-semibold"
                            >
                              {s}
                            </span>
                          ))}
                          {c.skills.length > 8 && (
                            <span className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-bold">
                              +{c.skills.length - 8}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleShortlist(c.id)}
                      className={`w-full mt-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] ${c.is_shortlisted ? "bg-card text-primary border-2 border-primary/30" : "bg-primary text-white"}`}
                    >
                      {c.is_shortlisted ? (
                        <BookmarkCheck className="h-4 w-4" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                      {c.is_shortlisted ? "Shortlisted" : "Add to Shortlist"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
