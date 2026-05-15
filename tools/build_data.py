#!/usr/bin/env python3
"""
Build script for GMAT Math Trainer.
Reads JSON files from data/ and generates js/questions-data.js bundle.

Usage:  python3 tools/build_data.py
"""

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, 'data')
MANIFEST = os.path.join(DATA_DIR, 'manifest.json')
OUTPUT = os.path.join(ROOT, 'js', 'questions-data.js')

# Map manifest keys to folder names
FOLDER_MAP = {
    'wordProblems': 'word-problems',
    'brainTeasers': 'brain-teasers',
    'numberTheory': 'number-theory',
    'estimation': 'estimation',
    'dataSufficiency': 'data-sufficiency',
    'errorDetection': 'error-detection',
    'fastQuant': 'fast-quant',
    'quantStrategy': 'quant-strategy',
    'constraintDeduction': 'constraint-deduction',
    'mimQuant': 'mim-quant',
    'dataInsights': 'data-insights',
    'criticalReasoning': 'critical-reasoning',
    'riddles': 'riddles',
}


def load_manifest():
    with open(MANIFEST, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_questions(category, files):
    folder = FOLDER_MAP.get(category, category)
    folder_path = os.path.join(DATA_DIR, folder)
    questions = []
    for fname in files:
        fpath = os.path.join(folder_path, fname)
        if not os.path.exists(fpath):
            print(f"  WARNING: {fpath} not found, skipping.")
            continue
        with open(fpath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, list):
                questions.extend(data)
            else:
                print(f"  WARNING: {fpath} is not a JSON array, skipping.")
    return questions


def build():
    print("Building questions-data.js...")
    manifest = load_manifest()
    
    bundle = {}
    total = 0
    for category, files in manifest.items():
        questions = load_questions(category, files)
        bundle[category] = questions
        count = len(questions)
        total += count
        print(f"  {category}: {count} questions from {len(files)} file(s)")
    
    # Generate JS file
    js_content = '/* AUTO-GENERATED — DO NOT EDIT MANUALLY */\n'
    js_content += '/* Run: python3 tools/build_data.py to regenerate */\n\n'
    js_content += 'const QUESTIONS_DATA = '
    js_content += json.dumps(bundle, ensure_ascii=False, indent=None, separators=(',', ':'))
    js_content += ';\n'
    
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"\nDone! {total} total questions written to js/questions-data.js")
    print(f"File size: {os.path.getsize(OUTPUT) / 1024:.1f} KB")


if __name__ == '__main__':
    build()
