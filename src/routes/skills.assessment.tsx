import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Award, Clock, CheckCircle2, ChevronRight, Play } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/skills/assessment")({
  head: () => ({ meta: [{ title: "Skill Assessment — CognifyAI" }] }),
  component: Assessment,
});

interface Question {
  q: string;
  options: string[];
  correct: number;
}

const assessmentBanks: Record<string, Question[]> = {
  "Programming": [
    { q: "What is the output of print(2 ** 3) in Python?", options: ["6", "8", "9", "Error"], correct: 1 },
    { q: "Which data structure operates on a Last In First Out (LIFO) basis?", options: ["Queue", "Stack", "Linked List", "Tree"], correct: 1 },
    { q: "What does list comprehension do in Python?", options: ["Compiles code faster", "Translates lists to tuples", "Creates a new list based on an existing iterable", "Deletes redundant items"], correct: 2 },
    { q: "Which of the following is NOT a mutable data structure in Python?", options: ["List", "Dictionary", "Tuple", "Set"], correct: 2 },
    { q: "What is the time complexity of searching in a balanced Binary Search Tree?", options: ["O(1)", "O(N)", "O(log N)", "O(N log N)"], correct: 2 }
  ],
  "Database": [
    { q: "Which SQL clause is used to filter group results after grouping?", options: ["WHERE", "HAVING", "GROUP BY", "ORDER BY"], correct: 1 },
    { q: "What is a primary key?", options: ["A key that allows duplicate values", "A unique identifier for each database table row", "A key that links to another table's primary key", "A nullable indexing attribute"], correct: 1 },
    { q: "What is the main benefit of creating a database index?", options: ["Reduces storage space", "Speeds up data retrieval queries", "Enforces foreign key referential integrity", "Prevents duplicate rows"], correct: 1 },
    { q: "Which property ensures database transactions are executed reliably?", options: ["REST", "ACID", "CRUD", "JSON"], correct: 1 },
    { q: "Which join returns all records when there is a match in either left or right table?", options: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN"], correct: 3 }
  ],
  "Aptitude": [
    { q: "If a car travels at 60 km/h, how far will it travel in 45 minutes?", options: ["40 km", "45 km", "50 km", "55 km"], correct: 1 },
    { q: "Complete the sequence: 2, 6, 12, 20, 30, ?", options: ["36", "40", "42", "48"], correct: 2 },
    { q: "A store increases the price of an item by 20%, then discounts it by 20%. What is the net change?", options: ["No change", "4% decrease", "4% increase", "2% decrease"], correct: 1 },
    { q: "If 5 workers build a wall in 12 days, how long would it take 6 workers?", options: ["10 days", "9 days", "8 days", "14 days"], correct: 0 },
    { q: "A bag contains 3 red balls and 7 blue balls. What is the probability of drawing a red ball?", options: ["0.3", "0.7", "0.5", "0.37"], correct: 0 }
  ],
  "AI/ML": [
    { q: "What type of learning involves training models on labeled target outputs?", options: ["Unsupervised Learning", "Supervised Learning", "Reinforcement Learning", "Self-supervised Learning"], correct: 1 },
    { q: "Which issue occurs when a machine learning model fits training data too perfectly but performs poorly on new data?", options: ["Underfitting", "Overfitting", "Bias validation", "Gradient descent"], correct: 1 },
    { q: "Which function is commonly used as the final activation layer in binary classification?", options: ["ReLU", "Sigmoid", "Softmax", "Tanh"], correct: 1 },
    { q: "What does the term 'epochs' refer to in training deep learning models?", options: ["Number of weights tuned", "Number of full passes through the training dataset", "Batch training iterations", "Learning rate decays"], correct: 1 },
    { q: "What algorithm is primarily used to compute gradients for weight updates in neural networks?", options: ["K-Means", "Backpropagation", "A* Search", "Linear Regression"], correct: 1 }
  ],
  "Cloud Computing": [
    { q: "What does AWS VPC stand for?", options: ["Virtual Private Cloud", "Variable Portable Computing", "Virtual Peak Computing", "Variable Private Cluster"], correct: 0 },
    { q: "Which cloud service model provides OS environments, databases, and development tools on-demand?", options: ["IaaS", "PaaS", "SaaS", "FaaS"], correct: 1 },
    { q: "What is the primary benefit of serverless computing (e.g. AWS Lambda)?", options: ["No security rules", "No need to manage or provision background server infrastructure", "Free storage", "Higher database speeds"], correct: 1 },
    { q: "Which cloud storage class is best suited for archiving data accessed once a year?", options: ["Standard Storage", "Glacier / Cold Archive Class", "Express Tier", "Frequent Access Class"], correct: 1 },
    { q: "What is scalability in cloud computing?", options: ["Encrypting user credentials", "The ability to dynamically increase or decrease computing resources", "Bypassing firewalls", "Replicating backups to local servers"], correct: 1 }
  ],
  "Web Development": [
    { q: "What does HTTP status code 404 represent?", options: ["Unauthorized Access", "Internal Server Error", "Resource Not Found", "Success"], correct: 2 },
    { q: "Which layout model is designed for 1-dimensional alignment (rows or columns)?", options: ["CSS Grid", "Flexbox", "Floats", "Absolute Positioning"], correct: 1 },
    { q: "What is the DOM in web development?", options: ["Domain Objective Mode", "Document Object Model", "Dynamic Output Manager", "Developer Orientation Module"], correct: 1 },
    { q: "Which CSS property controls the space outside an element's border?", options: ["Padding", "Margin", "Border-radius", "Width"], correct: 1 },
    { q: "What does AJAX stand for?", options: ["Advanced Javascript And XML", "Asynchronous JavaScript And XML", "Asynchronous Java And XHTML", "Automatic JSON Accessing XML"], correct: 1 }
  ]
};

function Assessment() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [scoreResult, setScoreResult] = useState<number | null>(null);

  const categories = Object.keys(assessmentBanks);

  const startQuiz = (cat: string) => {
    setSelectedCategory(cat);
    setStarted(true);
    setQIndex(0);
    setAnswers([]);
    setScoreResult(null);
  };

  const selectAnswer = (optionIdx: number) => {
    const nextAnswers = [...answers];
    nextAnswers[qIndex] = optionIdx;
    setAnswers(nextAnswers);
  };

  const nextQuestion = () => {
    if (answers[qIndex] === undefined) {
      toast.error("Please select an answer before continuing.");
      return;
    }
    if (qIndex < 4) {
      setQIndex(qIndex + 1);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    if (!selectedCategory) return;
    setLoading(true);
    try {
      const bank = assessmentBanks[selectedCategory];
      let correctCount = 0;
      bank.forEach((item, idx) => {
        if (answers[idx] === item.correct) {
          correctCount++;
        }
      });

      const finalScore = Math.round((correctCount / bank.length) * 100);
      
      // Post to backend
      await api.submitAssessment(selectedCategory, finalScore);
      setScoreResult(finalScore);
      toast.success(`Assessment submitted! Score: ${finalScore}%`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit assessment results.");
    } finally {
      setLoading(false);
    }
  };

  const resetQuiz = () => {
    setStarted(false);
    setSelectedCategory(null);
    setQIndex(0);
    setAnswers([]);
    setScoreResult(null);
  };

  if (scoreResult !== null) {
    return (
      <AppShell>
        <PageHeader title="Result" back="/skills" />
        <div className="rounded-3xl p-8 bg-card shadow-card text-center space-y-6 max-w-sm mx-auto mt-6">
          <div className="h-20 w-20 rounded-full bg-gradient-primary flex items-center justify-center text-white mx-auto text-4xl shadow-glow animate-pulse">
            ✓
          </div>
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Assessment Complete</p>
            <h2 className="text-3xl font-extrabold mt-1 text-primary">{selectedCategory}</h2>
          </div>
          <div className="py-4 border-y border-border/50">
            <p className="text-xs text-muted-foreground font-semibold">Your Score</p>
            <p className="text-5xl font-black mt-2 text-primary">{scoreResult}%</p>
            <p className="text-xs font-bold text-success mt-2">{scoreResult >= 80 ? "Level: Advanced Badge Earned!" : scoreResult >= 60 ? "Level: Intermediate Badge Earned!" : "Level: Beginner Badge Earned!"}</p>
          </div>
          <button
            onClick={resetQuiz}
            className="w-full h-14 rounded-2xl bg-gradient-primary text-white font-bold cursor-pointer shadow-glow border-0"
          >
            Take Another Assessment
          </button>
          <button
            onClick={() => navigate({ to: "/home" })}
            className="w-full h-14 rounded-2xl bg-muted text-foreground font-bold cursor-pointer border-0 mt-2"
          >
            Go to Dashboard
          </button>
        </div>
      </AppShell>
    );
  }

  if (started && selectedCategory) {
    const bank = assessmentBanks[selectedCategory];
    const currentQ = bank[qIndex];

    return (
      <AppShell>
        <PageHeader title={selectedCategory} back="/skills" />
        
        {/* Progress header */}
        <div className="flex justify-between items-center mb-4 text-xs font-bold text-muted-foreground">
          <span>Question {qIndex + 1} of 5</span>
          <span className="text-primary">{Math.round(((qIndex) / 5) * 100)}% Complete</span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-6">
          <div className="h-full bg-gradient-primary rounded-full transition-all duration-300" style={{ width: `${((qIndex) / 5) * 100}%` }} />
        </div>

        {/* Question Card */}
        <div className="rounded-3xl bg-card shadow-card p-6 min-h-[160px] flex items-center justify-center border border-border/10 mb-6">
          <p className="text-base font-extrabold text-foreground text-center leading-relaxed">
            {currentQ.q}
          </p>
        </div>

        {/* Options List */}
        <div className="space-y-3">
          {currentQ.options.map((opt, idx) => {
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

        {/* Navigation Button */}
        <button
          onClick={nextQuestion}
          disabled={loading}
          className="w-full h-14 mt-8 rounded-2xl bg-gradient-primary text-white font-bold flex items-center justify-center gap-2 shadow-glow disabled:opacity-50 border-0 cursor-pointer"
        >
          {loading ? "Submitting..." : qIndex < 4 ? <>Next Question <ChevronRight className="h-5 w-5" /></> : "Submit Test"}
        </button>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Skill Assessment" back="/home" />

      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow flex gap-4 items-center mb-6">
        <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          <Award className="h-8 w-8 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-lg leading-tight">Interactive Skill assessments</h2>
          <p className="text-xs text-white/80 mt-1">Complete a 5-question test to earn a credential badge and unlock Career DNA.</p>
        </div>
      </div>

      <h3 className="text-lg font-bold mb-3">Select Category</h3>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => startQuiz(cat)}
            className="p-5 rounded-2xl bg-card shadow-card flex flex-col items-center justify-center gap-3 hover:scale-[1.02] transition-all border border-border/20 cursor-pointer text-center"
          >
            <div className="h-12 w-12 rounded-2xl bg-gradient-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
              {cat[0]}
            </div>
            <span className="text-xs font-bold text-foreground">{cat}</span>
          </button>
        ))}
      </div>

      <div className="rounded-3xl p-5 bg-card shadow-card border border-border/10">
        <h4 className="font-bold text-sm mb-2.5 flex items-center gap-1.5"><Clock className="h-4.5 w-4.5 text-primary" /> Test Guidelines</h4>
        <ul className="text-xs text-muted-foreground space-y-2">
          <li className="flex items-start gap-1.5">
            <span className="h-1.5 w-1.5 bg-primary rounded-full mt-1.5 shrink-0" />
            Each test consists of exactly 5 multiple choice questions.
          </li>
          <li className="flex items-start gap-1.5">
            <span className="h-1.5 w-1.5 bg-primary rounded-full mt-1.5 shrink-0" />
            No time limit. You can complete the questions at your own pace.
          </li>
          <li className="flex items-start gap-1.5">
            <span className="h-1.5 w-1.5 bg-primary rounded-full mt-1.5 shrink-0" />
            Scores &gt;= 60% will award a credential badge displayed on your profile.
          </li>
        </ul>
      </div>
    </AppShell>
  );
}
