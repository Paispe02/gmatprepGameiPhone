#!/usr/bin/env python3
"""Analyze PDF structure: pages, text sections, images."""
import fitz  # PyMuPDF
import os, json

PDF_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "Application Workbook MiM MiF 2025 (sin protección).pdf")

doc = fitz.open(PDF_PATH)
print(f"Total pages: {doc.page_count}")
print(f"Metadata: {doc.metadata}")
print()

# Extract text from each page and count images
for i in range(min(doc.page_count, 10)):  # First 10 pages for overview
    page = doc[i]
    text = page.get_text("text")
    images = page.get_images(full=True)
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    print(f"--- Page {i+1} ---")
    print(f"  Images: {len(images)}")
    print(f"  Text lines: {len(lines)}")
    for line in lines[:15]:
        print(f"    {line[:120]}")
    if len(lines) > 15:
        print(f"    ... ({len(lines)-15} more lines)")
    print()

# Now scan ALL pages for image count
total_images = 0
pages_with_images = []
for i in range(doc.page_count):
    page = doc[i]
    imgs = page.get_images(full=True)
    if imgs:
        total_images += len(imgs)
        pages_with_images.append((i+1, len(imgs)))

print(f"\n=== SUMMARY ===")
print(f"Total pages: {doc.page_count}")
print(f"Total images found: {total_images}")
print(f"Pages with images: {len(pages_with_images)}")
for p, c in pages_with_images:
    print(f"  Page {p}: {c} image(s)")

doc.close()
