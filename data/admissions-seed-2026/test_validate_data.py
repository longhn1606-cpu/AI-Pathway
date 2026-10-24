"""Regression tests for AI Pathway seed data (stdlib only)."""
import json
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parent

class SeedDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.universities = json.loads((ROOT/"universities.json").read_text(encoding="utf-8"))
        cls.programs = json.loads((ROOT/"programs.json").read_text(encoding="utf-8"))

    def test_demo_scope(self):
        self.assertGreaterEqual(len(self.universities), 3)
        self.assertGreaterEqual(len(self.programs), 6)

    def test_ids_unique(self):
        self.assertEqual(len({u["id"] for u in self.universities}), len(self.universities))
        self.assertEqual(len({p["id"] for p in self.programs}), len(self.programs))

    def test_program_university_references(self):
        ids = {u["id"] for u in self.universities}
        self.assertTrue(all(p["universityId"] in ids for p in self.programs))

    def test_unknown_numbers_are_null(self):
        for p in self.programs:
            for k in ("tuitionMinVndPerYear","tuitionMaxVndPerYear","tuitionYear","historicalCutoff","cutoffYear","cutoffScale"):
                self.assertIsNone(p[k])

    def test_program_records_need_review(self):
        self.assertTrue(all(p["status"] == "needs_review" for p in self.programs))
        self.assertTrue(all(u["status"] == "needs_review" for u in self.universities))

    def test_method_claims_need_review_without_source_ids(self):
        for p in self.programs:
            for m in p["admissionMethods"]:
                self.assertEqual(m["status"], "needs_review")
                self.assertEqual(m["sourceIds"], [])

    def test_source_status_and_url(self):
        for item in self.universities + self.programs:
            for s in item["sources"]:
                self.assertIn(s["status"], {"verified","needs_review","simulated"})
                self.assertTrue(s["url"].startswith("https://"))

if __name__ == "__main__":
    unittest.main(verbosity=2)
