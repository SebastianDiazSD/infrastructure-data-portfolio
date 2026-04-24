# App 1 — Railway Sleeper Defect Detection

Ground-level smartphone AI for concrete railway sleeper inspection.  
YOLOv8s object detection · ONNX export · Two-layer severity architecture

---

## Overview

This project trains a YOLOv8 object detection model to identify surface defects on prestressed concrete railway sleepers (B70 type) from ground-level smartphone photographs. It is the first layer of a two-layer inspection architecture:

| Layer | Component | Role |
|---|---|---|
| 1 | YOLOv8s | Detects defect presence and draws bounding box |
| 2 | Claude Vision API | Assesses severity against DB Schadenklassen criteria |

The model was trained on an original dataset of ground-level smartphone photographs — a capture perspective not covered by any existing public railway inspection dataset, which are predominantly top-down inspection-train or drone imagery.

---

## Defect Classes

| Index | Class | Description |
|---|---|---|
| 0 | `broken_rail` | Rail fracture (Phase 1.5 — deferred) |
| 1 | `corner_breakout` | Concrete breakout at sleeper corner |
| 2 | `spalling_body` | Surface spalling on sleeper body |
| 3 | `spalling_rail_seat` | Spalling at rail seat zone |
| 4 | `surface_crack` | Surface crack (Phase 1.5 — deferred) |

Active Phase 1 classes: `corner_breakout`, `spalling_body`, `spalling_rail_seat`

---

## Dataset

- **566 images** after quality filtering (blur threshold, brightness threshold)
- **553 bounding box annotations** across 3 active classes
- **Stratified 75/15/10 split** guaranteeing all classes present in all partitions
- **Oversampled training set**: 684 images after 2× corner_breakout, 3× spalling_rail_seat duplication
- Effective class ratio improved from 8.5:1 to 2.4:1 (dominant:minority)

> Dataset images are not included in this repository (proprietary field photography).  
> See `data/dataset.yaml` for class configuration.

---

## Training Results — Run 3 (Production Baseline)

| Metric | Value |
|---|---|
| Model | YOLOv8s |
| Epochs | 117 (early stopping from 150 max) |
| Best epoch | 106 |
| Training time | 2.77h (Google Colab T4 GPU) |
| **mAP50 overall** | **0.702** |
| mAP50-95 overall | 0.376 |
| Precision | 0.716 |
| Recall | 0.744 |
| F1 peak | 0.70 @ conf=0.411 |
| Max recall | 0.82 |

**Per-class mAP50:**

| Class | mAP50 | Precision | Recall |
|---|---|---|---|
| corner_breakout | 0.647 | 0.665 | 0.615 |
| spalling_body | 0.679 | 0.646 | 0.585 |
| spalling_rail_seat | 0.781 | 0.970 | 0.714 |

**Recommended inference threshold:** `conf=0.41` (balanced) · `conf=0.35` (high-recall / safety mode)

---

## Training Run History

| Run | Model | Epochs | Hardware | mAP50 | Notes |
|---|---|---|---|---|---|
| 1 | YOLOv8n | 50 | CPU (4.3h) | 0.702* | Class index bug — nc:3 mismatch |
| 2 | YOLOv8s | 100 | CPU (7.7h) | 0.626 | First clean baseline |
| 3 | YOLOv8s | 117 | T4 GPU (2.8h) | **0.702** | Oversampled + augmented ✅ |

*Run 1 mAP50 is misleading — evaluated only 2 classes due to nc:3 bug. See documentation.

---

## Model Export

The trained model is exported to ONNX format for cross-platform deployment:

```
weights/best.pt    — PyTorch weights (21.5 MB)
weights/best.onnx  — ONNX export (44.8 MB, float32)
```

**ONNX contract:**
- Input:  `images` — shape `[1, 3, 640, 640]` float32
- Output: `output0` — shape `[1, 9, 8400]` float32

Output decoding: 8400 candidate detections × (4 box coords + 5 class scores). Apply confidence threshold and NMS to extract final detections.

---

## Project Structure

```
app1-track-inspection/
├── data/
│   ├── dataset.yaml          ← class config (nc=5, correct order)
│   ├── dataset_colab.yaml    ← Colab/Drive paths for GPU training
│   ├── raw/                  ← original photos (gitignored)
│   ├── clean/                ← EXIF-stripped photos (gitignored)
│   └── splits/               ← train/val/test (gitignored)
├── scripts/
│   ├── strip_exif.py         ← remove GPS metadata before upload
│   ├── quality_filter.py     ← blur/brightness threshold filter
│   ├── split_dataset.py      ← stratified train/val/test split
│   └── oversample_train.py   ← minority class duplication
├── training/
│   └── train.py              ← YOLOv8 training script
├── .gitignore
├── requirements.txt
└── README.md
```

---

## Data Pipeline

```
raw photos (594)
    │
    ▼ strip_exif.py
EXIF-stripped (566 passed, 25 blurry rejected)
    │
    ▼ quality_filter.py
Quality-filtered clean set
    │
    ▼ Label Studio annotation
Annotated YOLO labels (553 boxes, 3 classes)
    │
    ▼ split_dataset.py (stratified)
train (409) / val (81) / test (57)
    │
    ▼ oversample_train.py
train (684) ← oversampled minority classes
    │
    ▼ train.py (Google Colab T4)
best.pt → best.onnx → Flutter app
```

---

## Setup

```bash
# Clone and enter project
git clone https://github.com/SebastianDiazSD/infrastructure-data-portfolio.git
cd infrastructure-data-portfolio/construction-automation/app1-track-inspection

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Note:** Training requires a GPU (Google Colab recommended — see `data/dataset_colab.yaml`).  
Inference runs on CPU at ~350ms per image.

---

## Training (Google Colab)

```python
from ultralytics import YOLO

model = YOLO('yolov8s.pt')
model.train(
    data='/content/drive/MyDrive/Ground2Tech/App1/data/dataset_colab.yaml',
    epochs=150,
    batch=16,
    patience=20,
    degrees=15, flipud=0.3, mosaic=0.5,
    hsv_h=0.02, hsv_s=0.5, hsv_v=0.4,
    project='/content/drive/MyDrive/Ground2Tech/App1/training/runs',
    name='app1_yolov8s_run3',
    device=0,
)
```

---

## Inference

```python
from ultralytics import YOLO

model = YOLO('training/runs/app1_yolov8s_run3/weights/best.pt')
results = model.predict('path/to/image.jpg', conf=0.41, device='cpu')

for box in results[0].boxes:
    print(f"{model.names[int(box.cls)]}: {float(box.conf):.2f}")
```

---

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | corner_breakout, spalling_body, spalling_rail_seat | ✅ Complete |
| 1.5 | broken_rail, missing_fastener, more rail_seat data | 📋 Planned |
| 2 | Bridge defects (CODEBRIM + SDNET2018, DIN 1076) | 📋 Planned |
| 3 | Proprietary foundation model from usage data | 📋 2027–2029 |

**Flutter mobile app:** In development (Window 4)  
**Claude Vision severity layer:** In development (Window 4)

---

## Privacy and Security

- All training images are EXIF-stripped (GPS coordinates removed) before any upload
- No images, weights, or annotation files are committed to this repository
- Site-specific information (project name, location, client) does not appear in any committed file
- The severity assessment prompt referencing regulatory standards is stored locally only

---

## Author

**Sebastian Arce Diaz**  
Civil & Infrastructure Engineer · MSc Computer Science (University of York)  
Ground2Tech Engineering — [ground2tech.com](https://ground2tech.com)  
[LinkedIn](https://www.linkedin.com/in/sebastian-arce-diaz91/) · [GitHub](https://github.com/SebastianDiazSD)
