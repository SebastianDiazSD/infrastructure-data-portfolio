"""
split_dataset.py  —  Stratified train/val/test split for YOLO datasets
-----------------------------------------------------------------------
Guarantees minority classes appear in val and test proportionally.
Priority bucket order: spalling_rail_seat > corner_breakout > spalling_body > negative

Priority logic: an image containing spalling_rail_seat goes into the
rail_seat bucket regardless of what other classes it also contains.
This ensures the rarest class drives placement, not the majority class.

Usage:
    python scripts/split_dataset.py \
        --images data/clean/images \
        --labels data/clean/labels \
        --output data/splits

    # Custom ratios:
    python scripts/split_dataset.py \
        --images data/clean/images \
        --labels data/clean/labels \
        --output data/splits \
        --train 0.75 --val 0.15 --test 0.10

Run BEFORE oversample_train.py.
Deletes and recreates data/splits/ — do not run after oversampling.
"""

import os
import shutil
import random
import argparse
from pathlib import Path
from collections import defaultdict

# Class indices — must match dataset.yaml and classes.txt exactly
CLASS_PRIORITY = [3, 1, 2]  # spalling_rail_seat, corner_breakout, spalling_body
# Images with none of the above are treated as negatives (bucket 'neg')


def get_classes_in_label(label_path: Path) -> set:
    """Return set of integer class indices present in a YOLO label file."""
    classes = set()
    try:
        with open(label_path, "r") as f:
            for line in f:
                line = line.strip()
                if line:
                    classes.add(int(line.split()[0]))
    except Exception:
        pass
    return classes


def assign_bucket(classes: set) -> str:
    """Assign image to highest-priority bucket based on classes present."""
    for cls_idx in CLASS_PRIORITY:
        if cls_idx in classes:
            return str(cls_idx)
    return "neg"


def stratified_split(images_dir, labels_dir, output_dir,
                     train=0.75, val=0.15, test=0.10, seed=42):
    images_dir = Path(images_dir)
    labels_dir = Path(labels_dir)
    output_dir = Path(output_dir)

    # Gather all images
    image_files = sorted([
        f for f in images_dir.iterdir()
        if f.suffix.lower() in [".jpg", ".jpeg", ".png"]
    ])

    if not image_files:
        raise FileNotFoundError(f"No images found in {images_dir}")

    # Bucket images by priority class
    buckets = defaultdict(list)
    for img_path in image_files:
        lbl_path = labels_dir / (img_path.stem + ".txt")
        classes = get_classes_in_label(lbl_path) if lbl_path.exists() else set()
        bucket = assign_bucket(classes)
        buckets[bucket].append(img_path)

    bucket_labels = {
        "3": "spalling_rail_seat",
        "1": "corner_breakout",
        "2": "spalling_body",
        "neg": "negative",
    }

    print("\n── Bucket distribution ──────────────────────────────")
    for k, v in sorted(buckets.items()):
        print(f"  {bucket_labels.get(k, k):<22}: {len(v)} images")
    print(f"  {'TOTAL':<22}: {len(image_files)} images")

    # Split each bucket proportionally, then merge
    random.seed(seed)
    splits = {"train": [], "val": [], "test": []}

    for bucket_name, files in buckets.items():
        random.shuffle(files)
        n = len(files)
        n_train = max(1, int(n * train))
        n_val   = max(1, int(n * val)) if n >= 3 else 0
        # remainder goes to test
        splits["train"].extend(files[:n_train])
        splits["val"].extend(files[n_train:n_train + n_val])
        splits["test"].extend(files[n_train + n_val:])

    # Wipe and recreate output
    if output_dir.exists():
        shutil.rmtree(output_dir)
        print(f"\n  Cleared existing splits at {output_dir}")

    print("\n── Split results ────────────────────────────────────")
    for split_name, files in splits.items():
        img_out = output_dir / split_name / "images"
        lbl_out = output_dir / split_name / "labels"
        img_out.mkdir(parents=True, exist_ok=True)
        lbl_out.mkdir(parents=True, exist_ok=True)

        copied = 0
        negatives = 0
        for img_path in files:
            shutil.copy(img_path, img_out / img_path.name)
            lbl_path = labels_dir / (img_path.stem + ".txt")
            if lbl_path.exists() and lbl_path.stat().st_size > 0:
                shutil.copy(lbl_path, lbl_out / (img_path.stem + ".txt"))
                copied += 1
            else:
                # Negative image — write empty label (YOLO expects file to exist)
                open(lbl_out / (img_path.stem + ".txt"), "w").close()
                negatives += 1

        print(f"  {split_name:<6}: {len(files):>4} images "
              f"({copied} annotated, {negatives} negatives)")

    print(f"\n  Ratios: {int(train*100)}/{int(val*100)}/{int(test*100)}")
    print("─────────────────────────────────────────────────────\n")

    # Per-class count in val (sanity check — must not be zero for any active class)
    print("── Val set class coverage (sanity check) ────────────")
    val_labels_dir = output_dir / "val" / "labels"
    val_class_counts = defaultdict(int)
    for lbl in val_labels_dir.glob("*.txt"):
        for cls in get_classes_in_label(lbl):
            val_class_counts[cls] += 1
    for cls_idx, name in [(1, "corner_breakout"), (2, "spalling_body"), (3, "spalling_rail_seat")]:
        count = val_class_counts.get(cls_idx, 0)
        status = "✅" if count >= 5 else ("⚠️  LOW" if count > 0 else "❌ ZERO — PROBLEM")
        print(f"  {name:<22}: {count:>3} val images  {status}")
    print("─────────────────────────────────────────────────────\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Stratified YOLO dataset split")
    parser.add_argument("--images",  required=True, help="Path to images dir")
    parser.add_argument("--labels",  required=True, help="Path to labels dir")
    parser.add_argument("--output",  required=True, help="Output splits dir")
    parser.add_argument("--train",   type=float, default=0.75)
    parser.add_argument("--val",     type=float, default=0.15)
    parser.add_argument("--test",    type=float, default=0.10)
    args = parser.parse_args()

    stratified_split(
        args.images, args.labels, args.output,
        args.train, args.val, args.test
    )
