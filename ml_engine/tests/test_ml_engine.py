"""
CognifyAI Machine Learning Engine - Automated Test Suite
Validates text preprocessing, canonical skill extraction, ATS scoring,
career trajectory classification, and API endpoint handlers.
"""

import sys
import os
import unittest
import numpy as np

# Ensure src is on sys.path
SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../src"))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from preprocessing import clean_text, detect_sections, EmptyDocumentError
from skill_extractor import SkillExtractor
from ats_predictor import ATSPredictor
from career_predictor import CareerPredictor
from inference_service import (
    health_check,
    get_models_status,
    predict_ats,
    predict_career,
    score_candidates,
    extract_skills,
    ATSRequest,
    CareerRequest,
    ScoreCandidatesRequest,
    ExtractSkillsRequest,
    CandidateItem,
    load_models
)


class TestPreprocessing(unittest.TestCase):
    def test_clean_text_removes_noise_and_preserves_tech_symbols(self):
        dirty = "Contact me at dev@example.com or 555-123-4567. Check https://github.com/test. Expert in C++, C#, .NET, Node.js and React!"
        cleaned = clean_text(dirty)
        self.assertNotIn("dev@example.com", cleaned)
        self.assertNotIn("555-123-4567", cleaned)
        self.assertNotIn("https://github.com", cleaned)
        self.assertIn("C++", cleaned)
        self.assertIn("C#", cleaned)
        self.assertIn(".NET", cleaned)
        self.assertIn("Node.js", cleaned)
        self.assertIn("React", cleaned)

    def test_detect_sections_completeness(self):
        resume = """
        Professional Summary: Experienced developer.
        Work Experience: 3 years at Tech Corp.
        Education: BS Computer Science.
        Technical Skills: Python, Docker, SQL.
        Projects: Built high-throughput API gateway.
        """
        sec = detect_sections(resume)
        self.assertEqual(sec["completeness_score"], 100)
        self.assertTrue(sec["sections_detected"]["summary"])
        self.assertTrue(sec["sections_detected"]["experience"])
        self.assertTrue(sec["sections_detected"]["education"])
        self.assertTrue(sec["sections_detected"]["skills"])
        self.assertTrue(sec["sections_detected"]["projects_or_certifications"])

    def test_detect_sections_partial(self):
        resume = "Just some unformatted text without any section headers."
        sec = detect_sections(resume)
        self.assertLess(sec["completeness_score"], 50)
        self.assertGreater(len(sec["recommendations"]), 0)


class TestSkillExtractor(unittest.TestCase):
    def setUp(self):
        self.extractor = SkillExtractor()

    def test_canonical_extraction(self):
        text = "Deep experience in Python, PyTorch, Scikit-Learn, Docker, and PostgreSQL database administration."
        res = self.extractor.extract_skills(text)
        skills = res["matched_skills"]
        self.assertIn("Python", skills)
        self.assertIn("PyTorch", skills)
        self.assertIn("Scikit-Learn", skills)
        self.assertIn("Docker", skills)
        self.assertIn("PostgreSQL", skills)
        self.assertGreaterEqual(res["skill_count"], 5)

    def test_acronym_avoidance_false_positive(self):
        # Words containing 'go' or 'r' shouldn't falsely match 'Go' or 'R'
        text = "Going to the store with my friend and reading books."
        res = self.extractor.extract_skills(text)
        self.assertNotIn("Go", res["matched_skills"])
        self.assertNotIn("R", res["matched_skills"])

    def test_skill_coverage_computation(self):
        candidate_skills = ["Python", "Docker", "Git", "React"]
        required_skills = ["Python", "Docker", "Kubernetes", "AWS"]
        cov = self.extractor.compute_skill_coverage(candidate_skills, required_skills)
        self.assertEqual(cov["matched_required"], ["Docker", "Python"])
        self.assertEqual(cov["missing_required"], ["AWS", "Kubernetes"])
        self.assertEqual(cov["additional_skills"], ["Git", "React"])
        self.assertEqual(cov["coverage_percentage"], 50.0)


class TestATSPredictor(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = ATSPredictor()

    def test_score_range_and_breakdown(self):
        resume = """
        Full Stack Engineer with 5 years experience in React, TypeScript, Node.js, Express.js, PostgreSQL, Docker, REST APIs.
        Education: Bachelor of Technology in Computer Science.
        Experience: Senior Developer at CloudTech building high-traffic web applications.
        Projects: Developed scalable e-commerce microservices with Redis and PostgreSQL.
        Certifications: AWS Certified Solutions Architect.
        """
        res = self.predictor.score_resume(resume, target_role="Full Stack Developer")
        self.assertGreaterEqual(res["ats_score"], 0.0)
        self.assertLessEqual(res["ats_score"], 100.0)
        self.assertIn("score_breakdown", res)
        self.assertIn("matched_skills", res)
        self.assertIn("missing_required_skills", res)
        self.assertGreaterEqual(len(res["matched_skills"]), 3)

    def test_domain_discrimination(self):
        # A Data Science resume should score higher for Data Scientist than for Frontend Developer
        ds_resume = """
        Data Scientist specializing in Machine Learning, Python, PyTorch, Scikit-Learn, Pandas, NumPy, SQL, statistical modeling.
        Experience: 4 years as Machine Learning Specialist developing neural networks.
        Education: MS in Data Science and Statistics.
        """
        ds_score = self.predictor.score_resume(ds_resume, target_role="Data Scientist")["ats_score"]
        fe_score = self.predictor.score_resume(ds_resume, target_role="Frontend Developer")["ats_score"]
        self.assertGreater(ds_score, fe_score, "Data Science resume should score higher for Data Scientist than Frontend Developer")


class TestCareerPredictor(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = CareerPredictor()

    def test_career_prediction_schema(self):
        resume = """
        Data Analyst with extensive SQL, PostgreSQL database query optimization, Python, Pandas, Tableau, and business intelligence dashboards.
        """
        res = self.predictor.predict_career(resume)
        self.assertEqual(res["predicted_role"], "Data Analyst")
        self.assertGreaterEqual(res["confidence_score"], 0.50)
        self.assertIn("alternative_trajectories", res)
        self.assertIn("role_readiness", res)
        self.assertIn("career_transition_advice", res)


class TestInferenceHandlers(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        load_models()

    def test_health_handler(self):
        data = health_check()
        self.assertEqual(data["status"], "healthy")
        self.assertTrue(data["models_loaded"]["ats_scorer"])
        self.assertTrue(data["models_loaded"]["career_classifier"])

    def test_models_status_handler(self):
        data = get_models_status()
        self.assertIn("ats_scorer", data)
        self.assertIn("career_classifier", data)
        self.assertEqual(data["ats_scorer"]["status"], "loaded")
        self.assertEqual(data["career_classifier"]["status"], "loaded")

    def test_predict_ats_handler(self):
        payload = ATSRequest(
            resume_text="Experienced Python Developer with Django, FastAPI, PostgreSQL, Redis, Docker, and REST APIs.",
            target_role="Python Developer"
        )
        data = predict_ats(payload)
        self.assertIn("ats_score", data)
        self.assertIn("matched_skills", data)
        self.assertGreater(data["ats_score"], 50)

    def test_predict_career_handler(self):
        payload = CareerRequest(
            resume_text="Experienced Cloud and DevOps Engineer working with AWS, Docker, Kubernetes, Terraform, Linux, CI/CD pipelines, and GitHub Actions."
        )
        data = predict_career(payload)
        self.assertIn(data["predicted_role"], ["DevOps Engineer", "Cloud Engineer"])

    def test_score_candidates_handler(self):
        payload = ScoreCandidatesRequest(
            target_role="Data Scientist",
            candidates=[
                CandidateItem(
                    id="cand-1",
                    name="Alice ML",
                    resume_text="Data Scientist with Python, Machine Learning, Scikit-Learn, Pandas, NumPy, SQL, PyTorch."
                ),
                CandidateItem(
                    id="cand-2",
                    name="Bob Frontend",
                    resume_text="Frontend Developer with HTML5, CSS3, React, TailwindCSS, Next.js."
                )
            ]
        )
        data = score_candidates(payload)
        self.assertEqual(data["total_evaluated"], 2)
        # Alice should be ranked #1 for Data Scientist
        self.assertEqual(data["ranked_candidates"][0]["candidate_id"], "cand-1")
        self.assertGreater(data["ranked_candidates"][0]["ats_score"], data["ranked_candidates"][1]["ats_score"])

    def test_extract_skills_handler(self):
        payload = ExtractSkillsRequest(text="Full stack React and Node.js developer with MongoDB.")
        data = extract_skills(payload)
        self.assertIn("React", data["matched_skills"])
        self.assertIn("Node.js", data["matched_skills"])
        self.assertIn("MongoDB", data["matched_skills"])


if __name__ == "__main__":
    unittest.main()
