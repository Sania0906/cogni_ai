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
    app,
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


def _get_inference_module():
    import sys
    for route in app.routes:
        if getattr(route, "path", None) == "/health" and hasattr(route, "endpoint"):
            return sys.modules[route.endpoint.__module__]
    raise RuntimeError("Could not resolve inference_service module from FastAPI app routes")


class TestInferenceAuthentication(unittest.TestCase):
    ENV_KEYS = (
        "APP_ENV",
        "ENVIRONMENT",
        "ENV",
        "NODE_ENV",
        "RENDER",
        "ML_REQUIRE_SECRET",
        "ML_SERVICE_SECRET",
    )

    @classmethod
    def setUpClass(cls):
        load_models()

    def setUp(self):
        self._saved_env = {k: os.environ.get(k) for k in self.ENV_KEYS}
        for k in self.ENV_KEYS:
            os.environ.pop(k, None)

    def tearDown(self):
        for k, v in self._saved_env.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v

    def test_protected_routes_register_verify_service_secret_dependency(self):
        from fastapi import FastAPI
        mod = _get_inference_module()
        verify_service_secret = mod.verify_service_secret

        route_deps = {
            r.path: [getattr(d, "call", None) for d in r.dependant.dependencies]
            for r in app.routes
            if hasattr(r, "dependant")
        }
        self.assertIsInstance(app, FastAPI)
        self.assertIn("/health", route_deps)
        self.assertEqual(route_deps["/health"], [])

        for protected_path in (
            "/models/status",
            "/predict/ats",
            "/predict/ats/upload",
            "/predict/career",
            "/predict/career/upload",
            "/score-candidates",
            "/extract-skills",
        ):
            self.assertIn(protected_path, route_deps)
            self.assertIn(verify_service_secret, route_deps[protected_path])

    def test_missing_secret_fails_closed_in_production(self):
        from fastapi import HTTPException
        mod = _get_inference_module()

        os.environ["APP_ENV"] = "production"
        os.environ["ML_SERVICE_SECRET"] = ""

        # Health endpoint stays available for probes while inference dependency fails closed
        health = mod.health_check()
        self.assertEqual(health.get("status"), "healthy")

        with self.assertRaises(HTTPException) as ctx:
            mod.verify_service_secret(x_ml_service_secret=None)
        self.assertEqual(ctx.exception.status_code, 503)

    def test_render_env_without_secret_also_fails_closed(self):
        from fastapi import HTTPException
        mod = _get_inference_module()

        os.environ["RENDER"] = "true"
        with self.assertRaises(HTTPException) as ctx:
            mod.verify_service_secret(x_ml_service_secret="anything")
        self.assertEqual(ctx.exception.status_code, 503)

    def test_configured_secret_enforced_for_inference_routes(self):
        from fastapi import HTTPException
        mod = _get_inference_module()

        os.environ["APP_ENV"] = "production"
        os.environ["ML_SERVICE_SECRET"] = "test-shared-secret-value"

        with self.assertRaises(HTTPException) as no_hdr_ctx:
            mod.verify_service_secret(x_ml_service_secret=None)
        self.assertEqual(no_hdr_ctx.exception.status_code, 401)

        with self.assertRaises(HTTPException) as bad_hdr_ctx:
            mod.verify_service_secret(x_ml_service_secret="wrong-secret")
        self.assertEqual(bad_hdr_ctx.exception.status_code, 401)

        # Valid shared secret authorizes downstream route execution
        mod.verify_service_secret(x_ml_service_secret="test-shared-secret-value")
        status_res = mod.get_models_status()
        self.assertIn("ats_scorer", status_res)
        self.assertIn("career_classifier", status_res)

        ats_res = mod.predict_ats(
            mod.ATSRequest(
                resume_text="Experienced Python Developer with Django, FastAPI, PostgreSQL, Redis, Docker, and REST APIs.",
                target_role="Python Developer",
            )
        )
        self.assertIn("ats_score", ats_res)

        career_res = mod.predict_career(
            mod.CareerRequest(
                resume_text="Senior DevOps Engineer skilled in Terraform, Kubernetes, Docker, AWS, and CI/CD pipelines.",
            )
        )
        self.assertIn("predicted_role", career_res)

    def test_production_env_detection_matrix(self):
        mod = _get_inference_module()
        self.assertFalse(mod.is_production_environment())

        for env_key in ("APP_ENV", "ENVIRONMENT", "ENV", "NODE_ENV"):
            for prod_val in ("production", "prod", " PRODUCTION "):
                with self.subTest(env_key=env_key, prod_val=prod_val):
                    os.environ[env_key] = prod_val
                    self.assertTrue(mod.is_production_environment())
                    os.environ.pop(env_key, None)

            os.environ[env_key] = "development"
            self.assertFalse(mod.is_production_environment())
            os.environ.pop(env_key, None)

        for flag_key in ("RENDER", "ML_REQUIRE_SECRET"):
            for truthy in ("true", "1", "yes", " YES "):
                with self.subTest(flag_key=flag_key, truthy=truthy):
                    os.environ[flag_key] = truthy
                    self.assertTrue(mod.is_production_environment())
                    os.environ.pop(flag_key, None)

            os.environ[flag_key] = "false"
            self.assertFalse(mod.is_production_environment())
            os.environ.pop(flag_key, None)

    def test_auth_enforcement_missing_and_wrong_secrets_and_error_responses(self):
        from fastapi import HTTPException
        from starlette.requests import Request
        import json
        mod = _get_inference_module()

        # Validate Header metadata on verify_service_secret parameter (ensures FastAPI extracts X-ML-Service-Secret)
        import inspect
        sig = inspect.signature(mod.verify_service_secret)
        param = sig.parameters["x_ml_service_secret"]
        self.assertEqual(getattr(param.default, "alias", None), "X-ML-Service-Secret")

        # 1. APP_ENV=production with empty secret: /health stays 200, inference fails closed with 503
        os.environ["APP_ENV"] = "production"
        os.environ["ML_SERVICE_SECRET"] = ""
        health = mod.health_check()
        self.assertEqual(health.get("status"), "healthy")

        with self.assertRaises(HTTPException) as missing_ctx:
            mod.verify_service_secret(x_ml_service_secret=None)
        self.assertEqual(missing_ctx.exception.status_code, 503)

        # Verify FastAPI HTTPException serializes to expected JSON 503 status
        from fastapi.exception_handlers import http_exception_handler
        dummy_req = Request({"type": "http", "method": "POST", "path": "/predict/ats", "headers": []})
        coro = http_exception_handler(dummy_req, missing_ctx.exception)
        try:
            coro.send(None)
            self.fail("Expected coroutine to return JSONResponse")
        except StopIteration as done:
            resp_503 = done.value
        self.assertEqual(resp_503.status_code, 503)
        self.assertIn("not configured", json.loads(resp_503.body)["detail"].lower())

        # 2. Configured secret: missing, empty, or wrong header fails with HTTP 401
        os.environ["ML_SERVICE_SECRET"] = "asgi-shared-secret-value"
        for bad_header in (None, "", "   ", "wrong-secret", "asgi-shared-secret-valu"):
            with self.subTest(bad_header=bad_header):
                with self.assertRaises(HTTPException) as bad_ctx:
                    mod.verify_service_secret(x_ml_service_secret=bad_header)
                self.assertEqual(bad_ctx.exception.status_code, 401)
                bad_coro = http_exception_handler(dummy_req, bad_ctx.exception)
                try:
                    bad_coro.send(None)
                    self.fail("Expected coroutine to return JSONResponse")
                except StopIteration as done:
                    resp_401 = done.value
                self.assertEqual(resp_401.status_code, 401)

        # Valid secret succeeds
        self.assertIsNone(mod.verify_service_secret(x_ml_service_secret="asgi-shared-secret-value"))


if __name__ == "__main__":
    unittest.main()
