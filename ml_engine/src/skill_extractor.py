"""
CognifyAI Machine Learning Engine - Skill Extractor Module
Provides canonical technology taxonomy matching using RapidFuzz
and exact acronym matching for high-precision extraction.
"""

import re
from typing import Dict, List, Set, Tuple, Any
from rapidfuzz import fuzz


# Canonical Tech Taxonomy: Category -> List of (Canonical Name, Aliases)
CANONICAL_SKILLS_TAXONOMY: Dict[str, List[Dict[str, Any]]] = {
    "Programming Languages": [
        {"name": "Python", "aliases": ["python3", "py"]},
        {"name": "JavaScript", "aliases": ["js", "es6", "vanilla js"]},
        {"name": "TypeScript", "aliases": ["ts"]},
        {"name": "Java", "aliases": ["core java", "j2ee"]},
        {"name": "C++", "aliases": ["cpp"]},
        {"name": "C#", "aliases": ["csharp", ".net c#"]},
        {"name": "Go", "aliases": ["golang"]},
        {"name": "Rust", "aliases": []},
        {"name": "SQL", "aliases": ["structured query language"]},
        {"name": "HTML5", "aliases": ["html"]},
        {"name": "CSS3", "aliases": ["css", "scss", "sass"]},
        {"name": "Kotlin", "aliases": []},
        {"name": "Swift", "aliases": []},
        {"name": "Scala", "aliases": []},
        {"name": "Ruby", "aliases": []},
        {"name": "PHP", "aliases": []},
        {"name": "Bash", "aliases": ["shell", "zsh", "bash scripting"]},
        {"name": "R", "aliases": ["r programming"]},
    ],
    "Frameworks & Libraries": [
        {"name": "React", "aliases": ["react.js", "reactjs"]},
        {"name": "Next.js", "aliases": ["nextjs"]},
        {"name": "Node.js", "aliases": ["nodejs", "node"]},
        {"name": "Express.js", "aliases": ["express", "expressjs"]},
        {"name": "Django", "aliases": ["django rest framework", "drf"]},
        {"name": "FastAPI", "aliases": []},
        {"name": "Flask", "aliases": []},
        {"name": "Spring Boot", "aliases": ["spring", "springboot"]},
        {"name": "NestJS", "aliases": ["nest.js"]},
        {"name": "Vue.js", "aliases": ["vue", "vuejs"]},
        {"name": "Angular", "aliases": ["angularjs", "angular 2+"]},
        {"name": "TailwindCSS", "aliases": ["tailwind", "tailwind css"]},
        {"name": "Bootstrap", "aliases": []},
        {"name": "Redux", "aliases": ["redux toolkit", "rtk"]},
        {"name": "ASP.NET", "aliases": [".net core", "dotnet"]},
    ],
    "Databases & Storage": [
        {"name": "PostgreSQL", "aliases": ["postgres", "postgresql"]},
        {"name": "MongoDB", "aliases": ["mongo"]},
        {"name": "MySQL", "aliases": []},
        {"name": "Redis", "aliases": ["redis cache"]},
        {"name": "SQLite", "aliases": []},
        {"name": "Elasticsearch", "aliases": ["elastic search", "elk"]},
        {"name": "Cassandra", "aliases": ["apache cassandra"]},
        {"name": "DynamoDB", "aliases": ["aws dynamodb"]},
        {"name": "Supabase", "aliases": []},
        {"name": "Firebase", "aliases": ["firestore"]},
    ],
    "Cloud & DevOps": [
        {"name": "AWS", "aliases": ["amazon web services", "amazon aws"]},
        {"name": "Azure", "aliases": ["microsoft azure"]},
        {"name": "Google Cloud", "aliases": ["gcp", "google cloud platform"]},
        {"name": "Docker", "aliases": ["containerization", "docker containers"]},
        {"name": "Kubernetes", "aliases": ["k8s"]},
        {"name": "Terraform", "aliases": ["iac", "infrastructure as code"]},
        {"name": "CI/CD", "aliases": ["continuous integration", "continuous delivery", "github actions", "gitlab ci", "jenkins"]},
        {"name": "Linux", "aliases": ["unix", "ubuntu", "redhat", "centos"]},
        {"name": "Nginx", "aliases": []},
        {"name": "Ansible", "aliases": []},
    ],
    "AI & Data Science": [
        {"name": "Machine Learning", "aliases": ["ml", "supervised learning", "unsupervised learning"]},
        {"name": "Deep Learning", "aliases": ["neural networks", "dl"]},
        {"name": "PyTorch", "aliases": ["torch"]},
        {"name": "TensorFlow", "aliases": ["tf", "keras"]},
        {"name": "Scikit-Learn", "aliases": ["sklearn", "scikit learn"]},
        {"name": "Pandas", "aliases": []},
        {"name": "NumPy", "aliases": []},
        {"name": "NLP", "aliases": ["natural language processing", "spacy", "nltk", "transformers", "huggingface"]},
        {"name": "Computer Vision", "aliases": ["opencv", "image processing"]},
        {"name": "MLOps", "aliases": ["model deployment", "ml pipeline", "mlflow"]},
        {"name": "Apache Spark", "aliases": ["pyspark", "spark"]},
        {"name": "LLMs", "aliases": ["large language models", "generative ai", "langchain", "prompt engineering"]},
    ],
    "Software Architecture & Methodology": [
        {"name": "Git", "aliases": ["github", "gitlab", "version control"]},
        {"name": "REST APIs", "aliases": ["rest", "restful api", "web api"]},
        {"name": "GraphQL", "aliases": []},
        {"name": "Microservices", "aliases": ["microservice architecture"]},
        {"name": "System Design", "aliases": ["distributed systems", "high availability", "scalability"]},
        {"name": "Agile", "aliases": ["scrum", "sprints", "kanban"]},
        {"name": "Unit Testing", "aliases": ["pytest", "jest", "tdd", "test driven development"]},
    ]
}

# Short acronyms where fuzzy matching could produce false positives
EXACT_MATCH_ONLY: Set[str] = {
    "go", "c++", "c#", "r", "sql", "git", "aws", "gcp", "ml", "nlp", "k8s", "js", "ts", "dl", "iac", "elk"
}


class SkillExtractor:
    def __init__(self, fuzzy_threshold: float = 88.0):
        self.fuzzy_threshold = fuzzy_threshold
        self._build_lookup()

    def _build_lookup(self):
        """Constructs fast exact and fuzzy lookup dictionaries."""
        self.canonical_map: Dict[str, str] = {}
        self.category_map: Dict[str, str] = {}
        self.all_terms: List[str] = []

        for category, skill_list in CANONICAL_SKILLS_TAXONOMY.items():
            for item in skill_list:
                canonical = item["name"]
                self.category_map[canonical] = category
                
                # Register canonical
                self.canonical_map[canonical.lower()] = canonical
                self.all_terms.append(canonical.lower())

                # Register aliases
                for alias in item["aliases"]:
                    self.canonical_map[alias.lower()] = canonical
                    self.all_terms.append(alias.lower())

    def extract_skills(self, text: str) -> Dict[str, Any]:
        """
        Extracts technology skills from freeform text using a hybrid
        exact-token and RapidFuzz matching approach.
        """
        if not text:
            return {"matched_skills": [], "skills_by_category": {}, "skill_count": 0}

        cleaned_text = text.lower()
        # Word boundary tokenization preserving +, #, .
        words = re.findall(r'[a-zA-Z0-9+#.]+', cleaned_text)
        
        # Build n-grams up to 3 words
        tokens = set(words)
        for i in range(len(words) - 1):
            tokens.add(f"{words[i]} {words[i+1]}")
        for i in range(len(words) - 2):
            tokens.add(f"{words[i]} {words[i+1]} {words[i+2]}")

        matched_canonical: Set[str] = set()

        for token in tokens:
            # 1. Exact match against canonical or alias
            if token in self.canonical_map:
                matched_canonical.add(self.canonical_map[token])
                continue

            # 2. Skip fuzzy matching for short acronyms to avoid false positives
            if token in EXACT_MATCH_ONLY or len(token) <= 3:
                continue

            # 3. Fuzzy match for longer terms
            for term in self.all_terms:
                if term in EXACT_MATCH_ONLY or len(term) <= 3:
                    continue
                ratio = fuzz.ratio(token, term)
                if ratio >= self.fuzzy_threshold:
                    matched_canonical.add(self.canonical_map[term])

        matched_sorted = sorted(list(matched_canonical))

        # Group by category
        by_category: Dict[str, List[str]] = {}
        for skill in matched_sorted:
            cat = self.category_map.get(skill, "Other")
            by_category.setdefault(cat, []).append(skill)

        return {
            "matched_skills": matched_sorted,
            "skills_by_category": by_category,
            "skill_count": len(matched_sorted),
        }

    def compute_skill_coverage(
        self,
        resume_skills: List[str],
        required_skills: List[str]
    ) -> Dict[str, Any]:
        """
        Calculates skill overlap, missing required skills, and coverage ratio
        between candidate skills and target job requirements.
        """
        resume_set = set(resume_skills)
        required_set = set(required_skills)

        matched_required = sorted(list(resume_set.intersection(required_set)))
        missing_required = sorted(list(required_set.difference(resume_set)))
        additional_skills = sorted(list(resume_set.difference(required_set)))

        coverage_ratio = (
            len(matched_required) / len(required_set) if len(required_set) > 0 else 1.0
        )

        return {
            "matched_required": matched_required,
            "missing_required": missing_required,
            "additional_skills": additional_skills,
            "coverage_percentage": round(coverage_ratio * 100, 2),
            "required_count": len(required_set),
            "matched_count": len(matched_required),
            "missing_count": len(missing_required),
        }

