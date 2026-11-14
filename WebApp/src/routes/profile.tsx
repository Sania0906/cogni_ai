import {
  createFileRoute,
  Link,
  useNavigate,
  redirect,
} from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  Target,
  Settings,
  Shield,
  Bell,
  Moon,
  LogOut,
  ChevronRight,
  User as UserIcon,
  X,
  Edit3,
  Save,
  Phone,
  Bookmark,
  Briefcase as BriefcaseIcon,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Settings — CognifyAI" }] }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [targetJob, setTargetJob] = useState<string>("Software Engineer");
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editHeadline, setEditHeadline] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDegree, setEditDegree] = useState("");
  const [editCollege, setEditCollege] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const openEditModal = () => {
    setEditName(profile?.name || localStorage.getItem("userName") || "");
    setEditHeadline(profile?.headline || profile?.title || "");
    setEditBio(profile?.bio || "");
    setEditPhone(profile?.phone || "");
    setEditDegree(profile?.degree || profile?.academicDetails?.degree || "");
    setEditCollege(profile?.college || profile?.academicDetails?.college || "");
    setIsEditing(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setSavingProfile(true);
    const toastId = toast.loading("Saving profile updates...");
    try {
      const res = await api.updateProfile({
        name: editName.trim(),
        headline: editHeadline.trim(),
        bio: editBio.trim(),
        phone: editPhone.trim(),
        degree: editDegree.trim(),
        college: editCollege.trim(),
        target_role: targetJob.trim(),
      });
      localStorage.setItem("userName", editName.trim());
      setProfile((prev: any) => ({
        ...prev,
        ...res,
        name: editName.trim(),
        degree: editDegree.trim(),
        college: editCollege.trim(),
      }));
      toast.success("Profile updated successfully!", { id: toastId });
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile", { id: toastId });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveTargetRole = async (newRole: string) => {
    if (!newRole.trim()) return;
    try {
      await api.updateProfile({ target_role: newRole.trim() });
    } catch (e) {
      console.warn("Failed to update target role:", e);
    }
  };
  const [stats, setStats] = useState([
    { n: 0, label: "Certificates", color: "bg-gradient-blue", icon: Award },
    { n: 0, label: "Courses", color: "bg-gradient-primary", icon: BookOpen },
    { n: 0, label: "Skills", color: "bg-gradient-pink", icon: Target },
  ]);

  const handleRestoreVersion = async (id: string) => {
    const toastId = toast.loading("Restoring resume version...");
    try {
      await api.restoreResumeVersion(id);
      toast.success("Resume restored successfully!", { id: toastId });

      const data = await api.getProfile();
      setProfile(data);
      const historyData = await api.getResumeHistory().catch(() => []);
      const compData = await api.getResumeComparison().catch(() => null);
      setHistory(historyData);
      setComparison(compData);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to restore resume.", { id: toastId });
    }
  };

  const fetchProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);

      // Populate target role if available
      const savedRole =
        data?.target_role ||
        data?.targetRole ||
        (data?.title && data.title !== "Professional" ? data.title : "") ||
        (data?.interests && data.interests.length > 0 ? data.interests[0] : "");
      if (savedRole) {
        setTargetJob(savedRole);
      }

      const certs = await api.getCertificates().catch(() => []);
      const courses = await api.getMyCourses().catch(() => []);
      const skills = await api.getSkills().catch(() => []);
      const assessmentsData = await api.getAssessments().catch(() => []);
      const historyData = await api.getResumeHistory().catch(() => []);
      const compData = await api.getResumeComparison().catch(() => null);

      setAssessments(assessmentsData);
      setHistory(historyData);
      setComparison(compData);

      setStats([
        {
          n: certs.length,
          label: "Certificates",
          color: "bg-gradient-blue",
          icon: Award,
        },
        {
          n: courses.length,
          label: "Courses",
          color: "bg-gradient-primary",
          icon: BookOpen,
        },
        {
          n: skills.length,
          label: "Skills",
          color: "bg-gradient-pink",
          icon: Target,
        },
      ]);
    } catch (err) {
      console.error("Failed to load profile details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    const handleFocus = () => fetchProfile();
    window.addEventListener("focus", handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchProfile();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const interval = setInterval(fetchProfile, 10000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash === "#resume-section" || window.location.search.includes("resume")) {
        const timer = setTimeout(() => {
          const el = document.getElementById("resume-section");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [loading]);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    toast.success("Signed out successfully");
    navigate({ to: "/login" });
  };

  const displayName =
    profile?.name || localStorage.getItem("userName") || "User";
  const displayEmail = profile?.email || "";

  return (
    <AppShell>
      <h1 className="text-2xl md:text-3xl font-bold">Account & Preferences</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-5">
        Settings & Account
      </p>

      {/* User Account Card */}
      <div
        onClick={openEditModal}
        className="rounded-3xl p-5 bg-card border border-border/60 shadow-card flex items-center justify-between cursor-pointer hover:border-primary/40 transition mb-6 group"
      >
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary overflow-hidden shrink-0">
            {profile?.avatar ? (
              <img
                src={profile.avatar}
                alt="avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <UserIcon className="h-7 w-7 text-primary" />
            )}
          </div>
          <div>
            <p className="text-lg font-bold text-foreground group-hover:text-primary transition">{displayName}</p>
            <p className="text-xs text-muted-foreground">{displayEmail}</p>
            <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold">
              Role: <span className="font-bold ml-1 capitalize">{profile?.role || "user"}</span>
            </div>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition" />
      </div>

      {/* Preferences & Saved Section */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
          Preferences & Saved
        </h2>
        <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden divide-y divide-border/40">
          <button
            type="button"
            onClick={openEditModal}
            className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-muted/30 transition group"
          >
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Shield className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground group-hover:text-primary transition">
                Edit Profile & Details
              </p>
              <p className="text-[11px] text-muted-foreground">
                Manage personal details, degree, college & target role
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
          </button>

          <Link
            to="/saved-jobs"
            className="flex items-center gap-3.5 p-4 hover:bg-muted/30 transition group"
          >
            <div className="h-9 w-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600 shrink-0">
              <Bookmark className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground group-hover:text-primary transition">
                Saved Job Bookmarks
              </p>
              <p className="text-[11px] text-muted-foreground">
                View all bookmarked careers and job applications
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
          </Link>

          <Link
            to="/notifications"
            className="flex items-center gap-3.5 p-4 hover:bg-muted/30 transition group"
          >
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
              <Bell className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground group-hover:text-primary transition">
                Notifications
              </p>
              <p className="text-[11px] text-muted-foreground">
                Stay updated with job alerts and system notices
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
          </Link>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-card border border-border/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-primary" />
                Edit Profile
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted/40 text-muted-foreground transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm font-semibold focus:outline-none focus:border-primary"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">
                  Professional Headline
                </label>
                <input
                  type="text"
                  value={editHeadline}
                  onChange={(e) => setEditHeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm font-semibold focus:outline-none focus:border-primary"
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">
                  Target Role
                </label>
                <input
                  type="text"
                  value={targetJob}
                  onChange={(e) => setTargetJob(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm font-semibold focus:outline-none focus:border-primary"
                  placeholder="e.g. Full Stack Developer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm font-semibold focus:outline-none focus:border-primary"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">
                  Degree / Highest Qualification
                </label>
                <input
                  type="text"
                  value={editDegree}
                  onChange={(e) => setEditDegree(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm font-semibold focus:outline-none focus:border-primary"
                  placeholder="e.g. B.Tech in Computer Science"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">
                  College / University
                </label>
                <input
                  type="text"
                  value={editCollege}
                  onChange={(e) => setEditCollege(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm font-semibold focus:outline-none focus:border-primary"
                  placeholder="e.g. Stanford University"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">
                  Bio
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm font-semibold focus:outline-none focus:border-primary resize-none"
                  placeholder="Tell us a little about your career goals..."
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 rounded-xl bg-muted/40 font-bold text-xs text-muted-foreground hover:bg-muted/60 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-glow hover:bg-primary/90 transition flex items-center justify-center gap-1.5"
                >
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mt-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="p-4 rounded-2xl bg-card shadow-card text-center"
          >
            <div
              className={`h-12 w-12 mx-auto rounded-2xl ${s.color} flex items-center justify-center text-white mb-2`}
            >
              <s.icon className="h-6 w-6" />
            </div>
            <p className="text-2xl font-bold">{s.n}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Resume Status Card */}
      {profile?.resumeDetails && (
        <div id="resume-section" className="scroll-mt-6">
          <div className="rounded-3xl p-5 bg-card shadow-card mt-5 space-y-4 border border-border/10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                📄 Resume Status
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-bold">
                Resume Uploaded Successfully
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-border/40 pb-2">
                <span className="text-xs font-bold text-muted-foreground">
                  Target Role
                </span>
                <input
                  type="text"
                  value={targetJob}
                  onChange={(e) => setTargetJob(e.target.value)}
                  onBlur={() => handleSaveTargetRole(targetJob)}
                  className="font-extrabold text-card-foreground text-xs text-right bg-transparent border-b border-dashed border-border/60 hover:border-primary focus:border-primary focus:outline-none px-1 py-0.5 max-w-[200px]"
                  placeholder="e.g. Software Engineer"
                  title="Target role for ATS scoring. Click to edit."
                />
              </div>
              <div className="flex justify-between items-center text-sm border-b border-border/40 pb-2">
                <span className="text-xs font-bold text-muted-foreground">
                  Filename
                </span>
                <span
                  className="font-extrabold text-card-foreground text-xs truncate max-w-[200px]"
                  title={profile.resumeDetails.file_name}
                >
                  {profile.resumeDetails.file_name || "resume.pdf"}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-border/40 pb-2">
                <span className="text-xs font-bold text-muted-foreground">
                  Upload Date
                </span>
                <span className="font-extrabold text-card-foreground text-xs">
                  {profile.resumeDetails.upload_date
                    ? new Date(
                        profile.resumeDetails.upload_date,
                      ).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-border/40 pb-2">
                <span className="text-xs font-bold text-muted-foreground">
                  ATS Score
                </span>
                <span className="font-extrabold text-card-foreground text-xs">
                  {profile.resumeDetails.ats_score}%
                </span>
              </div>
              <div className="flex justify-between items-center text-sm pb-2">
                <span className="text-xs font-bold text-muted-foreground">
                  Version
                </span>
                <span className="font-extrabold text-card-foreground text-xs">
                  v1.0
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/resume-analysis"
                className="block w-full text-center py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-glow hover:bg-primary/90 transition cursor-pointer"
              >
                View Full Analysis in Resume Tab
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Academic Credentials */}
      {profile?.resumeDetails && (
        <div className="rounded-3xl p-5 bg-card shadow-card mt-5 space-y-4 border border-border/10">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            🎓 Academic Credentials
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">
                Degree
              </p>
              <p className="font-bold text-card-foreground mt-0.5">
                {profile.degree || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">
                Department
              </p>
              <p className="font-bold text-card-foreground mt-0.5">
                {profile.department || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">
                College / University
              </p>
              <p className="font-bold text-card-foreground mt-0.5">
                {profile.college || "N/A"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">
                  CGPA
                </p>
                <p className="font-bold text-card-foreground mt-0.5">
                  {profile.cgpa || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">
                  Grad Year
                </p>
                <p className="font-bold text-card-foreground mt-0.5">
                  {profile.grad_year || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {(profile.linkedin_url || profile.github_url) && (
            <div className="pt-3 border-t border-border/40 flex gap-3">
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2.5 rounded-xl bg-muted/60 text-xs font-bold text-card-foreground hover:bg-muted/80 transition"
                >
                  LinkedIn Profile
                </a>
              )}
              {profile.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2.5 rounded-xl bg-muted/60 text-xs font-bold text-card-foreground hover:bg-muted/80 transition"
                >
                  GitHub Profile
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Resume Version History & Comparison */}
      {history.length > 0 && (
        <div className="rounded-3xl p-5 bg-card shadow-card mt-5 space-y-4 border border-border/10">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            🕒 Resume Evolution Timeline
          </h3>
          <div className="space-y-4 pl-4 border-l-2 border-border/40 relative ml-2">
            {history.map((ver, idx) => (
              <div
                key={ver.id}
                className="flex justify-between items-center text-sm relative border-b border-border/40 pb-3 last:border-0 last:pb-0"
              >
                <div className="absolute -left-[21px] top-2 w-3 h-3 rounded-full bg-primary ring-4 ring-card" />
                <div className="pl-2">
                  <span className="font-extrabold text-card-foreground text-sm flex items-center gap-2">
                    Version {history.length - idx}
                    {idx === 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] uppercase font-bold">
                        Latest
                      </span>
                    )}
                    {ver.metadata?.restored_from && (
                      <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-500 text-[9px] uppercase font-bold">
                        Restored
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-bold text-muted-foreground block mt-0.5">
                    {new Date(ver.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="text-xs font-bold text-muted-foreground">
                    ATS Score
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-extrabold text-sm ${ver.metadata?.ats_score >= 80 ? "text-success" : "text-primary"}`}
                    >
                      {ver.metadata?.ats_score || "N/A"}%
                    </span>
                    {idx > 0 && (
                      <button
                        onClick={() => handleRestoreVersion(ver.id)}
                        className="text-[10px] bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1 rounded-md font-bold transition border-0 cursor-pointer"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {comparison?.canCompare && (
            <div className="mt-4 pt-4 border-t border-border/40">
              <h4 className="text-sm font-bold text-card-foreground mb-3">
                Latest Upload Improvements
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-success/10 border border-success/20">
                  <span className="text-[10px] font-bold text-success uppercase block mb-1">
                    ATS Score
                  </span>
                  <span className="text-sm font-extrabold text-success">
                    {comparison.atsImprovement > 0 ? "+" : ""}
                    {comparison.atsImprovement}%
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <span className="text-[10px] font-bold text-primary uppercase block mb-1">
                    Added Skills
                  </span>
                  <span className="text-xs font-extrabold text-primary">
                    {comparison.addedSkills?.length || 0} New
                  </span>
                </div>
              </div>

              {comparison.addedSkills?.length > 0 && (
                <div className="mt-3 text-xs">
                  <span className="font-bold text-muted-foreground">
                    New Skills:{" "}
                  </span>
                  <span className="font-bold text-card-foreground">
                    {comparison.addedSkills.join(", ")}
                  </span>
                </div>
              )}
              {comparison.removedSkills?.length > 0 && (
                <div className="mt-2 text-xs">
                  <span className="font-bold text-muted-foreground">
                    Removed Skills:{" "}
                  </span>
                  <span className="font-bold text-destructive">
                    {comparison.removedSkills.join(", ")}
                  </span>
                </div>
              )}
              {comparison.newProjects?.length > 0 && (
                <div className="mt-2 text-xs">
                  <span className="font-bold text-muted-foreground">
                    New Projects:{" "}
                  </span>
                  <span className="font-bold text-card-foreground">
                    {comparison.newProjects.length} Added
                  </span>
                </div>
              )}
              {comparison.newCertifications?.length > 0 && (
                <div className="mt-2 text-xs">
                  <span className="font-bold text-muted-foreground">
                    New Certifications:{" "}
                  </span>
                  <span className="font-bold text-card-foreground">
                    {comparison.newCertifications.length} Added
                  </span>
                </div>
              )}
              {comparison.missingSections?.length > 0 && (
                <div className="mt-2 text-xs p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <span className="font-bold text-destructive flex items-center gap-1 mb-1">
                    ⚠️ Missing Sections
                  </span>
                  <span className="font-semibold text-card-foreground">
                    {comparison.missingSections.join(", ")}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleSignOut}
        className="mt-6 flex items-center justify-center gap-2 w-full h-14 rounded-2xl bg-destructive/10 text-destructive font-bold cursor-pointer hover:bg-destructive/15 border border-destructive/20 transition"
      >
        <LogOut className="h-5 w-5" /> Sign Out
      </button>
    </AppShell>
  );
}
