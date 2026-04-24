"""
oversample_train.py
-------------------
Duplicates minority-class images in the training split to address
class imbalance. Targets: corner_breakout (class idx 1) and
spalling_rail_seat (class idx 3).

Usage:
    python scripts/oversample_train.py

Run BEFORE training. Run ONCE — script checks for existing duplicates
to avoid re-running accidentally.
"""

import os
import shutil
from pathlib import Path
from collections import defaultdict

# ── Configuration ──────────────────────────────────────────────────
TRAIN_IMAGES = Path("data/splits/train/images")
TRAIN_LABELS = Path("data/splits/train/labels")

# Class indices as defined in dataset.yaml / classes.txt
MINORITY_CLASSES = {
    1: ("corner_breakout", 2),  # class_idx: (name, n_copies)
    3: ("spalling_rail_seat", 3),  # 3x copies = 4 total per original
}


# ───────────────────────────────────────────────────────────────────


def get_classes_in_label(label_path: Path) -> set:
    """Return set of class indices present in a YOLO label file."""
    classes = set()
    with open(label_path, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                cls_idx = int(line.split()[0])
                classes.add(cls_idx)
    return classes


def main():
    label_files = sorted(TRAIN_LABELS.glob("*.txt"))

    # Map: class_idx → list of label stems that contain that class
    class_to_stems = defaultdict(list)
    for lf in label_files:
        classes = get_classes_in_label(lf)
        for cls_idx in MINORITY_CLASSES:
            if cls_idx in classes:
                class_to_stems[cls_idx].append(lf.stem)

    print("\n── Oversampling report ──────────────────────────────")

    total_new = 0
    for cls_idx, (cls_name, n_copies) in MINORITY_CLASSES.items():
        stems = class_to_stems[cls_idx]
        print(f"\n  {cls_name} (class {cls_idx}): {len(stems)} source images "
              f"→ {n_copies} copies each = {len(stems) * n_copies} new files")

        for stem in stems:
            # Find image (try common extensions)
            img_src = None
            for ext in [".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"]:
                candidate = TRAIN_IMAGES / f"{stem}{ext}"
                if candidate.exists():
                    img_src = candidate
                    break

            lbl_src = TRAIN_LABELS / f"{stem}.txt"

            if img_src is None:
                print(f"    WARNING: no image found for {stem}, skipping")
                continue

            for i in range(1, n_copies + 1):
                new_stem = f"{stem}_dup{i}"

                # Skip if already duplicated (idempotency check)
                new_lbl = TRAIN_LABELS / f"{new_stem}.txt"
                if new_lbl.exists():
                    continue

                # Copy image
                new_img = TRAIN_IMAGES / f"{new_stem}{img_src.suffix}"
                shutil.copy2(img_src, new_img)

                # Copy label
                shutil.copy2(lbl_src, new_lbl)
                total_new += 1

    print(f"\n── Done: {total_new} new image+label pairs added to train set")

    # Final count
    all_labels = list(TRAIN_LABELS.glob("*.txt"))
    print(f"   Train labels before: {len(label_files)}")
    print(f"   Train labels after:  {len(all_labels)}")
    print("────────────────────────────────────────────────────\n")


if __name__ == "__main__":
    main()