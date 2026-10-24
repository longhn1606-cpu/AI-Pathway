#!/usr/bin/env python3
"""Structural checks for the AI Pathway admissions seed. Python standard library only."""
import json, sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
STATUSES = {"verified", "needs_review", "simulated"}
METHODS = {"high_school_exam", "academic_record", "competency_assessment", "direct_admission", "other"}
UNIVERSITY_KEYS = {"id","name","shortName","province","region","website","sources","status"}
PROGRAM_KEYS = {"id","universityId","name","majorGroup","tuitionMinVndPerYear","tuitionMaxVndPerYear","tuitionYear","admissionMethods","historicalCutoff","cutoffYear","cutoffScale","sources","status"}
SOURCE_KEYS = {"title","url","applicableYear","checkedAt","status"}
METHOD_KEYS = {"method","description","applicableYear","sourceIds","status"}
errors, warnings = [], []

def check_source(src, where):
    if not isinstance(src, dict): errors.append(f"{where}: source must be object"); return
    if set(src) != SOURCE_KEYS: errors.append(f"{where}: source keys mismatch")
    if not all(isinstance(src.get(k), str) and src[k].strip() for k in ("title","url","checkedAt")): errors.append(f"{where}: title/url/checkedAt required")
    u = urlparse(src.get("url",""))
    if u.scheme != "https" or not u.netloc: errors.append(f"{where}: URL must be HTTPS")
    try: date.fromisoformat(src.get("checkedAt",""))
    except (ValueError, TypeError): errors.append(f"{where}: checkedAt must be ISO date")
    if type(src.get("applicableYear")) is not int or src["applicableYear"] < 2000: errors.append(f"{where}: invalid applicableYear")
    if src.get("status") not in STATUSES: errors.append(f"{where}: invalid source status")

def load(name):
    try: data = json.loads((ROOT/name).read_text(encoding="utf-8"))
    except Exception as e: errors.append(f"{name}: invalid JSON ({e})"); return []
    if not isinstance(data,list): errors.append(f"{name}: root must be array"); return []
    return data

universities, programs = load("universities.json"), load("programs.json")
uids, pids = set(), set()
for i,u in enumerate(universities):
    w=f"universities[{i}]"
    if not isinstance(u,dict): errors.append(f"{w}: must be object"); continue
    if set(u) != UNIVERSITY_KEYS: errors.append(f"{w}: keys mismatch")
    if not isinstance(u.get("id"),str) or not u["id"].strip(): errors.append(f"{w}: id required")
    elif u["id"] in uids: errors.append(f"{w}: duplicate id {u['id']}")
    else: uids.add(u["id"])
    if u.get("region") not in {"north","central","south"}: errors.append(f"{w}: invalid region")
    if u.get("status") not in STATUSES: errors.append(f"{w}: invalid status")
    for j,s in enumerate(u.get("sources",[])): check_source(s,f"{w}.sources[{j}]")
for i,p in enumerate(programs):
    w=f"programs[{i}]"
    if not isinstance(p,dict): errors.append(f"{w}: must be object"); continue
    if set(p) != PROGRAM_KEYS: errors.append(f"{w}: keys mismatch")
    if not isinstance(p.get("id"),str) or not p["id"].strip(): errors.append(f"{w}: id required")
    elif p["id"] in pids: errors.append(f"{w}: duplicate id {p['id']}")
    else: pids.add(p["id"])
    if p.get("universityId") not in uids: errors.append(f"{w}: unknown universityId")
    if p.get("status") not in STATUSES: errors.append(f"{w}: invalid status")
    for k in ("tuitionMinVndPerYear","tuitionMaxVndPerYear","tuitionYear","historicalCutoff","cutoffYear","cutoffScale"):
        v=p.get(k)
        if v is not None and (type(v) not in (int,float) or v < 0): errors.append(f"{w}.{k}: must be null or non-negative")
    if p.get("tuitionMinVndPerYear") is not None and p.get("tuitionMaxVndPerYear") is not None and p["tuitionMinVndPerYear"] > p["tuitionMaxVndPerYear"]: errors.append(f"{w}: tuition min > max")
    for j,s in enumerate(p.get("sources",[])): check_source(s,f"{w}.sources[{j}]")
    for j,m in enumerate(p.get("admissionMethods",[])):
        mw=f"{w}.admissionMethods[{j}]"
        if not isinstance(m,dict) or set(m) != METHOD_KEYS: errors.append(f"{mw}: method object/keys invalid"); continue
        if m.get("method") not in METHODS: errors.append(f"{mw}: invalid method")
        if m.get("status") not in STATUSES: errors.append(f"{mw}: invalid status")
        if not isinstance(m.get("sourceIds"),list) or not all(isinstance(x,str) for x in m["sourceIds"]): errors.append(f"{mw}: sourceIds must be string array")
        if m.get("status") == "verified" and not m.get("sourceIds"): errors.append(f"{mw}: verified method needs sourceIds")
        if not m.get("sourceIds"): warnings.append(f"{mw}: empty sourceIds; DataSource schema has no id")
if len(universities)<3: warnings.append("fewer than 3 universities")
if len(programs)<6: warnings.append("fewer than 6 programs")
print(f"Universities: {len(universities)}")
print(f"Programs: {len(programs)}")
print(f"Errors: {len(errors)} | Warnings: {len(warnings)}")
for x in errors+warnings: print(("ERROR " if x in errors else "WARN  ")+x)
if errors: sys.exit(1)
print("STRUCTURAL CHECKS PASSED; manual source and app integration review still required.")
