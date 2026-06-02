import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Brain, Mail, Lock, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — CognifyAI" },
      { name: "description", content: "Sign in to your CognifyAI account." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("confirmed") === "true") {
        toast.success("Email confirmed successfully! You can now log in.");
        // Scrub the query parameters from history
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-gradient-primary" />
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-pink/30 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center text-white mb-8">
          <div className="h-20 w-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-5 border border-white/30">
            <Brain className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold">CognifyAI</h1>
          <p className="text-white/80 mt-1 text-sm">Smart Skill Intelligence System</p>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              const res = await api.login(email, password);
              localStorage.setItem("token", res.token);
              localStorage.setItem("userName", res.user.name);
              toast.success("Welcome back, " + res.user.name + "!");
              navigate({ to: "/home" });
            } catch (err: any) {
              console.error(err);
              if (err.status === 403 && err.data?.unverified) {
                const mockLink = err.data?.mockLink;
                if (mockLink) {
                  toast.error(err.message || "Email is not verified.", {
                    duration: 15000,
                    action: {
                      label: "Confirm Now",
                      onClick: () => {
                        window.open(mockLink, "_blank");
                      }
                    }
                  });
                } else {
                  toast.error(err.message || "Email is not verified. Please check your email for the confirmation link.");
                }
              } else {
                toast.error(err.message || "Invalid credentials or server offline");
              }
            } finally {
              setLoading(false);
            }
          }}
          className="rounded-3xl bg-white/15 backdrop-blur-xl border border-white/25 p-6 space-y-4"
        >
          <h2 className="text-white text-xl font-bold">Welcome Back</h2>

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

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full h-14 rounded-2xl bg-white/10 border border-white/20 pl-12 pr-4 text-white placeholder:text-white/70 focus:outline-none focus:bg-white/15"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-white text-primary font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Signing In..." : <>Sign In <ArrowRight className="h-5 w-5" /></>}
          </button>

          <div className="text-center">
            <Link to="/forgot-password" className="text-white text-sm font-semibold">
              Forgot password?
            </Link>
          </div>
        </form>

        <p className="text-center text-white/90 text-sm mt-6">
          Don't have an account?{" "}
          <Link to="/signup" className="underline font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
