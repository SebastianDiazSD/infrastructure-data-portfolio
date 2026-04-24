"""
quality_filter.py — Ground2Tech App 1
Filters photos by blur, brightness, and resolution.
Moves rejected images to a separate folder with a report.

Usage:
    python scripts/quality_filter.py --input data/clean
    python scripts/quality_filter.py --input data/clean --blur 150 --brightness 40

Thresholds (adjustable via args):
    Blur score  < 100  → too blurry  (Laplacian variance)
    Brightness  < 50   → too dark    (mean pixel value 0-255)
    Resolution  < 640x480 → too small

Requirements: pip install opencv-python tqdm
"""

import os
import shutil
import argparse
import csv
from pathlib import Path
from datetime import datetime

try:
    import cv2
    import numpy as np
    from tqdm import tqdm
except ImportError:
    print("Missing dependencies. Run: pip install opencv-python tqdm")
    exit(1)


def assess_image(img_path: Path, blur_thresh: float,
                 brightness_thresh: float, min_w: int, min_h: int) -> dict:
    """
    Assess a single image. Returns a dict with metrics and pass/fail reasons.
    """
    img = cv2.imread(str(img_path))
    if img is None:
        return {'path': img_path, 'status': 'error', 'reason': 'unreadable'}

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = img.shape[:2]

    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    brightness = gray.mean()

    reasons = []
    if blur_score < blur_thresh:
        reasons.append(f'blurry ({blur_score:.1f} < {blur_thresh})')
    if brightness < brightness_thresh:
        reasons.append(f'too_dark ({brightness:.1f} < {brightness_thresh})')
    if w < min_w or h < min_h:
        reasons.append(f'low_res ({w}x{h} < {min_w}x{min_h})')

    return {
        'path': img_path,
        'width': w,
        'height': h,
        'blur_score': round(blur_score, 2),
        'brightness': round(brightness, 2),
        'status': 'rejected' if reasons else 'passed',
        'reason': ', '.join(reasons) if reasons else 'ok',
    }


def run_filter(input_path: Path, blur_thresh: float, brightness_thresh: float,
               min_w: int, min_h: int, dry_run: bool):

    extensions = {'.jpg', '.jpeg', '.JPG', '.JPEG', '.png', '.PNG'}
    images = [f for f in input_path.iterdir() if f.suffix in extensions]

    if not images:
        print(f"No images found in {input_path}")
        return

    # Create rejected folder
    rejected_path = input_path.parent / (input_path.name + '_rejected')
    if not dry_run:
        rejected_path.mkdir(exist_ok=True)

    results = []
    passed = []
    rejected = []

    print(f"\nAssessing {len(images)} images...")
    print(f"Thresholds: blur>{blur_thresh}, brightness>{brightness_thresh}, "
          f"resolution>{min_w}x{min_h}\n")

    for img_path in tqdm(sorted(images), unit='img'):
        result = assess_image(img_path, blur_thresh, brightness_thresh,
                               min_w, min_h)
        results.append(result)
        if result['status'] == 'passed':
            passed.append(img_path)
        elif result['status'] == 'rejected':
            rejected.append(result)

    # Move rejected files
    if not dry_run:
        for r in rejected:
            shutil.move(str(r['path']), rejected_path / r['path'].name)

    # Save CSV report
    report_path = input_path.parent / f"quality_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    with open(report_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'path', 'width', 'height', 'blur_score', 'brightness',
            'status', 'reason'
        ])
        writer.writeheader()
        for r in results:
            writer.writerow({k: str(v) for k, v in r.items()})

    # Print summary
    print(f"\n{'='*55}")
    print(f"QUALITY FILTER SUMMARY")
    print(f"{'='*55}")
    print(f"Total assessed:  {len(images)}")
    print(f"Passed:          {len(passed)}  ✅")
    print(f"Rejected:        {len(rejected)}  ❌")
    print(f"Pass rate:       {len(passed)/len(images)*100:.1f}%")

    if rejected:
        # Breakdown by rejection reason
        blurry = sum(1 for r in rejected if 'blurry' in r['reason'])
        dark = sum(1 for r in rejected if 'too_dark' in r['reason'])
        low_res = sum(1 for r in rejected if 'low_res' in r['reason'])
        print(f"\nRejection breakdown:")
        print(f"  Blurry:       {blurry}")
        print(f"  Too dark:     {dark}")
        print(f"  Low res:      {low_res}")

        if not dry_run:
            print(f"\nRejected images moved to: {rejected_path}")

    print(f"\nReport saved to: {report_path}")

    if dry_run:
        print("\n[DRY RUN] No files were moved.")

    print(f"\n✅ {len(passed)} clean images ready for Roboflow upload.")
    return len(passed), len(rejected)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Filter images by quality before Roboflow upload'
    )
    parser.add_argument('--input', '-i', required=True,
                        help='Folder with EXIF-stripped images (data/clean)')
    parser.add_argument('--blur', type=float, default=100.0,
                        help='Minimum Laplacian blur score (default: 100)')
    parser.add_argument('--brightness', type=float, default=50.0,
                        help='Minimum mean brightness 0-255 (default: 50)')
    parser.add_argument('--min-width', type=int, default=640,
                        help='Minimum image width in pixels (default: 640)')
    parser.add_argument('--min-height', type=int, default=480,
                        help='Minimum image height in pixels (default: 480)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Assess only, do not move any files')

    args = parser.parse_args()
    input_path = Path(args.input)

    if not input_path.exists():
        print(f"❌ Input folder not found: {input_path}")
        exit(1)

    run_filter(
        input_path=input_path,
        blur_thresh=args.blur,
        brightness_thresh=args.brightness,
        min_w=args.min_width,
        min_h=args.min_height,
        dry_run=args.dry_run,
    )
