import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CognifyAI — Smart Skill Intelligence System" },
      {
        name: "description",
        content:
          "Analyze your skills, discover careers, and get personalized learning paths powered by AI.",
      },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  return (
    <div className="mx-auto max-w-md min-h-screen flex flex-col items-center justify-between px-6 py-10">
      <div className="self-end">
        <Link to="/home" className="text-sm text-muted-foreground hover:text-foreground">
          Skip
        </Link>
      </div>
      <div className="flex flex-col items-center text-center gap-6 mt-12">
        <div className="h-24 w-24 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <Brain className="h-12 w-12 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-3">AI-Powered Intelligence</h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-xs">
            Harness the power of artificial intelligence to analyze your skills and predict your perfect career path
          </p>
        </div>
        <div className="flex gap-2 mt-4">
          <span className="h-2 w-8 rounded-full bg-gradient-primary" />
          <span className="h-2 w-2 rounded-full bg-muted" />
          <span className="h-2 w-2 rounded-full bg-muted" />
          <span className="h-2 w-2 rounded-full bg-muted" />
        </div>
      </div>
      <div className="w-full space-y-3">
        <Link
          to="/login"
          className="w-full h-14 rounded-2xl bg-gradient-primary text-white font-semibold flex items-center justify-center gap-2 shadow-glow"
        >
          Next <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
