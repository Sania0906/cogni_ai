import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Brain, Mail, Lock, User, ArrowRight } from "lucide-react";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — CognifyAI" }] }),
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validations
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      toast.error("All fields are required");
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
      const res = await api.signup(name, email, password, confirmPassword);
      if ((res as any).mockLink) {
        toast.success("Account created! Please confirm your email using the link below.", {
          duration: 15000,
          action: {
            label: "Confirm Now",
            onClick: () => {
              window.open((res as any).mockLink, "_blank");
            }
          }
        });
      } else {
        toast.success(res.message || "Account created! Please check your email for the confirmation link.");
      }
      navigate({ to: "/login" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to sign up. Email may already be registered.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-5 py-10">
      <div className="absolute inset-0 bg-gradient-primary" />
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-pink/30 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center text-white mb-6">
          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 border border-white/30">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-white/80 mt-1 text-sm">Start your AI-powered journey</p>
        </div>

        <form
          onSubmit={handleSignup}
          className="rounded-3xl bg-white/15 backdrop-blur-xl border border-white/25 p-6 space-y-4"
        >
          {/* Name input */}
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full h-14 rounded-2xl bg-white/10 border border-white/20 pl-12 pr-4 text-white placeholder:text-white/70 focus:outline-none focus:bg-white/15"
            />
          </div>

          {/* Email input */}
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

          {/* Password input */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 chars)"
              className="w-full h-14 rounded-2xl bg-white/10 border border-white/20 pl-12 pr-4 text-white placeholder:text-white/70 focus:outline-none focus:bg-white/15"
            />
          </div>

          {/* Confirm Password input */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full h-14 rounded-2xl bg-white/10 border border-white/20 pl-12 pr-4 text-white placeholder:text-white/70 focus:outline-none focus:bg-white/15"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-white text-primary font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Signing up..." : <>Continue <ArrowRight className="h-5 w-5" /></>}
          </button>
        </form>

        <p className="text-center text-white/90 text-sm mt-6">
          Already have an account?{" "}
          <Link to="/login" className="underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
