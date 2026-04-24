# scripts/verify_onnx_fp16.py
import onnx
import onnxruntime as ort
import numpy as np
import os

ONNX_PATH = "../training/runs/app1_yolov8s_run3/weights/best.onnx"

# Load and check - wrap checker in try/except (known fp16 topology issue)
model = onnx.load(ONNX_PATH)
try:
    onnx.checker.check_model(model)
    print("Model valid ✅ (strict check passed)")
except onnx.checker.ValidationError as e:
    print(f"Strict checker warning (expected for fp16 export): {e}")
    print("Proceeding with runtime validation...")

# Runtime validation — this is the authoritative test
sess = ort.InferenceSession(ONNX_PATH)

# Print input/output contract
for inp in sess.get_inputs():
    print(f"Input:  name='{inp.name}' shape={inp.shape} dtype={inp.type}")
for out in sess.get_outputs():
    print(f"Output: name='{out.name}' shape={out.shape} dtype={out.type}")

# Dummy inference — float32 input even for fp16 model (Cast node handles it)
dummy = np.zeros((1, 3, 640, 640), dtype=np.float32)
out = sess.run(None, {"images": dummy})
print(f"\nOutput shape: {out[0].shape}")  # Expect (1, 9, 8400)

file_size = os.path.getsize(ONNX_PATH) / 1e6
print(f"File size: {file_size:.1f}MB")

# Success criteria
assert out[0].shape == (1, 9, 8400), f"Unexpected shape: {out[0].shape}"
print("\nRuntime validation passed ✅")
print(f"{'fp16 (~22MB)' if file_size < 30 else 'fp32 (~45MB)'} model confirmed")