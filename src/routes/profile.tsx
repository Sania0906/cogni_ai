import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Award, BookOpen, Target, Settings, Shield, Bell, Moon, LogOut, ChevronRight, User as UserIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — CognifyAI" }] }),
  component: Profile,
});



const settings = [
  { to: "/settings/account", label: "Account Settings", icon: Settings, color: "bg-gradient-primary" },
  { to: "/settings/security", label: "Security & Privacy", icon: Shield, color: "bg-gradient-blue" },
  { to: "/notifications", label: "Notifications", icon: Bell, color: "bg-gradient-pink" },
  { to: "/settings/theme", label: "Theme", icon: Moon, color: "bg-gradient-primary" },
];

function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [stats, setStats] = useState([
    { n: 0, label: "Certificates", color: "bg-gradient-blue", icon: Award },
    { n: 0, label: "Courses", color: "bg-gradient-primary", icon: BookOpen },
    { n: 0, label: "Skills", color: "bg-gradient-pink", icon: Target },
  ]);

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
  const displayEmail = profile?.email || "user@cognify.ai";

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

      {/* Academic Credentials */}
      {profile?.onboarding_completed ? (
        <div className="rounded-3xl p-5 bg-card shadow-card mt-5 space-y-4 border border-border/10">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            🎓 Academic Credentials
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Degree</p>
              <p className="font-bold text-card-foreground mt-0.5">{profile.degree}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Department</p>
              <p className="font-bold text-card-foreground mt-0.5">{profile.department || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">College / University</p>
              <p className="font-bold text-card-foreground mt-0.5">{profile.college}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">CGPA</p>
                <p className="font-bold text-card-foreground mt-0.5">{profile.cgpa}</p>
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
      ) : (
        <div className="rounded-3xl p-5 bg-card shadow-card mt-5 text-center border border-dashed border-border/40">
          <p className="text-sm font-semibold text-muted-foreground mb-3">Academic credentials and links are missing.</p>
          <Link
            to="/profile-completion"
            className="inline-block px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-glow"
          >
            Complete Onboarding Checklist
          </Link>
        </div>
      )}

      {/* Resume ATS Analysis */}
      {profile?.resumeDetails && (
        <div className="rounded-3xl p-5 bg-card shadow-card mt-5 space-y-4 border border-border/10">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            📄 Resume ATS Analysis
          </h3>
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 flex items-center justify-center rounded-2xl bg-gradient-blue text-white font-black text-lg shadow-glow">
              {profile.resumeDetails.ats_score}%
            </div>
            <div>
              <p className="text-sm font-bold text-card-foreground">ATS Optimization Score</p>
              <p className="text-xs text-muted-foreground mt-0.5">Parsed details and improvements detected below</p>
            </div>
          </div>

          {profile.resumeDetails.skills && profile.resumeDetails.skills.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-semibold">Extracted Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.resumeDetails.skills.map((s: string) => (
                  <span key={s} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile.resumeDetails.improvements && profile.resumeDetails.improvements.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-semibold">Key Improvements Recommended</p>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 pl-1">
                {profile.resumeDetails.improvements.map((imp: string, index: number) => (
                  <li key={index}>{imp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Skill Assessments History */}
      {assessments.length > 0 && (
        <div className="rounded-3xl p-5 bg-card shadow-card mt-5 space-y-4 border border-border/10">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            🏆 Completed Assessments
          </h3>
          <div className="space-y-3">
            {assessments.map((a: any, idx: number) => (
              <div key={a._id || idx} className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/20">
                <div>
                  <p className="text-sm font-bold text-card-foreground">{a.category}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Completed: {new Date(a.completedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl font-bold text-xs ${
                  a.score >= 80 ? "bg-green-500/10 text-green-500" :
                  a.score >= 60 ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                }`}>
                  Score: {a.score}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-lg font-bold mt-7 mb-3">Settings</h2>
      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        {settings.map((s, i) => (
          <Link
            key={s.label}
            to={s.to}
            className={`flex items-center gap-4 p-4 ${i > 0 ? "border-t border-border" : ""}`}
          >
            <div className={`h-10 w-10 rounded-xl ${s.color} flex items-center justify-center text-white`}>
              <s.icon className="h-5 w-5" />
            </div>
            <span className="flex-1 font-semibold">{s.label}</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        ))}
      </div>

      <button
        onClick={handleSignOut}
        className="mt-5 flex items-center justify-center gap-2 w-full h-14 rounded-2xl bg-destructive/10 text-destructive font-bold cursor-pointer hover:bg-destructive/15 border-0"
      >
        <LogOut className="h-5 w-5" /> Sign Out
      </button>
    </AppShell>
  );
}
