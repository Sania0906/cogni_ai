import { createFileRoute, Link } from "@tanstack/react-router";
import { Play, ArrowLeft, SkipForward, SkipBack, FileText } from "lucide-react";

export const Route = createFileRoute("/lesson/$lessonId")({
  head: () => ({ meta: [{ title: "Lesson — CognifyAI" }] }),
  component: Lesson,
});

function Lesson() {
  const { lessonId } = Route.useParams();
  return (
    <div className="mx-auto max-w-md min-h-screen pb-10">
      <div className="relative aspect-video bg-gradient-primary flex items-center justify-center">
        <Link to="/course/$courseId" params={{ courseId: "ml-foundations" }} className="absolute top-4 left-4 h-10 w-10 rounded-xl bg-black/30 backdrop-blur flex items-center justify-center text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
          <Play className="h-10 w-10 text-white fill-white" />
        </div>
        <div className="absolute bottom-4 inset-x-4">
          <div className="h-1 rounded-full bg-white/20">
            <div className="h-full w-[35%] bg-white rounded-full" />
          </div>
          <div className="flex justify-between text-xs text-white/80 mt-1.5">
            <span>4:32</span><span>12:50</span>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6">
        <p className="text-xs text-muted-foreground">Lesson {lessonId}</p>
        <h1 className="text-2xl font-bold mt-1">Hands-on Practice</h1>
        <p className="text-sm text-muted-foreground mt-2">Apply core ML concepts by building your first model from scratch.</p>

        <div className="flex justify-center gap-4 mt-6">
          <button className="h-12 w-12 rounded-2xl bg-card shadow-card flex items-center justify-center"><SkipBack className="h-5 w-5" /></button>
          <button className="h-14 w-14 rounded-2xl bg-gradient-primary text-white shadow-glow flex items-center justify-center"><Play className="h-6 w-6 fill-white" /></button>
          <button className="h-12 w-12 rounded-2xl bg-card shadow-card flex items-center justify-center"><SkipForward className="h-5 w-5" /></button>
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-card shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-primary" />
            <p className="font-bold">Resources</p>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>· Lesson notebook (PDF)</li>
            <li>· Dataset download</li>
            <li>· Slides</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
