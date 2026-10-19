#!/usr/bin/env python3
"""
Music ConnectZ Asset Cleanup Script
------------------------------------
Cleans up filenames (trims trailing/double spaces, removes odd punctuation)
and compresses oversized PNG/JPG assets so they're reasonable for a web/app
icon and UI library.

USAGE:
    1. Put this script in the SAME folder as your image assets
       (or point --input-dir at that folder).
    2. Install requirements:  pip install Pillow
    3. Dry run first (default) to preview changes, nothing is modified:
           python3 clean_assets.py --input-dir /path/to/assets
    4. Once you're happy with the plan, actually apply it:
           python3 clean_assets.py --input-dir /path/to/assets --apply

WHAT IT DOES:
    - Renames files: trims trailing spaces before the extension, collapses
      double spaces, and standardizes separators (keeps your existing
      "wordZ" / "word icon" style, just cleans whitespace/punctuation mess).
    - Compresses any image over --max-size-kb (default 500 KB):
        * PNGs: re-saved with optimize=True, palette reduction where safe,
          and resized down if larger than --max-dimension (default 2048px
          on the long edge) since icons/UI art rarely need to be huge.
        * JPGs: re-saved with quality stepped down until under the size
          target (won't go below --min-quality to avoid visible artifacts).
    - Never overwrites originals in --apply mode unless you pass
      --in-place; by default it writes cleaned copies into an
      "cleaned_output" subfolder, preserving originals untouched.
    - Writes a CSV report (rename_and_compression_report.csv) showing
      old name -> new name, old size -> new size, for every file touched.

SAFE BY DEFAULT: dry-run unless --apply is passed. Originals preserved
unless --in-place is passed.
"""

import argparse
import csv
import os
import re
import shutil
import sys

try:
    from PIL import Image
except ImportError:
    print("Pillow is required. Install it with: pip install Pillow")
    sys.exit(1)

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def clean_filename(name: str) -> str:
    """Clean up a filename: trim spaces before extension, collapse
    double spaces/dots, remove trailing spaces in the base name."""
    base, ext = os.path.splitext(name)
    ext = ext.lower()

    # Collapse multiple spaces into one
    base = re.sub(r"\s{2,}", " ", base)
    # Trim leading/trailing whitespace on the base name
    base = base.strip()
    # Remove space immediately before a period (e.g. "Dawz ." -> "Dawz.")
    base = re.sub(r"\s+\.", ".", base)
    # Collapse multiple dots into one
    base = re.sub(r"\.{2,}", ".", base)
    # Remove trailing dots
    base = base.rstrip(".")
    # Replace ampersand with "and" for filesystem/URL safety
    base = base.replace("&", "and")

    return f"{base}{ext}"


def dedupe_name(target_dir: str, filename: str, used: set) -> str:
    """Ensure no filename collisions in the output directory."""
    if filename not in used and not os.path.exists(os.path.join(target_dir, filename)):
        used.add(filename)
        return filename
    base, ext = os.path.splitext(filename)
    i = 2
    while True:
        candidate = f"{base}_{i}{ext}"
        if candidate not in used and not os.path.exists(os.path.join(target_dir, candidate)):
            used.add(candidate)
            return candidate
        i += 1


def compress_image(src_path: str, dst_path: str, max_size_kb: int,
                    max_dimension: int, min_quality: int) -> tuple:
    """Compress an image in place at dst_path. Returns (old_bytes, new_bytes)."""
    old_bytes = os.path.getsize(src_path)
    max_bytes = max_size_kb * 1024

    if old_bytes <= max_bytes:
        # Already small enough — just copy over
        shutil.copy2(src_path, dst_path)
        return old_bytes, os.path.getsize(dst_path)

    img = Image.open(src_path)
    ext = os.path.splitext(dst_path)[1].lower()

    # Resize down if larger than max_dimension on the long edge
    w, h = img.size
    longest = max(w, h)
    if longest > max_dimension:
        scale = max_dimension / longest
        new_size = (max(1, int(w * scale)), max(1, int(h * scale)))
        img = img.resize(new_size, Image.LANCZOS)

    if ext in (".jpg", ".jpeg"):
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        quality = 90
        while quality >= min_quality:
            img.save(dst_path, "JPEG", quality=quality, optimize=True)
            if os.path.getsize(dst_path) <= max_bytes or quality == min_quality:
                break
            quality -= 5
    elif ext == ".png":
        # Try optimized PNG first
        if img.mode not in ("RGBA", "RGB", "P"):
            img = img.convert("RGBA")
        img.save(dst_path, "PNG", optimize=True)
        # If still too big, try palette-based quantization (safe for flat/UI art)
        if os.path.getsize(dst_path) > max_bytes:
            try:
                quantized = img.convert("RGBA").quantize(colors=256, method=Image.MEDIANCUT)
                quantized.save(dst_path, "PNG", optimize=True)
            except Exception:
                pass
        # If STILL too big, fall back to further downscaling
        attempt = 0
        while os.path.getsize(dst_path) > max_bytes and attempt < 4:
            w2, h2 = img.size
            img = img.resize((int(w2 * 0.8), int(h2 * 0.8)), Image.LANCZOS)
            img.save(dst_path, "PNG", optimize=True)
            attempt += 1
    elif ext == ".webp":
        quality = 90
        while quality >= min_quality:
            img.save(dst_path, "WEBP", quality=quality, method=6)
            if os.path.getsize(dst_path) <= max_bytes or quality == min_quality:
                break
            quality -= 5
    else:
        shutil.copy2(src_path, dst_path)

    return old_bytes, os.path.getsize(dst_path)


def main():
    parser = argparse.ArgumentParser(description="Clean and compress Music ConnectZ image assets.")
    parser.add_argument("--input-dir", default=".", help="Folder containing the images (default: current folder)")
    parser.add_argument("--output-dir", default="cleaned_output", help="Where cleaned copies go (ignored with --in-place)")
    parser.add_argument("--apply", action="store_true", help="Actually write files. Without this flag, only previews changes.")
    parser.add_argument("--in-place", action="store_true", help="Overwrite original files instead of writing to output-dir. Use with caution.")
    parser.add_argument("--max-size-kb", type=int, default=500, help="Target max file size in KB before compression kicks in (default: 500)")
    parser.add_argument("--max-dimension", type=int, default=2048, help="Max long-edge pixel dimension (default: 2048)")
    parser.add_argument("--min-quality", type=int, default=60, help="Lowest JPEG/WEBP quality allowed (default: 60)")
    args = parser.parse_args()

    input_dir = os.path.abspath(args.input_dir)
    if not os.path.isdir(input_dir):
        print(f"Input directory not found: {input_dir}")
        sys.exit(1)

    files = [f for f in os.listdir(input_dir)
             if os.path.splitext(f)[1].lower() in IMAGE_EXTS
             and os.path.isfile(os.path.join(input_dir, f))]
    files.sort()

    if not files:
        print(f"No image files found in {input_dir}")
        sys.exit(0)

    if args.in_place:
        output_dir = input_dir
    else:
        output_dir = os.path.abspath(args.output_dir)
        if args.apply:
            os.makedirs(output_dir, exist_ok=True)

    used_names = set()
    report_rows = []
    total_old = 0
    total_new = 0

    print(f"{'DRY RUN' if not args.apply else 'APPLYING'} — {len(files)} images found in {input_dir}\n")
    print(f"{'OLD NAME':45} {'NEW NAME':45} {'OLD SIZE':>10} {'NEW SIZE':>10}")
    print("-" * 115)

    for fname in files:
        src_path = os.path.join(input_dir, fname)
        new_name = clean_filename(fname)
        new_name = dedupe_name(output_dir if not args.in_place else input_dir, new_name, used_names)

        old_size = os.path.getsize(src_path)
        will_compress = old_size > args.max_size_kb * 1024

        if not args.apply:
            new_size_display = "~compress" if will_compress else "(copy)"
            print(f"{fname:45} {new_name:45} {old_size/1024:9.1f}K {new_size_display:>10}")
            report_rows.append({
                "old_name": fname, "new_name": new_name,
                "old_size_kb": round(old_size / 1024, 1),
                "new_size_kb": "", "action": "compress" if will_compress else "rename_only"
            })
            continue

        dst_path = os.path.join(output_dir if not args.in_place else input_dir, new_name)

        if args.in_place and new_name != fname:
            # Rename first, then compress in place if needed
            os.rename(src_path, dst_path)
            src_for_compress = dst_path
        else:
            src_for_compress = src_path

        if will_compress:
            old_b, new_b = compress_image(src_for_compress, dst_path, args.max_size_kb,
                                           args.max_dimension, args.min_quality)
        else:
            if src_for_compress != dst_path:
                shutil.copy2(src_for_compress, dst_path)
            old_b = new_b = os.path.getsize(dst_path)

        total_old += old_b
        total_new += new_b
        print(f"{fname:45} {new_name:45} {old_b/1024:9.1f}K {new_b/1024:9.1f}K")
        report_rows.append({
            "old_name": fname, "new_name": new_name,
            "old_size_kb": round(old_b / 1024, 1),
            "new_size_kb": round(new_b / 1024, 1),
            "action": "compressed" if will_compress else "renamed_only"
        })

    report_path = os.path.join(input_dir, "rename_and_compression_report.csv")
    with open(report_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["old_name", "new_name", "old_size_kb", "new_size_kb", "action"])
        writer.writeheader()
        writer.writerows(report_rows)

    print("\n" + "-" * 115)
    if args.apply:
        print(f"Total: {total_old/1024/1024:.1f} MiB -> {total_new/1024/1024:.1f} MiB "
              f"(saved {(total_old-total_new)/1024/1024:.1f} MiB)")
        print(f"Output written to: {output_dir if not args.in_place else input_dir}")
    else:
        print("This was a DRY RUN. No files were changed.")
        print("Re-run with --apply to actually create cleaned/compressed copies.")
    print(f"Report saved to: {report_path}")


if __name__ == "__main__":
    main()