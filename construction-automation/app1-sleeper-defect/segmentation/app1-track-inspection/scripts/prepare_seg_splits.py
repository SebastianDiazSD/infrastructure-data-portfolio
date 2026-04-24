"""
prepare_seg_splits.py
---------------------
Ground2Tech App 1 — Segmentation Branch (test-segmentation/app1-track-inspection)

PURPOSE:
    Produces a reproducible 70/15/15 stratified train/val/test split from the
    591 annotated images, then oversamples spalling_rail_seat (class 2) 2× in
    the train split only.

    Stratification is by per-image class presence, not polygon count, so each
    stratum (healthy / single-class / multi-class) is proportionally represented
    across all three splits. This prevents the failure mode from detection Run 1/2
    where rare classes were absent from validation entirely.

    Oversampling is file-level duplication (image + label copied with _os1 suffix).
    Applied to train only — val and test remain unaugmented to give honest metrics.

DESIGN DECISIONS vs ALTERNATIVES:
    - sklearn StratifiedShuffleSplit considered but requires a single label per
      sample. Custom stratum logic used instead to handle multi-label images.
    - Copy_tree vs symlinks: copies chosen — Kaggle datasets require actual files.
    - Oversampling multiplier 2× (not 3×): dataset is larger (591 vs 566 in
      detection Run 3) and ratio 0.41× is above the 0.40 floor. 3× would
      over-represent a single class in a dataset this size.

USAGE:
    python prepare_seg_splits.py \
        --labels   /home/sebastian/Downloads/annotation-seg/labels \
        --images   /home/sebastian/Documents/test-segmentation/app1-track-inspection/data/clean \
        --output   /home/sebastian/Documents/test-segmentation/app1-track-inspection/data/seg_splits \
        --seed     42

OUTPUT STRUCTURE:
    data/seg_splits/
    ├── train/
    │   ├── images/   (70% + oversampled rail_seat copies)
    │   └── labels/
    ├── val/
    │   ├── images/   (15%, no oversampling)
    │   └── labels/
    ├── test/
    │   ├── images/   (15%, no oversampling)
    │   └── labels/
    └── dataset.yaml
"""

import argparse
import random
import shutil
from collections import defaultdict, Counter
from pathlib import Path


# nc=3 segmentation class mapping
CLASS_NAMES = {0: 'corner_breakout', 1: 'spalling_body', 2: 'spalling_rail_seat'}
OVERSAMPLE_CLASS = 2          # spalling_rail_seat
OVERSAMPLE_MULTIPLIER = 2     # duplicate 1 additional copy (total 2× presence)
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}


def get_image_path(stem: str, images_dir: Path) -> Path | None:
    """Find image file for a given stem regardless of extension."""
    for ext in IMAGE_EXTENSIONS:
        p = images_dir / (stem + ext)
        if p.exists():
            return p
    return None


def parse_classes(label_path: Path) -> set[int]:
    """Return set of class indices present in a label file. Empty = healthy sleeper."""
    classes = set()
    text = label_path.read_text(encoding='utf-8').strip()
    if not text:
        return classes
    for line in text.splitlines():
        line = line.strip()
        if line:
            try:
                classes.add(int(line.split()[0]))
            except (ValueError, IndexError):
                pass
    return classes


def stratum_key(classes: set[int]) -> str:
    """Map a set of class indices to a stratum label for stratification."""
    if not classes:
        return 'healthy'
    if len(classes) == 1:
        return f'single_{CLASS_NAMES[next(iter(classes))]}'
    return f'multi_{"_".join(str(c) for c in sorted(classes))}'


def copy_pair(stem: str, src_img: Path, src_lbl: Path,
              dst_img_dir: Path, dst_lbl_dir: Path,
              new_stem: str | None = None) -> None:
    """Copy image+label pair to destination directories."""
    out_stem = new_stem or stem
    shutil.copy2(src_img, dst_img_dir / (out_stem + src_img.suffix))
    shutil.copy2(src_lbl, dst_lbl_dir / (out_stem + '.txt'))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--labels',  required=True)
    parser.add_argument('--images',  required=True)
    parser.add_argument('--output',  required=True)
    parser.add_argument('--seed',    type=int, default=42)
    args = parser.parse_args()

    labels_dir = Path(args.labels).resolve()
    images_dir = Path(args.images).resolve()
    output_dir = Path(args.output).resolve()
    random.seed(args.seed)

    # ── 1. Build dataset ─────────────────────────────────────────────────────
    label_files = sorted(labels_dir.glob('*.txt'))
    dataset = []   # list of (stem, img_path, lbl_path, classes_set)
    missing_images = []

    for lbl in label_files:
        img = get_image_path(lbl.stem, images_dir)
        if img is None:
            missing_images.append(lbl.name)
            continue
        dataset.append((lbl.stem, img, lbl, parse_classes(lbl)))

    print(f'Loaded {len(dataset)} image+label pairs')
    if missing_images:
        print(f'⚠ Skipped {len(missing_images)} labels with no image: {missing_images}')

    # ── 2. Stratify ───────────────────────────────────────────────────────────
    strata: dict[str, list] = defaultdict(list)
    for item in dataset:
        strata[stratum_key(item[3])].append(item)

    print('\nStrata distribution:')
    for key, items in sorted(strata.items()):
        print(f'  {key:<40} {len(items):>4} images')

    train_items, val_items, test_items = [], [], []

    for key, items in strata.items():
        random.shuffle(items)
        n = len(items)
        n_val  = max(1, round(n * 0.15))
        n_test = max(1, round(n * 0.15))
        n_train = n - n_val - n_test

        train_items.extend(items[:n_train])
        val_items.extend(items[n_train:n_train + n_val])
        test_items.extend(items[n_train + n_val:])

    print(f'\nSplit sizes (before oversampling):')
    print(f'  train: {len(train_items)}')
    print(f'  val:   {len(val_items)}')
    print(f'  test:  {len(test_items)}')

    # ── 3. Oversample spalling_rail_seat in train ─────────────────────────────
    rail_seat_train = [item for item in train_items if OVERSAMPLE_CLASS in item[3]]
    oversample_copies = []
    for i in range(OVERSAMPLE_MULTIPLIER - 1):  # 1 extra copy = 2× total
        for item in rail_seat_train:
            stem, img, lbl, classes = item
            new_stem = f'{stem}_os{i+1}'
            oversample_copies.append((new_stem, img, lbl, classes))

    print(f'\nOversampling class {OVERSAMPLE_CLASS} ({CLASS_NAMES[OVERSAMPLE_CLASS]}):')
    print(f'  train images with rail_seat: {len(rail_seat_train)}')
    print(f'  copies added ({OVERSAMPLE_MULTIPLIER-1}×):  {len(oversample_copies)}')
    print(f'  train total after oversampling: {len(train_items) + len(oversample_copies)}')

    # ── 4. Write splits to disk ───────────────────────────────────────────────
    if output_dir.exists():
        shutil.rmtree(output_dir)

    for split_name, items, extra in [
        ('train', train_items, oversample_copies),
        ('val',   val_items,   []),
        ('test',  test_items,  []),
    ]:
        img_dir = output_dir / split_name / 'images'
        lbl_dir = output_dir / split_name / 'labels'
        img_dir.mkdir(parents=True)
        lbl_dir.mkdir(parents=True)

        for stem, img, lbl, _ in items:
            copy_pair(stem, img, lbl, img_dir, lbl_dir)
        for stem, img, lbl, _ in extra:
            copy_pair(stem, img, lbl, img_dir, lbl_dir, new_stem=stem)

    # ── 5. Write dataset.yaml ─────────────────────────────────────────────────
    yaml_content = f"""# App 1 Segmentation — YOLOv11s-seg, nc=3
# Generated by prepare_seg_splits.py (seed={args.seed})
# Split: 70/15/15 stratified by class presence
# Oversampling: {CLASS_NAMES[OVERSAMPLE_CLASS]} {OVERSAMPLE_MULTIPLIER}x in train only

path: {output_dir}
train: train/images
val:   val/images
test:  test/images

nc: 3
names: ['corner_breakout', 'spalling_body', 'spalling_rail_seat']
"""
    (output_dir / 'dataset.yaml').write_text(yaml_content)

    # ── 6. Verification ───────────────────────────────────────────────────────
    print('\n=== SPLIT VERIFICATION ===')
    total_written = 0
    for split_name in ('train', 'val', 'test'):
        img_dir = output_dir / split_name / 'images'
        lbl_dir = output_dir / split_name / 'labels'
        n_img = len(list(img_dir.iterdir()))
        n_lbl = len(list(lbl_dir.iterdir()))
        match = '✓' if n_img == n_lbl else '⚠ MISMATCH'
        print(f'  {split_name:<6}  images={n_img:>4}  labels={n_lbl:>4}  {match}')
        total_written += n_img

    print(f'\n  Total files written: {total_written}')
    print(f'  dataset.yaml: {output_dir / "dataset.yaml"}')

    # ── 7. Post-split class distribution ─────────────────────────────────────
    print('\n=== CLASS DISTRIBUTION PER SPLIT ===')
    for split_name in ('train', 'val', 'test'):
        lbl_dir = output_dir / split_name / 'labels'
        counts = Counter()
        empty = 0
        for txt in lbl_dir.glob('*.txt'):
            lines = [l.strip() for l in txt.read_text().splitlines() if l.strip()]
            if not lines:
                empty += 1
            for line in lines:
                try:
                    counts[int(line.split()[0])] += 1
                except (ValueError, IndexError):
                    pass
        print(f'\n  [{split_name}]  healthy={empty}')
        dominant = max(counts.values()) if counts else 1
        for idx in sorted(counts):
            print(f'    [{idx}] {CLASS_NAMES[idx]:<22} {counts[idx]:>4} polygons  {counts[idx]/dominant:.2f}×')


if __name__ == '__main__':
    main()
