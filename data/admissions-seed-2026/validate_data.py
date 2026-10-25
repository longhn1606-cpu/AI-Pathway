#!/usr/bin/env python3
"""Structural validation for the AI Pathway demo dataset. Standard library only."""
import json
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
STATUSES = {"verified", "needs_review", "simulated"}
METHODS = {"high_school_exam", "academic_record", "competency_assessment", "direct_admission", "other"}
UNIVERSITY_KEYS = {"id", "name", "shortName", "province", "region", "website", "sources", "status"}
PROGRAM_KEYS = {"id", "universityId", "name", "majorGroup", "tuitionMinVndPerYear", "tuitionMaxVndPerYear", "tuitionYear", "admissionMethods", "historicalCutoff", "cutoffYear", "cutoffScale", "sources", "status"}
SOURCE_KEYS = {"title", "url", "applicableYear", "checkedAt", "status"}
METHOD_KEYS = {"method", "description", "applicableYear", "sourceIds", "status"}
CUTOFF_KEYS = {"id", "programId", "universityId", "year", "method", "cutoffScore", "scoreScale", "sourceUrl", "checkedAt", "status", "notes"}
errors, warnings = [], []


def load_json(name):
    try:
        return json.loads((ROOT / name).read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"{name}: invalid JSON ({exc})")
        return None


def check_https(url, where):
    parsed = urlparse(url if isinstance(url, str) else "")
    if parsed.scheme != "https" or not parsed.netloc:
        errors.append(f"{where}: URL must be HTTPS")


def check_date(value, where):
    try:
        date.fromisoformat(value)
    except (ValueError, TypeError):
        errors.append(f"{where}: date must use ISO format YYYY-MM-DD")


def check_source(source, where):
    if not isinstance(source, dict):
        errors.append(f"{where}: source must be object")
        return
    if set(source) != SOURCE_KEYS:
        errors.append(f"{where}: source keys mismatch")
    for key in ("title", "url", "checkedAt"):
        if not isinstance(source.get(key), str) or not source[key].strip():
            errors.append(f"{where}: {key} required")
    check_https(source.get("url", ""), where)
    check_date(source.get("checkedAt", ""), where)
    if type(source.get("applicableYear")) is not int or source["applicableYear"] < 2000:
        errors.append(f"{where}: invalid applicableYear")
    if source.get("status") not in STATUSES:
        errors.append(f"{where}: invalid source status")


def load_array(name):
    value = load_json(name)
    if not isinstance(value, list):
        errors.append(f"{name}: root must be array")
        return []
    return value


universities = load_array("universities.json")
programs = load_array("programs.json")
cutoff_data = load_json("historical_cutoffs.json")
uids, pids, cutoff_ids = set(), set(), set()
university_by_id, program_by_id = {}, {}

for i, university in enumerate(universities):
    where = f"universities[{i}]"
    if not isinstance(university, dict):
        errors.append(f"{where}: must be object")
        continue
    if set(university) != UNIVERSITY_KEYS:
        errors.append(f"{where}: keys mismatch")
    uid = university.get("id")
    if not isinstance(uid, str) or not uid.strip():
        errors.append(f"{where}: id required")
    elif uid in uids:
        errors.append(f"{where}: duplicate id {uid}")
    else:
        uids.add(uid)
        university_by_id[uid] = university
    if university.get("region") not in {"north", "central", "south"}:
        errors.append(f"{where}: invalid region")
    if university.get("status") not in STATUSES:
        errors.append(f"{where}: invalid status")
    for j, source in enumerate(university.get("sources", [])):
        check_source(source, f"{where}.sources[{j}]")

for i, program in enumerate(programs):
    where = f"programs[{i}]"
    if not isinstance(program, dict):
        errors.append(f"{where}: must be object")
        continue
    if set(program) != PROGRAM_KEYS:
        errors.append(f"{where}: keys mismatch")
    pid = program.get("id")
    if not isinstance(pid, str) or not pid.strip():
        errors.append(f"{where}: id required")
    elif pid in pids:
        errors.append(f"{where}: duplicate id {pid}")
    else:
        pids.add(pid)
        program_by_id[pid] = program
    if program.get("universityId") not in uids:
        errors.append(f"{where}: unknown universityId")
    if program.get("status") not in STATUSES:
        errors.append(f"{where}: invalid status")
    for key in ("tuitionMinVndPerYear", "tuitionMaxVndPerYear", "tuitionYear", "historicalCutoff", "cutoffYear", "cutoffScale"):
        value = program.get(key)
        if value is not None and (type(value) not in (int, float) or value < 0):
            errors.append(f"{where}.{key}: must be null or non-negative")
    if program.get("tuitionMinVndPerYear") is not None and program.get("tuitionMaxVndPerYear") is not None and program["tuitionMinVndPerYear"] > program["tuitionMaxVndPerYear"]:
        errors.append(f"{where}: tuition min > max")
    for j, source in enumerate(program.get("sources", [])):
        check_source(source, f"{where}.sources[{j}]")
    for j, method in enumerate(program.get("admissionMethods", [])):
        mw = f"{where}.admissionMethods[{j}]"
        if not isinstance(method, dict) or set(method) != METHOD_KEYS:
            errors.append(f"{mw}: method object/keys invalid")
            continue
        if method.get("method") not in METHODS:
            errors.append(f"{mw}: invalid method")
        if method.get("status") not in STATUSES:
            errors.append(f"{mw}: invalid status")
        if not isinstance(method.get("sourceIds"), list) or not all(isinstance(x, str) for x in method["sourceIds"]):
            errors.append(f"{mw}: sourceIds must be string array")
        if method.get("status") == "verified":
            refs = method.get("sourceIds", [])
            if not refs:
                errors.append(f"{mw}: verified method needs sourceIds")
            for ref in refs if isinstance(refs, list) else []:
                matches = [s for s in program.get("sources", []) if isinstance(s, dict) and s.get("title") == ref]
                if len(matches) != 1:
                    errors.append(f"{mw}: verified sourceId must resolve to exactly one program source")
                elif matches[0].get("status") != "verified" or matches[0].get("applicableYear") != method.get("applicableYear"):
                    errors.append(f"{mw}: verified source must be verified and match applicableYear")
        if not method.get("sourceIds"):
            warnings.append(f"{mw}: empty sourceIds; shared DataSource schema has no id")

if not isinstance(cutoff_data, dict):
    errors.append("historical_cutoffs.json: root must be object")
    cutoff_data = {}
cutoff_records = cutoff_data.get("records", [])
if not isinstance(cutoff_records, list):
    errors.append("historical_cutoffs.json: records must be array")
    cutoff_records = []
years = cutoff_data.get("years")
if not isinstance(years, list) or not all(type(year) is int for year in years):
    errors.append("historical_cutoffs.json: years must be an integer array")
else:
    record_years = sorted({r.get("year") for r in cutoff_records if isinstance(r, dict) and type(r.get("year")) is int})
    if sorted(set(years)) != record_years:
        errors.append("historical_cutoffs.json: years must match years present in records")

for i, record in enumerate(cutoff_records):
    where = f"historical_cutoffs.records[{i}]"
    if not isinstance(record, dict):
        errors.append(f"{where}: must be object")
        continue
    if set(record) != CUTOFF_KEYS:
        errors.append(f"{where}: keys mismatch")
    rid = record.get("id")
    if not isinstance(rid, str) or not rid.strip():
        errors.append(f"{where}: id required")
    elif rid in cutoff_ids:
        errors.append(f"{where}: duplicate id {rid}")
    else:
        cutoff_ids.add(rid)
    program_id, university_id = record.get("programId"), record.get("universityId")
    if program_id not in program_by_id:
        errors.append(f"{where}: unknown programId")
    elif program_by_id[program_id].get("universityId") != university_id:
        errors.append(f"{where}: universityId does not match referenced program")
    if university_id not in uids:
        errors.append(f"{where}: unknown universityId")
    if type(record.get("year")) is not int or record["year"] < 2000:
        errors.append(f"{where}: invalid year")
    if record.get("method") not in METHODS:
        errors.append(f"{where}: invalid method")
    score, scale = record.get("cutoffScore"), record.get("scoreScale")
    if score is not None and (type(score) not in (int, float) or score < 0):
        errors.append(f"{where}: cutoffScore must be null or non-negative")
    if scale is not None and (type(scale) not in (int, float) or scale <= 0):
        errors.append(f"{where}: scoreScale must be null or positive")
    if (score is None) != (scale is None):
        errors.append(f"{where}: cutoffScore and scoreScale must both be null or both be numeric")
    if score is not None and scale is not None and score > scale:
        errors.append(f"{where}: cutoffScore exceeds scoreScale")
    check_https(record.get("sourceUrl", ""), where)
    check_date(record.get("checkedAt", ""), where)
    if record.get("status") not in STATUSES:
        errors.append(f"{where}: invalid status")
    if not isinstance(record.get("notes"), str):
        errors.append(f"{where}: notes must be string")
    if record.get("status") == "simulated" and "SIMULATED FOR DEMO ONLY" not in record.get("notes", ""):
        errors.append(f"{where}: simulated record must carry an explicit warning")
    if record.get("status") == "verified" and score is None:
        errors.append(f"{where}: verified record cannot have a null score")

if len(universities) < 3:
    warnings.append("fewer than 3 universities")
if len(programs) < 6:
    warnings.append("fewer than 6 programs")
if len(cutoff_records) != 36:
    errors.append(f"expected 36 demo cutoff rows; found {len(cutoff_records)}")

counts = {status: sum(1 for record in cutoff_records if isinstance(record, dict) and record.get("status") == status) for status in sorted(STATUSES)}
print(f"Universities: {len(universities)}")
print(f"Programs: {len(programs)}")
print(f"Historical cutoff rows: {len(cutoff_records)} ({', '.join(f'{key}={value}' for key, value in counts.items())})")
print(f"Errors: {len(errors)} | Warnings: {len(warnings)}")
for message in errors:
    print("ERROR " + message)
for message in warnings:
    print("WARN  " + message)
if errors:
    sys.exit(1)
print("STRUCTURAL CHECKS PASSED; source accuracy and browser-level app behavior still require manual review.")
