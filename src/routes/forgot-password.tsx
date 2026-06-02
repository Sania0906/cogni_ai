import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — CognifyAI" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      localStorage.setItem("pendingEmail", email);
      if (res.otp) {
        toast.success(`Verification code sent! Code: ${res.otp}`, { duration: 10000 });
      } else {
        toast.success("Verification code sent to your email!");
      }
      navigate({ to: "/reset-password" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to send code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-gradient-primary" />
      <div className="relative w-full max-w-sm">
        <Link to="/login" className="inline-flex items-center text-white/90 text-sm mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Link>
        <div className="text-white mb-6">
          <h1 className="text-2xl font-bold">Forgot Password?</h1>
          <p className="text-white/80 mt-1 text-sm">
            Enter your email and we'll send you a verification code.
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white/15 backdrop-blur-xl border border-white/25 p-6 space-y-4"
        >
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full h-14 rounded-2xl bg-white/10 border border-white/20 pl-12 pr-4 text-white placeholder:text-white/70 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-white text-primary font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Sending..." : <>Send Code <ArrowRight className="h-5 w-5" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
