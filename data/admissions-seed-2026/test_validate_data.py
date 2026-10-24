# Regression tests for AI Pathway seed data (standard library only).
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STATUSES = {"verified", "needs_review", "simulated"}


class SeedDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.universities = json.loads((ROOT / "universities.json").read_text(encoding="utf-8"))
        cls.programs = json.loads((ROOT / "programs.json").read_text(encoding="utf-8"))
        cls.cutoffs = json.loads((ROOT / "historical_cutoffs.json").read_text(encoding="utf-8"))

    def test_demo_scope(self):
        self.assertGreaterEqual(len(self.universities), 3)
        self.assertGreaterEqual(len(self.programs), 6)
        self.assertEqual(len(self.cutoffs["records"]), 36)
        self.assertEqual(self.cutoffs["years"], [2023, 2024, 2025])

    def test_ids_unique(self):
        self.assertEqual(len({u["id"] for u in self.universities}), len(self.universities))
        self.assertEqual(len({p["id"] for p in self.programs}), len(self.programs))
        rows = self.cutoffs["records"]
        self.assertEqual(len({r["id"] for r in rows}), len(rows))

    def test_program_university_references(self):
        university_ids = {u["id"] for u in self.universities}
        programs_by_id = {p["id"]: p for p in self.programs}
        self.assertTrue(all(p["universityId"] in university_ids for p in self.programs))
        for row in self.cutoffs["records"]:
            self.assertIn(row["programId"], programs_by_id)
            self.assertEqual(row["universityId"], programs_by_id[row["programId"]]["universityId"])

    def test_unknown_numbers_are_null(self):
        for program in self.programs:
            for key in ("tuitionMinVndPerYear", "tuitionMaxVndPerYear", "tuitionYear", "historicalCutoff", "cutoffYear", "cutoffScale"):
                self.assertIsNone(program[key])

    def test_program_records_need_review(self):
        self.assertTrue(all(p["status"] == "needs_review" for p in self.programs))
        self.assertTrue(all(u["status"] == "needs_review" for u in self.universities))

    def test_method_claims_need_review_without_source_ids(self):
        for program in self.programs:
            for method in program["admissionMethods"]:
                self.assertEqual(method["status"], "needs_review")
                self.assertEqual(method["sourceIds"], [])

    def test_source_status_and_url(self):
        for item in self.universities + self.programs:
            for source in item["sources"]:
                self.assertIn(source["status"], STATUSES)
                self.assertTrue(source["url"].startswith("https://"))

    def test_cutoff_score_scales_and_statuses(self):
        for row in self.cutoffs["records"]:
            self.assertIn(row["status"], STATUSES)
            score, scale = row["cutoffScore"], row["scoreScale"]
            self.assertEqual(score is None, scale is None)
            if score is not None:
                self.assertGreaterEqual(score, 0)
                self.assertGreater(scale, 0)
                self.assertLessEqual(score, scale)

    def test_simulated_cutoffs_are_explicitly_warned(self):
        simulated = [row for row in self.cutoffs["records"] if row["status"] == "simulated"]
        verified = [row for row in self.cutoffs["records"] if row["status"] == "verified"]
        self.assertEqual(len(simulated), 27)
        self.assertEqual(len(verified), 9)
        self.assertTrue(all("SIMULATED FOR DEMO ONLY" in row["notes"] for row in simulated))

    def test_cutoff_method_year_program_combinations_unique(self):
        rows = self.cutoffs["records"]
        keys = [(r["programId"], r["year"], r["method"]) for r in rows]
        self.assertEqual(len(keys), len(set(keys)))


if __name__ == "__main__":
    unittest.main(verbosity=2)
