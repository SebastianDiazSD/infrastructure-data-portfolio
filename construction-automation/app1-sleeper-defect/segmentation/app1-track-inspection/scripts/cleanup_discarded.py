"""
cleanup_discarded.py
--------------------
Ground2Tech App 1 — Segmentation Branch

PURPOSE:
    Label Studio exports only the images that were annotated (as tasks).
    Images that were added to data/clean/ but never created as Label Studio
    tasks — or whose tasks were deleted — have no corresponding .txt file
    in the export labels folder.

    This script identifies those orphaned images and moves them to
    data/clean/discarded/ so the downstream split pipeline operates only
    on the annotated set.

LOGIC:
    - "annotated" = image stem appears in export labels/ (even as empty .txt)
    - "discarded" = image in data/clean/ whose stem has NO .txt in export labels/

USAGE:
    python cleanup_discarded.py \
        --labels  /home/sebastian/Downloads/annotation-seg/labels \
        --images  /home/sebastian/Documents/test-segmentation/app1-track-inspection/data/clean \
        --dry-run          # preview only, nothing moves
    
    # Once satisfied:
    python cleanup_discarded.py \
        --labels  /home/sebastian/Downloads/annotation-seg/labels \
        --images  /home/sebastian/Documents/test-segmentation/app1-track-inspection/data/clean

EXPECTED OUTPUT (with ~591 labels, 814 images):
    Annotated (label exists):  591
    To discard (no label):     223
    Already in discarded/:       0
    Files moved:               223
"""

import argparse
import shutil
from pathlib import Path
from collections import Counter


IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}


def main():
    parser = argparse.ArgumentParser(description='Move unannotated images to discarded/')
    parser.add_argument('--labels', required=True,
                        help='Path to Label Studio export labels/ folder')
    parser.add_argument('--images', required=True,
                        help='Path to data/clean/ folder')
    parser.add_argument('--dry-run', action='store_true',
                        help='Print what would happen without moving anything')
    args = parser.parse_args()

    labels_dir = Path(args.labels).resolve()
    images_dir = Path(args.images).resolve()
    discarded_dir = images_dir / 'discarded'

    # --- Validate inputs ---
    if not labels_dir.exists():
        raise FileNotFoundError(f'Labels folder not found: {labels_dir}')
    if not images_dir.exists():
        raise FileNotFoundError(f'Images folder not found: {images_dir}')

    # --- Build set of annotated stems (from .txt files in export) ---
    annotated_stems = {p.stem for p in labels_dir.glob('*.txt')}
    print(f'Label files in export:       {len(annotated_stems)}')

    # --- Scan data/clean/ for image files (top-level only, skip discarded/) ---
    all_images = [
        p for p in images_dir.iterdir()
        if p.is_file() and p.suffix in IMAGE_EXTENSIONS
    ]
    print(f'Images in data/clean/:       {len(all_images)}')

    # --- Categorise ---
    to_discard = [p for p in all_images if p.stem not in annotated_stems]
    to_keep    = [p for p in all_images if p.stem in annotated_stems]

    print(f'  → Annotated (keep):        {len(to_keep)}')
    print(f'  → No label (move):         {len(to_discard)}')

    if not to_discard:
        print('Nothing to move. Exiting.')
        return

    if args.dry_run:
        print('\n[DRY RUN] Would move the following files:')
        for p in sorted(to_discard)[:20]:
            print(f'  {p.name}')
        if len(to_discard) > 20:
            print(f'  ... and {len(to_discard) - 20} more')
        print(f'\n[DRY RUN] Target: {discarded_dir}')
        print('[DRY RUN] No files moved.')
        return

    # --- Create discarded/ if needed ---
    discarded_dir.mkdir(exist_ok=True)
    print(f'\nMoving {len(to_discard)} files → {discarded_dir}')

    moved = 0
    conflicts = 0
    for p in to_discard:
        dest = discarded_dir / p.name
        if dest.exists():
            # Name collision — should not happen, but handle defensively
            print(f'  [SKIP] Already in discarded/: {p.name}')
            conflicts += 1
            continue
        shutil.move(str(p), str(dest))
        moved += 1

    # --- Final verification ---
    remaining_images = [
        p for p in images_dir.iterdir()
        if p.is_file() and p.suffix in IMAGE_EXTENSIONS
    ]
    print(f'\n=== POST-CLEANUP VERIFICATION ===')
    print(f'Images remaining in data/clean/:  {len(remaining_images)}')
    print(f'Files moved to discarded/:        {moved}')
    if conflicts:
        print(f'Skipped (already in discarded/):  {conflicts}')
    print(f'Label files in export:            {len(annotated_stems)}')

    # Integrity check: remaining count should equal label count
    if len(remaining_images) == len(annotated_stems):
        print('✓ Image count matches label count. Cleanup successful.')
    else:
        delta = len(remaining_images) - len(annotated_stems)
        sign = '+' if delta > 0 else ''
        print(f'⚠ Mismatch: {sign}{delta} images vs labels.')
        print('  Possible causes:')
        print('  - Annotation not yet complete (images pending in Label Studio)')
        print('  - Multiple image extensions for same stem')
        print('  - Label Studio exported a .txt for an image not in data/clean/')

    # --- Class distribution count (bonus — runs automatically) ---
    print('\n=== CLASS DISTRIBUTION (annotated set) ===')
    # nc=3: 0=corner_breakout, 1=spalling_body, 2=spalling_rail_seat
    class_names = {0: 'corner_breakout', 1: 'spalling_body', 2: 'spalling_rail_seat'}
    counts = Counter()
    empty_files = 0  # healthy sleepers

    for txt in labels_dir.glob('*.txt'):
        lines = [l.strip() for l in txt.read_text(encoding='utf-8').splitlines() if l.strip()]
        if not lines:
            empty_files += 1
            continue
        for line in lines:
            try:
                cls_idx = int(line.split()[0])
                counts[cls_idx] += 1
            except (ValueError, IndexError):
                print(f'  [WARN] Malformed line in {txt.name}: {line[:60]}')

    total_polygons = sum(counts.values())
    print(f'Healthy sleepers (empty .txt):  {empty_files}')
    print(f'Total polygon annotations:      {total_polygons}')
    print()
    dominant = max(counts.values()) if counts else 1
    for idx in sorted(counts):
        name = class_names.get(idx, f'class_{idx}')
        ratio = counts[idx] / dominant
        bar = '█' * int(ratio * 30)
        print(f'  [{idx}] {name:<22} {counts[idx]:>5} polygons  {ratio:.2f}×  {bar}')

    if counts:
        min_idx = min(counts, key=counts.get)
        min_ratio = counts[min_idx] / dominant
        if min_ratio < 0.4:
            name = class_names.get(min_idx, f'class_{min_idx}')
            print(f'\n⚠ [{min_idx}] {name} is at {min_ratio:.2f}× dominant class.')
            print('  → Oversample 2–3× in train split (same strategy as detection Run 3).')
        else:
            print('\n✓ All classes within acceptable balance range (>0.4× dominant).')


if __name__ == '__main__':
    main()
