import os, shutil, random, argparse
from pathlib import Path

def split(images_dir, labels_dir, output_dir, train=0.75, val=0.15, test=0.10, seed=42):
    images_dir = Path(images_dir)
    labels_dir = Path(labels_dir)
    output_dir = Path(output_dir)

    image_files = sorted([
        f for f in images_dir.iterdir()
        if f.suffix.lower() in ['.jpg', '.jpeg', '.png']
    ])

    random.seed(seed)
    random.shuffle(image_files)

    n = len(image_files)
    n_train = int(n * train)
    n_val   = int(n * val)

    splits = {
        'train': image_files[:n_train],
        'val':   image_files[n_train:n_train+n_val],
        'test':  image_files[n_train+n_val:]
    }

    for split_name, files in splits.items():
        img_out = output_dir / split_name / 'images'
        lbl_out = output_dir / split_name / 'labels'
        img_out.mkdir(parents=True, exist_ok=True)
        lbl_out.mkdir(parents=True, exist_ok=True)

        for img_path in files:
            shutil.copy(img_path, img_out / img_path.name)
            lbl_path = labels_dir / (img_path.stem + '.txt')
            if lbl_path.exists():
                shutil.copy(lbl_path, lbl_out / lbl_path.name)
            else:
                # Negative image — create empty label file
                open(lbl_out / (img_path.stem + '.txt'), 'w').close()

        print(f"  {split_name:<6}: {len(files)} images")

    print(f"\nTotal: {n} images split {int(train*100)}/{int(val*100)}/{int(test*100)}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--images', required=True)
    parser.add_argument('--labels', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--train', type=float, default=0.75)
    parser.add_argument('--val',   type=float, default=0.15)
    parser.add_argument('--test',  type=float, default=0.10)
    args = parser.parse_args()
    split(args.images, args.labels, args.output, args.train, args.val, args.test)
