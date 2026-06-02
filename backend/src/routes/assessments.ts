import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { supabaseAdmin } from "../config/supabase";

const router = Router();

const questionPool: Record<string, { q: string; options: string[]; correct: number }[]> = {
  "programming": [
    { q: "What is the output of print(2 ** 3) in Python?", options: ["6", "8", "9", "Error"], correct: 1 },
    { q: "Which data structure operates on a Last In First Out (LIFO) basis?", options: ["Queue", "Stack", "Linked List", "Tree"], correct: 1 },
    { q: "What does list comprehension do in Python?", options: ["Compiles code faster", "Translates lists to tuples", "Creates a new list based on an existing iterable", "Deletes redundant items"], correct: 2 },
    { q: "Which of the following is NOT a mutable data structure in Python?", options: ["List", "Dictionary", "Tuple", "Set"], correct: 2 },
    { q: "What is the time complexity of searching in a balanced Binary Search Tree?", options: ["O(1)", "O(N)", "O(log N)", "O(N log N)"], correct: 2 },
    { q: "Which of the following is a key feature of Python?", options: ["Static typing", "Manual memory management", "Automatic garbage collection", "No support for OOP"], correct: 2 },
    { q: "What does the 'self' keyword represent in Python class methods?", options: ["The class definition itself", "The instance of the class", "A global variable", "A built-in class function"], correct: 1 }
  ],
  "database": [
    { q: "Which SQL clause is used to filter group results after grouping?", options: ["WHERE", "HAVING", "GROUP BY", "ORDER BY"], correct: 1 },
    { q: "What is a primary key?", options: ["A key that allows duplicate values", "A unique identifier for each database table row", "A key that links to another table's primary key", "A nullable indexing attribute"], correct: 1 },
    { q: "What is the main benefit of creating a database index?", options: ["Reduces storage space", "Speeds up data retrieval queries", "Enforces foreign key referential integrity", "Prevents duplicate rows"], correct: 1 },
    { q: "Which property ensures database transactions are executed reliably?", options: ["REST", "ACID", "CRUD", "JSON"], correct: 1 },
    { q: "Which join returns all records when there is a match in either left or right table?", options: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN"], correct: 3 },
    { q: "What does 3NF stand for in database normalization?", options: ["Third Normal Form", "Triple Network File", "Three-Node Framework", "Third Nominal File"], correct: 0 }
  ],
  "ai": [
    { q: "What type of learning involves training models on labeled target outputs?", options: ["Unsupervised Learning", "Supervised Learning", "Reinforcement Learning", "Self-supervised Learning"], correct: 1 },
    { q: "Which issue occurs when a machine learning model fits training data too perfectly but performs poorly on new data?", options: ["Underfitting", "Overfitting", "Bias validation", "Gradient descent"], correct: 1 },
    { q: "Which function is commonly used as the final activation layer in binary classification?", options: ["ReLU", "Sigmoid", "Softmax", "Tanh"], correct: 1 },
    { q: "What does the term 'epochs' refer to in training deep learning models?", options: ["Number of weights tuned", "Number of full passes through the training dataset", "Batch training iterations", "Learning rate decays"], correct: 1 },
    { q: "What algorithm is primarily used to compute gradients for weight updates in neural networks?", options: ["K-Means", "Backpropagation", "A* Search", "Linear Regression"], correct: 1 }
  ],
  "cloud": [
    { q: "What does AWS VPC stand for?", options: ["Virtual Private Cloud", "Variable Portable Computing", "Virtual Peak Computing", "Variable Private Cluster"], correct: 0 },
    { q: "Which cloud service model provides OS environments, databases, and development tools on-demand?", options: ["IaaS", "PaaS", "SaaS", "FaaS"], correct: 1 },
    { q: "What is the primary benefit of serverless computing (e.g. AWS Lambda)?", options: ["No security rules", "No need to manage or provision background server infrastructure", "Free storage", "Higher database speeds"], correct: 1 },
    { q: "Which cloud storage class is best suited for archiving data accessed once a year?", options: ["Standard Storage", "Glacier / Cold Archive Class", "Express Tier", "Frequent Access Class"], correct: 1 },
    { q: "What is scalability in cloud computing?", options: ["Encrypting user credentials", "The ability to dynamically increase or decrease computing resources", "Bypassing firewalls", "Replicating backups to local servers"], correct: 1 }
  ],
  "web": [
    { q: "What does HTTP status code 404 represent?", options: ["Unauthorized Access", "Internal Server Error", "Resource Not Found", "Success"], correct: 2 },
    { q: "Which layout model is designed for 1-dimensional alignment (rows or columns)?", options: ["CSS Grid", "Flexbox", "Floats", "Absolute Positioning"], correct: 1 },
    { q: "What is the DOM in web development?", options: ["Domain Objective Mode", "Document Object Model", "Dynamic Output Manager", "Developer Orientation Module"], correct: 1 },
    { q: "Which CSS property controls the space outside an element's border?", options: ["Padding", "Margin", "Border-radius", "Width"], correct: 1 },
    { q: "What does AJAX stand for?", options: ["Advanced Javascript And XML", "Asynchronous JavaScript And XML", "Asynchronous Java And XHTML", "Automatic JSON Accessing XML"], correct: 1 }
  ],
  "aptitude": [
    { q: "If a car travels at 60 km/h, how far will it travel in 45 minutes?", options: ["40 km", "45 km", "50 km", "55 km"], correct: 1 },
    { q: "Complete the sequence: 2, 6, 12, 20, 30, ?", options: ["36", "40", "42", "48"], correct: 2 },
    { q: "A store increases the price of an item by 20%, then discounts it by 20%. What is the net change?", options: ["No change", "4% decrease", "4% increase", "2% decrease"], correct: 1 },
    { q: "If 5 workers build a wall in 12 days, how long would it take 6 workers?", options: ["10 days", "9 days", "8 days", "14 days"], correct: 0 },
    { q: "A bag contains 3 red balls and 7 blue balls. What is the probability of drawing a red ball?", options: ["0.3", "0.7", "0.5", "0.37"], correct: 0 }
  ]
};

// =========================================================================
// GET DYNAMIC ASSESSMENT QUESTIONS BASED ON INTERESTS
// =========================================================================
router.get("/questions", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("interests")
      .eq("id", userId)
      .maybeSingle();

    const { data: userSkills } = await supabaseAdmin
      .from("skills")
      .select("name")
      .eq("user_id", userId);

    const interests = (profile?.interests || []).map((i: string) => i.toLowerCase().trim());
    const skills = (userSkills || []).map((s: any) => s.name.toLowerCase().trim());
    const combinedTokens = [...interests, ...skills];

    let category = "General Aptitude";
    let pool: typeof questionPool["programming"] = [];

    // Categorization logic based on tokens
    const hasAI = combinedTokens.some(t => t.includes("ai") || t.includes("ml") || t.includes("machine") || t.includes("learning") || t.includes("nlp"));
    const hasWeb = combinedTokens.some(t => t.includes("web") || t.includes("html") || t.includes("css") || t.includes("react") || t.includes("js") || t.includes("javascript") || t.includes("frontend") || t.includes("backend"));
    const hasDB = combinedTokens.some(t => t.includes("db") || t.includes("sql") || t.includes("postgres") || t.includes("mongo") || t.includes("database"));
    const hasCloud = combinedTokens.some(t => t.includes("cloud") || t.includes("aws") || t.includes("azure") || t.includes("gcp") || t.includes("docker") || t.includes("kubernetes"));
    const hasProg = combinedTokens.some(t => t.includes("python") || t.includes("java") || t.includes("c++") || t.includes("rust") || t.includes("go") || t.includes("programming") || t.includes("coding"));

    if (hasAI) {
      category = "AI/ML";
      pool = [...questionPool["ai"]];
    } else if (hasWeb) {
      category = "Web Development";
      pool = [...questionPool["web"]];
    } else if (hasDB) {
      category = "Database";
      pool = [...questionPool["database"]];
    } else if (hasCloud) {
      category = "Cloud Computing";
      pool = [...questionPool["cloud"]];
    } else if (hasProg) {
      category = "Programming";
      pool = [...questionPool["programming"]];
    } else {
      category = "General Aptitude";
      pool = [...questionPool["aptitude"]];
    }

    // Mix in 1-2 programming or aptitude questions if pool size is small
    if (pool.length < 5) {
      const fallbackPool = questionPool["programming"];
      pool = [...pool, ...fallbackPool];
    }

    // Shuffle pool
    const shuffled = pool.sort(() => 0.5 - Math.random());
    
    // Take 5 unique questions
    const selectedQuestions = shuffled.slice(0, 5).map((q, idx) => ({
      id: `q_${idx}`,
      q: q.q,
      options: q.options,
      correct: q.correct
    }));

    return res.json({
      category,
      questions: selectedQuestions
    });
  } catch (err: any) {
    console.error("Failed to generate dynamic questions:", err);
    return res.status(500).json({ message: "Failed to generate assessment questions" });
  }
});

// =========================================================================
// GET USER ASSESSMENTS
// =========================================================================
router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("assessments")
      .select("*")
      .eq("user_id", req.user?.id)
      .order("completed_at", { ascending: false });

    if (error) throw error;

    const mapped = (data || []).map(item => ({
      _id: item.id,
      category: item.category,
      score: item.score,
      completedAt: item.completed_at
    }));
    return res.json(mapped);
  } catch (err: any) {
    console.error("Supabase Assessments Fetch Error:", err.message);
    return res.status(500).json({ message: err.message || "Failed to retrieve assessments" });
  }
});

// =========================================================================
// POST SUBMIT ASSESSMENT
// =========================================================================
router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { category, score } = req.body;

  if (!category || score === undefined) {
    return res.status(400).json({ message: "Category and score are required" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("assessments")
      .insert({
        user_id: req.user?.id,
        category,
        score: parseInt(score),
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json({
      _id: data.id,
      category: data.category,
      score: data.score,
      completedAt: data.completed_at
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to submit assessment" });
  }
});

export default router;
