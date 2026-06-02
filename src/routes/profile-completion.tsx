import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { 
  Save, FileText, Upload, Brain, Award, ShieldCheck, 
  ChevronRight, Play, CheckCircle2, ArrowRight, Loader2, 
  BookOpen, GraduationCap, Link as LinkIcon, Sparkles, AlertCircle
} from "lucide-react";

export const Route = createFileRoute("/profile-completion")({
  head: () => ({ meta: [{ title: "Profile Onboarding — CognifyAI" }] }),
  component: ProfileCompletion,
});

interface Question {
  id: string;
  q: string;
  options: string[];
  correct: number;
}

function ProfileCompletion() {
  const navigate = useNavigate();
  
  // Wizard Step state: 1 = Profile details, 2 = Resume & ATS scan, 3 = Skill assessment, 4 = Success
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Profile & Academic State
  const [degree, setDegree] = useState("");
  const [department, setDepartment] = useState("");
  const [college, setCollege] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");
  const [certifications, setCertifications] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");

  // Step 2: Resume & ATS Scan State
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [scanProgress, setScanProgress] = useState("");
  const [atsReport, setAtsReport] = useState<{
    score: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } | null>(null);

  // Step 3: Skill Assessment State
  const [assessmentCategory, setAssessmentCategory] = useState("General Aptitude");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [assessmentStarted, setAssessmentStarted] = useState(false);

  // Step 4: Success metrics state
  const [finalMetrics, setFinalMetrics] = useState<{
    overallScore: number;
    atsScore: number;
    assessmentScore: number;
    careerDnaScore: number;
    archetype: string;
  } | null>(null);

  // Handle step 1 profile submission
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!degree || !college || !cgpa) {
      toast.error("Please fill in key academic credentials (Degree, College, CGPA).");
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        degree,
        department,
        college,
        grad_year: gradYear,
        cgpa,
        interests: interests.split(",").map(i => i.trim()).filter(Boolean),
        linkedin_url: linkedin,
        github_url: github,
        skills: skills.split(",").map(s => s.trim()).filter(Boolean),
        certifications: certifications.split(",").map(c => c.trim()).filter(Boolean)
      };
      
      await api.completeProfile(profileData);
      toast.success("Profile details saved successfully!");
      setStep(2);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit onboarding profile.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2 File Selection and trigger ATS Scan instantly
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setResumeFile(file);
      await triggerAtsScan(file);
    }
  };

  const triggerAtsScan = async (file: File) => {
    setLoading(true);
    setScanProgress("Uploading resume to secure Supabase storage...");
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("targetJob", "Senior Data Scientist");

      // Small artificial delays to make scan feel highly responsive and premium
      await new Promise(r => setTimeout(r, 600));
      setScanProgress("Parsing document layers and extracting text tokens...");
      await new Promise(r => setTimeout(r, 600));
      setScanProgress("Running multi-pass ATS semantic keyword matching analysis...");

      const response = await api.optimizeResume(formData);
      
      setAtsReport({
        score: response.score,
        strengths: response.strengths || [],
        weaknesses: response.weaknesses || [],
        recommendations: response.improvements || response.recommendations || []
      });
      
      toast.success("ATS Analysis completed successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to parse resume and run ATS Scan.");
      setResumeFile(null);
    } finally {
      setLoading(false);
      setScanProgress("");
    }
  };

  // Handle Step 3: Skill Assessment Questions Loading
  const loadAssessmentQuestions = async () => {
    setLoading(true);
    try {
      const res = await api.getDynamicQuestions();
      setAssessmentCategory(res.category);
      setQuestions(res.questions || []);
      setAnswers(new Array(res.questions.length).fill(-1));
      setAssessmentStarted(true);
      setQIndex(0);
    } catch (err: any) {
      console.error("Questions load error:", err);
      toast.error("Failed to load skill test questions.");
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (optionIdx: number) => {
    const nextAnswers = [...answers];
    nextAnswers[qIndex] = optionIdx;
    setAnswers(nextAnswers);
  };

  const nextQuestion = () => {
    if (answers[qIndex] === -1) {
      toast.error("Please select an answer before continuing.");
      return;
    }
    if (qIndex < questions.length - 1) {
      setQIndex(qIndex + 1);
    } else {
      submitAssessmentQuiz();
    }
  };

  const submitAssessmentQuiz = async () => {
    setLoading(true);
    try {
      let correctCount = 0;
      questions.forEach((q, idx) => {
        if (answers[idx] === q.correct) {
          correctCount++;
        }
      });

      const assessmentScore = Math.round((correctCount / questions.length) * 100);
      
      // Submit assessment and complete onboarding in one endpoint
      const response = await api.completeOnboarding(assessmentCategory, assessmentScore);
      
      setFinalMetrics({
        overallScore: response.overallScore,
        atsScore: response.atsScore,
        assessmentScore: response.assessmentScore,
        careerDnaScore: response.careerDnaScore,
        archetype: response.archetype
      });

      toast.success("Skill test submitted & onboarding complete!");
      setStep(4);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit assessment results.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md min-h-screen pb-28 px-5 pt-8 bg-background">
      {/* Step Indicators Header */}
      <div className="flex justify-between items-center mb-6 px-1">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" /> Onboarding
        </h1>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map(s => (
            <span 
              key={s} 
              className={`h-2.5 rounded-full transition-all duration-300 ${
                s === step 
                  ? "w-8 bg-gradient-primary" 
                  : s < step 
                    ? "w-2.5 bg-success" 
                    : "w-2.5 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Profile & Academic Details */}
      {step === 1 && (
        <form onSubmit={handleProfileSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-3xl bg-card shadow-card p-5 border border-border/10">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Academic Profile</h2>
                <p className="text-xs text-muted-foreground">Specify your qualifications and college metrics</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Degree / Qualification</label>
                <input
                  required
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="e.g. B.Tech in Computer Science, BS in Data Science"
                  className="w-full h-12 rounded-xl bg-muted/30 border border-border/40 px-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Department</label>
                  <input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. CSE, IT, Maths"
                    className="w-full h-12 rounded-xl bg-muted/30 border border-border/40 px-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">CGPA / Score</label>
                  <input
                    required
                    value={cgpa}
                    onChange={(e) => setCgpa(e.target.value)}
                    placeholder="e.g. 8.9 or 3.8/4.0"
                    className="w-full h-12 rounded-xl bg-muted/30 border border-border/40 px-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">College / University</label>
                <input
                  required
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="e.g. Stanford University, IIT Delhi"
                  className="w-full h-12 rounded-xl bg-muted/30 border border-border/40 px-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Graduation Year</label>
                <input
                  value={gradYear}
                  onChange={(e) => setGradYear(e.target.value)}
                  placeholder="e.g. 2026, 2027"
                  className="w-full h-12 rounded-xl bg-muted/30 border border-border/40 px-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-card shadow-card p-5 border border-border/10">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Skills & Domains</h2>
                <p className="text-xs text-muted-foreground">Provide interests to configure assessment topics</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Skills (Comma-separated)</label>
                <input
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. Python, SQL, React, Docker, Machine Learning"
                  className="w-full h-12 rounded-xl bg-muted/30 border border-border/40 px-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Interests / Domains (Comma-separated)</label>
                <input
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="e.g. AI/ML, Cloud Architectures, Web Development"
                  className="w-full h-12 rounded-xl bg-muted/30 border border-border/40 px-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Certifications (Comma-separated)</label>
                <input
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  placeholder="e.g. AWS Practitioner, TensorFlow Specialist"
                  className="w-full h-12 rounded-xl bg-muted/30 border border-border/40 px-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-card shadow-card p-5 border border-border/10">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <LinkIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Social Links</h2>
                <p className="text-xs text-muted-foreground">Share links to sync repositories and credentials</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">LinkedIn URL</label>
                <input
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full h-12 rounded-xl bg-muted/30 border border-border/40 px-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">GitHub URL</label>
                <input
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="https://github.com/username"
                  className="w-full h-12 rounded-xl bg-muted/30 border border-border/40 px-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-gradient-primary text-white font-bold flex items-center justify-center gap-2 shadow-glow disabled:opacity-60 border-0 cursor-pointer text-sm"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Next Step (Upload Resume) <ChevronRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Step 2: Resume & ATS Scan */}
      {step === 2 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-3xl bg-card shadow-card p-5 border border-border/10 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">ATS Optimization</h2>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1 leading-relaxed">
              Upload your resume for real-time semantic screening and instant benchmark matching.
            </p>

            {loading ? (
              <div className="mt-8 mb-6 py-6 border-2 border-dashed border-primary/20 rounded-2xl bg-primary/5 space-y-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
                <p className="text-xs font-bold text-primary animate-pulse">{scanProgress}</p>
              </div>
            ) : atsReport ? (
              <div className="mt-6 p-4 rounded-2xl bg-success/5 border border-success/15 space-y-4">
                <div className="flex items-center justify-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">ATS Score Calculated</span>
                </div>
                <div className="h-28 w-28 rounded-full bg-success/10 flex flex-col items-center justify-center mx-auto border-4 border-success/35">
                  <span className="text-3xl font-black text-success leading-none">{atsReport.score}</span>
                  <span className="text-[10px] font-bold text-success/70 mt-0.5">MATCH</span>
                </div>
                <div className="text-xs font-semibold text-muted-foreground text-center">
                  Score saved immediately to Supabase
                </div>
              </div>
            ) : (
              <div className="relative border-2 border-dashed border-border/50 rounded-2xl p-8 mt-6 hover:bg-muted/10 cursor-pointer transition-all duration-200">
                <input
                  type="file"
                  accept=".pdf,.txt,.docx"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="h-9 w-9 mx-auto text-primary mb-3" />
                <p className="text-sm font-bold text-foreground">Select Resume File</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Supports PDF, TXT or DOCX (Max 5MB)<br />
                  Analysis starts instantly upon selection
                </p>
              </div>
            )}
          </div>

          {/* Display results summary if analysis complete */}
          {atsReport && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="rounded-3xl bg-card shadow-card p-5 border border-border/10 space-y-4">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  ⭐ Scan Insights
                </h3>
                
                {atsReport.strengths.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-success">Strengths Detected:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {atsReport.strengths.map((s, idx) => (
                        <span key={idx} className="text-[10px] font-bold bg-success/10 text-success px-2.5 py-1 rounded-lg">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {atsReport.recommendations.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-warning">Improvements Recommended:</p>
                    <ul className="text-xs text-muted-foreground space-y-1.5 pl-3 list-disc">
                      {atsReport.recommendations.slice(0, 3).map((r, idx) => (
                        <li key={idx} className="leading-relaxed">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full h-14 rounded-2xl bg-gradient-primary text-white font-bold flex items-center justify-center gap-2 shadow-glow border-0 cursor-pointer text-sm"
              >
                Proceed to Skill Assessment <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Skill Assessment */}
      {step === 3 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {!assessmentStarted ? (
            <div className="rounded-3xl bg-card shadow-card p-6 border border-border/10 text-center space-y-5">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Award className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Interactive Skill Test</h2>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1 leading-relaxed">
                  To complete onboarding, you must take a short 5-question multiple choice skill test. Questions are selected dynamically based on your profile interests.
                </p>
              </div>

              <div className="rounded-2xl p-4 bg-muted/30 text-left border border-border/50">
                <h4 className="text-xs font-bold mb-1.5 flex items-center gap-1.5 text-foreground">
                  📝 Guidelines
                </h4>
                <ul className="text-[11px] text-muted-foreground space-y-1 pl-3 list-disc">
                  <li>5 multiple-choice questions.</li>
                  <li>Sourced dynamically from target technology domains.</li>
                  <li>Requires submission to generate final Employability Score.</li>
                </ul>
              </div>

              <button
                onClick={loadAssessmentQuestions}
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-gradient-primary text-white font-bold flex items-center justify-center gap-2 shadow-glow disabled:opacity-60 border-0 cursor-pointer text-sm"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Start Skill Assessment <Play className="h-4.5 w-4.5 fill-current" /></>}
              </button>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground px-1">
                <span className="text-primary uppercase tracking-wider">{assessmentCategory}</span>
                <span>Question {qIndex + 1} of {questions.length}</span>
              </div>
              
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-primary rounded-full transition-all duration-300" 
                  style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }} 
                />
              </div>

              {/* Question Card */}
              <div className="rounded-3xl bg-card shadow-card p-6 min-h-[140px] flex items-center justify-center border border-border/10 text-center">
                <p className="text-base font-extrabold text-foreground leading-relaxed">
                  {questions[qIndex]?.q}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {questions[qIndex]?.options.map((opt, idx) => {
                  const isSelected = answers[qIndex] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => selectAnswer(idx)}
                      className={`w-full text-left p-4.5 rounded-2xl font-semibold text-sm transition-all border cursor-pointer ${
                        isSelected
                          ? "bg-gradient-primary text-white border-transparent shadow-glow"
                          : "bg-card hover:bg-muted/10 border-border/50 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isSelected ? "bg-white/20 text-white" : "bg-muted/80 text-muted-foreground"
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {opt}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Next / Submit */}
              <button
                onClick={nextQuestion}
                disabled={loading}
                className="w-full h-14 mt-4 rounded-2xl bg-gradient-primary text-white font-bold flex items-center justify-center gap-2 shadow-glow disabled:opacity-60 border-0 cursor-pointer text-sm"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : qIndex < questions.length - 1 ? (
                  <>
                    Next Question <ChevronRight className="h-5 w-5" />
                  </>
                ) : (
                  "Submit & Complete Onboarding"
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Success & Score Summary */}
      {step === 4 && finalMetrics && (
        <div className="space-y-6 text-center animate-in fade-in duration-500">
          <div className="rounded-full h-16 w-16 bg-success/15 text-success flex items-center justify-center mx-auto shadow-glow mb-2 animate-bounce">
            <ShieldCheck className="h-9 w-9" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground">Welcome to CognifyAI!</h2>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1 text-primary">
              Onboarding Complete & Saved
            </p>
          </div>

          {/* DNA Tagline Card */}
          <div className="rounded-3xl p-5 bg-card shadow-card border border-border/10 space-y-2">
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Career Archetype</div>
            <h3 className="text-base font-extrabold text-foreground">{finalMetrics.archetype}</h3>
            <div className="h-0.5 w-10 bg-primary/20 mx-auto my-2" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Based on your academic profile, skill test, and resume indices, your profile is now cataloged in Supabase.
            </p>
          </div>

          {/* Score Widgets */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4.5 rounded-2xl bg-card shadow-card border border-border/10">
              <span className="text-[9px] text-muted-foreground uppercase font-extrabold tracking-wider">ATS Score</span>
              <p className="text-2xl font-black mt-1 text-primary">{finalMetrics.atsScore}%</p>
            </div>
            
            <div className="p-4.5 rounded-2xl bg-card shadow-card border border-border/10">
              <span className="text-[9px] text-muted-foreground uppercase font-extrabold tracking-wider">Skill Test</span>
              <p className="text-2xl font-black mt-1 text-success">{finalMetrics.assessmentScore}%</p>
            </div>

            <div className="col-span-2 p-5 rounded-3xl bg-gradient-primary text-white shadow-glow relative overflow-hidden">
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[10px] text-white/80 uppercase font-extrabold tracking-wider">Employability Index</span>
                  <h4 className="text-3xl font-black mt-1">{finalMetrics.overallScore}%</h4>
                  <p className="text-[10px] text-white/70 mt-1">Calculated composite competitiveness</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
                  <Award className="h-8 w-8" />
                </div>
              </div>
              <div className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-white/5" />
            </div>
          </div>

          <button
            onClick={() => navigate({ to: "/home" })}
            className="w-full h-14 rounded-2xl bg-gradient-primary text-white font-bold flex items-center justify-center gap-2 shadow-glow border-0 cursor-pointer text-sm"
          >
            Enter Career Dashboard <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
