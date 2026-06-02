import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Lock, Mail, ArrowRight, ArrowLeft, KeyRound } from "lucide-react";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — CognifyAI" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("pendingEmail");
      if (stored) {
        setEmail(stored);
      }
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!email.trim() || !code.trim() || !password || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }

    if (code.length < 6) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword(email, code, password, confirmPassword);
      toast.success(res.message || "Password reset successful! Please log in.");
      localStorage.removeItem("pendingEmail");
      navigate({ to: "/login" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to reset password. Verify the reset code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-5 py-10">
      <div className="absolute inset-0 bg-gradient-primary" />
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-pink/30 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <Link to="/forgot-password" className="inline-flex items-center text-white/90 text-sm mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Link>
        
        <div className="text-white mb-6 text-center">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 border border-white/30">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-white/80 mt-1 text-sm">
            Enter the 6-digit code and choose a new password.
          </p>
        </div>

        <form
          onSubmit={handleReset}
          className="rounded-3xl bg-white/15 backdrop-blur-xl border border-white/25 p-6 space-y-4"
        >
          {/* Email Input */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full h-14 rounded-2xl bg-white/10 border border-white/20 pl-12 pr-4 text-white placeholder:text-white/70 focus:outline-none focus:bg-white/15"
            />
          </div>

          {/* OTP Code Input */}
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
            <input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="6-digit reset code"
              className="w-full h-14 rounded-2xl bg-white/10 border border-white/20 pl-12 pr-4 text-white placeholder:text-white/70 focus:outline-none focus:bg-white/15 tracking-widest text-center font-bold"
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="w-full h-14 rounded-2xl bg-white/10 border border-white/20 pl-12 pr-4 text-white placeholder:text-white/70 focus:outline-none focus:bg-white/15"
            />
          </div>

          {/* Confirm Password Input */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full h-14 rounded-2xl bg-white/10 border border-white/20 pl-12 pr-4 text-white placeholder:text-white/70 focus:outline-none focus:bg-white/15"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-white text-primary font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Resetting..." : <>Reset Password <ArrowRight className="h-5 w-5" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
