"""
train.py — Ground2Tech App 1
YOLOv8s sleeper defect detection
Run 3: oversampled dataset + augmentation + class weight + early stopping
"""

import argparse
from pathlib import Path
from ultralytics import YOLO


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model',  default='yolov8s.pt')
    parser.add_argument('--data',   default='data/dataset.yaml')
    parser.add_argument('--epochs', type=int, default=150)
    parser.add_argument('--batch',  type=int, default=8)
    parser.add_argument('--name',   default='app1_yolov8s_run3')
    parser.add_argument('--device', default='cpu')
    return parser.parse_args()


def main():
    args = parse_args()

    print(f"\n── Ground2Tech App 1 — Training ────────────────")
    print(f"  Model:   {args.model}")
    print(f"  Data:    {args.data}")
    print(f"  Epochs:  {args.epochs}")
    print(f"  Batch:   {args.batch}")
    print(f"  Device:  {args.device}")
    print(f"  Run:     {args.name}")
    print(f"────────────────────────────────────────────────\n")

    model = YOLO(args.model)

    model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=640,
        batch=args.batch,
        patience=20,            # early stopping — stop if no improvement for 20 epochs

        # ── Class imbalance correction ──────────────────────
        cls_pw=2.0,             # BCE positive weight — penalises missed detections

        # ── Augmentation ────────────────────────────────────
        degrees=15,             # random rotation ±15°
        flipud=0.3,             # vertical flip probability
        mosaic=0.5,             # mosaic augmentation probability
        hsv_h=0.02,             # hue jitter
        hsv_s=0.5,              # saturation jitter
        hsv_v=0.4,              # brightness jitter

        # ── Output ──────────────────────────────────────────
        project='training/runs',
        name=args.name,
        exist_ok=False,

        device=args.device,
    )

    print(f"\nTraining complete. Weights saved to: "
          f"training/runs/{args.name}/weights/")


if __name__ == '__main__':
    main()
