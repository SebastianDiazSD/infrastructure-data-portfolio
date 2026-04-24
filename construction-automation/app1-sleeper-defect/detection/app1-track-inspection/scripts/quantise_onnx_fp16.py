# scripts/quantise_onnx_fp16.py
from ultralytics import YOLO

model = YOLO("../training/runs/app1_yolov8s_run3/weights/best.pt")
model.export(
    format="onnx",
    half=True,           # float16
    simplify=True,
    dynamic=False,
    imgsz=640,
)
# Output: training/runs/app1_yolov8s_run3/weights/best.onnx (overwrites)
# Or it may write to the same folder — check output path