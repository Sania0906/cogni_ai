import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function PageHeader({ title, back = "/home" }: { title: string; back?: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Link
        to={back}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    </div>
  );
}
