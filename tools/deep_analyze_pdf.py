#!/usr/bin/env python3
"""
Deep analysis of the PDF workbook: extract every question's topic, type, 
whether it has an image, and the answer key. This gives us the blueprint
to generate original questions covering the same concepts.
"""
import fitz
import re, json, os

PDF_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "Application Workbook MiM MiF 2025 (sin protección).pdf")

doc = fitz.open(PDF_PATH)

# ── Extract ALL text from the document ──
full_text = ""
page_images = {}  # page_num -> image count
for i in range(doc.page_count):
    page = doc[i]
    text = page.get_text("text")
    full_text += f"\n===PAGE {i+1}===\n" + text
    imgs = page.get_images(full=True)
    if imgs:
        page_images[i+1] = len(imgs)

# ── Extract question numbers and their approximate content ──
# Quantitative questions are numbered 1-90
# Data Insights questions start after "DATA INSIGHTS"
# Critical Reasoning after that

sections = {
    "quantitative": {"start": 7, "end": 71},
    "data_insights": {"start": 72, "end": 85},
    "critical_reasoning": {"start": 86, "end": 105},
    "answer_key": {"start": 108, "end": 112},
}

# Extract text by section
for section_name, bounds in sections.items():
    section_text = ""
    img_pages = []
    for i in range(bounds["start"]-1, min(bounds["end"], doc.page_count)):
        page = doc[i]
        section_text += page.get_text("text") + "\n"
        if i+1 in page_images:
            img_pages.append(i+1)
    
    # Count questions (look for numbered patterns)
    if section_name == "quantitative":
        # Questions numbered like "1.", "2.", etc at start of line
        q_numbers = re.findall(r'(?:^|\n)\s*(\d+)\.\s', section_text)
        print(f"\n{'='*60}")
        print(f"SECTION: {section_name.upper()}")
        print(f"Pages: {bounds['start']}-{bounds['end']}")
        print(f"Question numbers found: {len(q_numbers)}")
        print(f"Pages with images: {img_pages}")
        
        # Try to classify each question by topic
        # Look for keywords
        topics = {
            "probability": 0, "percent": 0, "ratio": 0, "geometry": 0,
            "algebra": 0, "number_properties": 0, "data_sufficiency": 0,
            "statistics": 0, "work_rate": 0, "distance_rate_time": 0,
            "inequalities": 0, "sequences": 0, "sets": 0, "combinatorics": 0,
            "exponents": 0, "profit_loss": 0, "mixture": 0, "interest": 0,
        }
        
        ds_count = 0
        ps_count = 0
        # Check for Data Sufficiency markers
        ds_markers = section_text.count("Statement (1) ALONE")
        ps_markers = len(q_numbers) - ds_markers
        print(f"Problem Solving questions: ~{ps_markers}")
        print(f"Data Sufficiency questions: ~{ds_markers}")
        
    elif section_name == "data_insights":
        print(f"\n{'='*60}")
        print(f"SECTION: {section_name.upper()}")
        print(f"Pages: {bounds['start']}-{bounds['end']}")
        print(f"Pages with images: {img_pages}")
        # Data insights often have tables/charts
        # Count sub-questions
        q_count = len(re.findall(r'(?:True|False|Yes|No|Cannot be determined)', section_text))
        print(f"Approximate sub-questions (True/False/Yes/No): {q_count}")
        
    elif section_name == "critical_reasoning":
        print(f"\n{'='*60}")
        print(f"SECTION: {section_name.upper()}")
        print(f"Pages: {bounds['start']}-{bounds['end']}")
        print(f"Pages with images: {img_pages}")
        q_numbers = re.findall(r'(?:^|\n)\s*(\d+)\.\s', section_text)
        print(f"Question numbers found: {len(q_numbers)}")

# ── Now extract detailed topic analysis for quantitative section ──
print(f"\n{'='*60}")
print("DETAILED TOPIC ANALYSIS (Quantitative)")
print(f"{'='*60}")

quant_text = ""
for i in range(sections["quantitative"]["start"]-1, min(sections["quantitative"]["end"], doc.page_count)):
    quant_text += doc[i].get_text("text") + "\n"

# Split into individual questions
# Questions are numbered 1. through ~90.
questions_raw = re.split(r'\n\s*(\d+)\.\s', quant_text)
# This gives us: [preamble, "1", text1, "2", text2, ...]

question_topics = []
for idx in range(1, len(questions_raw)-1, 2):
    q_num = int(questions_raw[idx])
    q_text = questions_raw[idx+1][:500]  # First 500 chars
    
    # Classify topic
    topic = "general"
    t_lower = q_text.lower()
    
    is_ds = "statement (1)" in t_lower or "statement(1)" in t_lower
    q_type = "DS" if is_ds else "PS"
    
    if any(w in t_lower for w in ["probability", "chance", "likely", "odds"]):
        topic = "probability"
    elif any(w in t_lower for w in ["percent", "%", "increased by", "decreased by", "profit", "discount", "markup"]):
        topic = "percentages"
    elif any(w in t_lower for w in ["triangle", "circle", "rectangle", "area", "perimeter", "angle", "radius", "diameter", "cylinder", "sphere", "square"]):
        topic = "geometry"
    elif any(w in t_lower for w in ["ratio", "proportion"]):
        topic = "ratios"
    elif any(w in t_lower for w in ["speed", "rate", "distance", "miles per hour", "km/h", "mph"]):
        topic = "distance_rate_time"
    elif any(w in t_lower for w in ["work", "job", "hours to complete", "working together"]):
        topic = "work_rate"
    elif any(w in t_lower for w in ["mean", "median", "average", "standard deviation", "range of"]):
        topic = "statistics"
    elif any(w in t_lower for w in ["set", "union", "intersection", "venn"]):
        topic = "sets"
    elif any(w in t_lower for w in ["combination", "permutation", "ways", "arrange", "choose", "committee"]):
        topic = "combinatorics"
    elif any(w in t_lower for w in ["sequence", "series", "term", "arithmetic progression", "geometric"]):
        topic = "sequences"
    elif any(w in t_lower for w in ["inequalit", "greater than", "less than", "> 0", "< 0", "positive", "negative"]):
        topic = "inequalities"
    elif any(w in t_lower for w in ["prime", "factor", "divisible", "remainder", "even", "odd", "integer", "digit"]):
        topic = "number_properties"
    elif any(w in t_lower for w in ["exponent", "power", "root", "sqrt", "^"]):
        topic = "exponents"
    elif any(w in t_lower for w in ["interest", "compound", "simple interest"]):
        topic = "interest"
    elif any(w in t_lower for w in ["mixture", "solution", "concentration"]):
        topic = "mixture"
    elif any(w in t_lower for w in ["x =", "y =", "equation", "solve for", "value of x", "value of y"]):
        topic = "algebra"
    
    question_topics.append({
        "num": q_num,
        "type": q_type,
        "topic": topic,
        "preview": q_text[:100].replace('\n', ' ').strip()
    })

# Print topic distribution
from collections import Counter
topic_counts = Counter(q["topic"] for q in question_topics)
type_counts = Counter(q["type"] for q in question_topics)

print(f"\nTotal questions parsed: {len(question_topics)}")
print(f"\nBy type:")
for t, c in type_counts.most_common():
    print(f"  {t}: {c}")
print(f"\nBy topic:")
for t, c in topic_counts.most_common():
    print(f"  {t}: {c}")

# Print each question's classification
print(f"\nQuestion-by-question:")
for q in question_topics:
    print(f"  Q{q['num']:3d} [{q['type']}] {q['topic']:20s} | {q['preview'][:80]}")

# ── Analyze Data Insights section ──
print(f"\n{'='*60}")
print("DATA INSIGHTS DETAIL")
print(f"{'='*60}")

di_text = ""
for i in range(sections["data_insights"]["start"]-1, min(sections["data_insights"]["end"], doc.page_count)):
    di_text += f"\n---PAGE {i+1}---\n" + doc[i].get_text("text")

# Print raw text (first 3000 chars)
print(di_text[:4000])

# ── Analyze Critical Reasoning ──
print(f"\n{'='*60}")
print("CRITICAL REASONING DETAIL")
print(f"{'='*60}")

cr_text = ""
for i in range(sections["critical_reasoning"]["start"]-1, min(sections["critical_reasoning"]["end"], doc.page_count)):
    cr_text += f"\n---PAGE {i+1}---\n" + doc[i].get_text("text")

print(cr_text[:4000])

# ── Extract Answer Key ──
print(f"\n{'='*60}")
print("ANSWER KEY")
print(f"{'='*60}")

ak_text = ""
for i in range(sections["answer_key"]["start"]-1, min(doc.page_count, sections["answer_key"]["end"])):
    ak_text += doc[i].get_text("text")

print(ak_text[:5000])

# ── Image analysis: which pages have images that are part of questions ──
print(f"\n{'='*60}")
print("IMAGE ANALYSIS")
print(f"{'='*60}")

for page_num, img_count in sorted(page_images.items()):
    # Skip decorative pages (1-6)
    if page_num <= 6:
        continue
    page = doc[page_num - 1]
    text_preview = page.get_text("text")[:200].replace('\n', ' ')
    print(f"Page {page_num} ({img_count} imgs): {text_preview[:120]}")

doc.close()
