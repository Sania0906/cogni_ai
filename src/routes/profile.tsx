import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { Award, BookOpen, Target, Settings, Shield, Bell, Moon, LogOut, ChevronRight, User as UserIcon, Upload } from "lucide-react";
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
  head: () => ({ meta: [{ title: "Profile — CognifyAI" }] }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replacing, setReplacing] = useState(false);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [stats, setStats] = useState([
    { n: 0, label: "Certificates", color: "bg-gradient-blue", icon: Award },
    { n: 0, label: "Courses", color: "bg-gradient-primary", icon: BookOpen },
    { n: 0, label: "Skills", color: "bg-gradient-pink", icon: Target },
  ]);

  const handleReplaceResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setReplacing(true);
      const toastId = toast.loading("Uploading and analyzing new resume...");
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("targetJob", "Senior Data Scientist");

        await api.optimizeResume(formData);
        toast.success("Resume updated successfully!", { id: toastId });
        
        // Refetch profile details
        const data = await api.getProfile();
        setProfile(data);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to replace resume.", { id: toastId });
      } finally {
        setReplacing(false);
      }
    }
  };

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await api.getProfile();
        setProfile(data);

        const certs = await api.getCertificates().catch(() => []);
        const courses = await api.getMyCourses().catch(() => []);
        const skills = await api.getSkills().catch(() => []);
        const assessmentsData = await api.getAssessments().catch(() => []);

        setAssessments(assessmentsData);

        setStats([
          { n: certs.length, label: "Certificates", color: "bg-gradient-blue", icon: Award },
          { n: courses.length, label: "Courses", color: "bg-gradient-primary", icon: BookOpen },
          { n: skills.length, label: "Skills", color: "bg-gradient-pink", icon: Target },
        ]);
      } catch (err) {
        console.error("Failed to load profile details", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    toast.success("Signed out successfully");
    navigate({ to: "/login" });
  };

  const displayName = profile?.name || localStorage.getItem("userName") || "User";
  const displayEmail = profile?.email || "";

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Profile</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-5">Manage your account and preferences</p>

      <div className="rounded-3xl p-5 bg-gradient-primary text-white shadow-glow">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center overflow-hidden">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <UserIcon className="h-8 w-8" />
            )}
          </div>
          <div>
            <p className="text-xl font-bold">{displayName}</p>
            <p className="text-sm text-white/80">{displayEmail}</p>
          </div>
        </div>
        <Link 
          to="/settings/account" 
          className="block w-full text-center py-3.5 mt-4 rounded-xl bg-white/20 backdrop-blur border border-white/30 font-bold text-sm text-white"
        >
          Edit Profile
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-5">
        {stats.map((s) => (
          <div key={s.label} className="p-4 rounded-2xl bg-card shadow-card text-center">
            <div className={`h-12 w-12 mx-auto rounded-2xl ${s.color} flex items-center justify-center text-white mb-2`}>
              <s.icon className="h-6 w-6" />
            </div>
            <p className="text-2xl font-bold">{s.n}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Resume Status Card */}
      {profile?.resumeDetails ? (
        <div className="rounded-3xl p-5 bg-card shadow-card mt-5 space-y-4 border border-border/10">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            📄 Resume Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Status</span>
              <span className="px-2.5 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-bold">
                Resume Uploaded Successfully
              </span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-border/40 pb-2">
              <span className="text-xs font-bold text-muted-foreground">Filename</span>
              <span className="font-extrabold text-card-foreground text-xs truncate max-w-[200px]" title={profile.resumeDetails.file_name}>
                {profile.resumeDetails.file_name || "resume.pdf"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-border/40 pb-2">
              <span className="text-xs font-bold text-muted-foreground">Upload Date</span>
              <span className="font-extrabold text-card-foreground text-xs">
                {profile.resumeDetails.upload_date
                  ? new Date(profile.resumeDetails.upload_date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-border/40 pb-2">
              <span className="text-xs font-bold text-muted-foreground">ATS Score</span>
              <span className="font-extrabold text-card-foreground text-xs">
                {profile.resumeDetails.ats_score}%
              </span>
            </div>
            <div className="flex justify-between items-center text-sm pb-2">
              <span className="text-xs font-bold text-muted-foreground">Version</span>
              <span className="font-extrabold text-card-foreground text-xs">v1.0</span>
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <Link
              to="/resume-analysis"
              className="flex-1 text-center py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-glow flex items-center justify-center cursor-pointer"
            >
              View Resume Analysis
            </Link>
            <label
              className="flex-1 text-center py-2.5 rounded-xl bg-muted/60 text-xs font-bold text-card-foreground hover:bg-muted/80 transition cursor-pointer border-0 flex items-center justify-center"
            >
              Replace Resume
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                disabled={replacing}
                onChange={handleReplaceResume}
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl p-5 bg-card shadow-card mt-5 text-center border border-dashed border-border/40 space-y-4">
          <p className="text-sm font-semibold text-muted-foreground">No resume has been uploaded yet.</p>
          <label className="inline-block px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-glow cursor-pointer">
            Upload Resume
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              disabled={replacing}
              onChange={handleReplaceResume}
            />
          </label>
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
              <p className="text-xs text-muted-foreground font-semibold">Degree</p>
              <p className="font-bold text-card-foreground mt-0.5">{profile.degree || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Department</p>
              <p className="font-bold text-card-foreground mt-0.5">{profile.department || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">College / University</p>
              <p className="font-bold text-card-foreground mt-0.5">{profile.college || "N/A"}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">CGPA</p>
                <p className="font-bold text-card-foreground mt-0.5">{profile.cgpa || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Grad Year</p>
                <p className="font-bold text-card-foreground mt-0.5">{profile.grad_year || "N/A"}</p>
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

      <Link
        to="/settings"
        className="mt-6 flex items-center justify-between p-4 rounded-2xl bg-card shadow-card border border-border/10 hover:bg-muted/30 transition-all font-semibold"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white">
            <Settings className="h-5 w-5" />
          </div>
          <span className="text-sm font-bold text-card-foreground">Preferences & Settings</span>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>

      <button
        onClick={handleSignOut}
        className="mt-4 flex items-center justify-center gap-2 w-full h-14 rounded-2xl bg-destructive/10 text-destructive font-bold cursor-pointer hover:bg-destructive/15 border-0"
      >
        <LogOut className="h-5 w-5" /> Sign Out
      </button>
    </AppShell>
  );
}
