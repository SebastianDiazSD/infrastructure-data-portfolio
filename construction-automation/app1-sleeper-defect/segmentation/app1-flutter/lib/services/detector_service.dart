// detector_service.dart
// Segmentation branch — YOLOv11s-seg, nc=3
//
// Output tensor layout (verified against ONNX export):
//   output0: [1, 39, 8400]
//     indices 0–3   : cx, cy, w, h   (box)
//     indices 4–6   : class scores   (nc=3)
//     indices 7–38  : mask coefficients (32 values)
//   output1: [1, 32, 160, 160]
//     prototype masks — combined with coefficients to produce per-detection masks
//
// Mask decoding (per detection, post-NMS):
//   mask_flat = sigmoid(coefficients @ prototypes.reshape(32, 160*160))
//   mask      = mask_flat.reshape(160, 160), threshold at 0.5
//   Only pixels inside the bounding box region are computed (performance).

import 'dart:async';
import 'dart:math';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import 'package:onnxruntime/onnxruntime.dart';
import '../config/app_config.dart';
import '../models/detection_result.dart';

// ── Internal preprocessing result ────────────────────────────────────────────
class _Pre {
  final Float32List pixels;
  final double padLeft, padTop, scale;
  const _Pre({required this.pixels, required this.padLeft,
               required this.padTop, required this.scale});
}

// ── Service ───────────────────────────────────────────────────────────────────
class DetectorService {
  OrtSession? _session;
  bool   _ready      = false;
  String? _initError;

  Future<void> initialise() async {
    if (_ready) return;
    try {
      OrtEnv.instance.init();
      final opts = OrtSessionOptions()
        ..setInterOpNumThreads(2)
        ..setIntraOpNumThreads(2)
        ..setSessionGraphOptimizationLevel(GraphOptimizationLevel.ortEnableAll);
      final bytes = (await rootBundle.load(AppConfig.modelAssetPath))
          .buffer.asUint8List();
      _session = OrtSession.fromBuffer(bytes, opts);
      _ready = true;
      print('DetectorService: model loaded ✅');
    } catch (e) {
      _initError = e.toString();
      print('DetectorService: init failed ❌ $e');
    }
  }

  bool    get isReady   => _ready;
  String? get initError => _initError;

  Future<List<DetectionResult>> detect(
    img.Image image, {
    double?  threshold,
    bool     safetyMode = false,
  }) async {
    if (!_ready) {
      print('DetectorService: not ready — returning empty');
      return [];
    }
    final thresh = threshold ??
        (safetyMode ? AppConfig.confThresholdSafety : AppConfig.confThreshold);

    final pre = _preprocess(image);
    final input = OrtValueTensor.createTensorWithDataList(
        pre.pixels, [1, 3, AppConfig.inputSize, AppConfig.inputSize]);
    final runOpts = OrtRunOptions();
    final outputs = await _session!.runAsync(runOpts, {'images': input});
    input.release();
    runOpts.release();

    // Extract both tensors before releasing
    final output0 = outputs![0]!.value as List;  // [1, 39, 8400]
    final output1 = outputs![1]!.value as List;  // [1, 32, 160, 160]

    final results = _parse(output0, image.width.toDouble(),
        image.height.toDouble(), pre, thresh);

    if (results.isNotEmpty) {
      await _decodeMasks(results, output1, pre);
    }

    for (final o in outputs) { o?.release(); }
    print('DetectorService: ${results.length} detections at conf ≥ ${thresh.toStringAsFixed(2)}');
    return results;
  }

  // ── Preprocessing (letterbox → Float32 CHW) ────────────────────────────────
  _Pre _preprocess(img.Image src) {
    const t     = AppConfig.inputSize;
    final scale = min(t / src.width, t / src.height);
    final sw    = (src.width  * scale).round();
    final sh    = (src.height * scale).round();
    final resized = img.copyResize(src, width: sw, height: sh);
    final canvas  = img.Image(width: t, height: t, numChannels: 3);
    img.fill(canvas, color: img.ColorRgb8(114, 114, 114));
    final pl = ((t - sw) / 2).round();
    final pt = ((t - sh) / 2).round();
    img.compositeImage(canvas, resized, dstX: pl, dstY: pt);

    final total  = t * t;
    final pixels = Float32List(3 * total);
    for (int y = 0; y < t; y++) {
      for (int x = 0; x < t; x++) {
        final p = canvas.getPixel(x, y);
        final i = y * t + x;
        pixels[i]           = p.r / 255.0;
        pixels[total + i]   = p.g / 255.0;
        pixels[total * 2 + i] = p.b / 255.0;
      }
    }
    return _Pre(pixels: pixels, padLeft: pl.toDouble(),
                padTop: pt.toDouble(), scale: scale);
  }

  // ── Parse output0 [1, 39, 8400] ───────────────────────────────────────────
  // Row layout per anchor i:
  //   batch[0][i]..batch[3][i]  = cx, cy, w, h
  //   batch[4][i]..batch[6][i]  = class scores (nc=3)
  //   batch[7][i]..batch[38][i] = mask coefficients (32 values)
  List<DetectionResult> _parse(
      List output0, double origW, double origH, _Pre pre, double thresh) {
    final batch = output0[0] as List;  // [39][8400]
    const anchors   = 8400;
    const ncStart   = 4;
    const nc        = 3;
    const maskStart = ncStart + nc;   // = 7
    const maskCount = 32;

    final candidates = <DetectionResult>[];

    for (int i = 0; i < anchors; i++) {
      double maxScore  = 0;
      int    bestClass = -1;
      for (int c = 0; c < nc; c++) {
        final s = (batch[ncStart + c] as List)[i].toDouble();
        if (s > maxScore) { maxScore = s; bestClass = c; }
      }
      if (maxScore < thresh) continue;
      if (!AppConfig.activeClasses.contains(bestClass)) continue;

      final cx = (batch[0] as List)[i].toDouble();
      final cy = (batch[1] as List)[i].toDouble();
      final w  = (batch[2] as List)[i].toDouble();
      final h  = (batch[3] as List)[i].toDouble();

      // Unpad + unscale → original image coordinates
      final x1 = ((cx - pre.padLeft - w / 2) / pre.scale).clamp(0, origW);
      final y1 = ((cy - pre.padTop  - h / 2) / pre.scale).clamp(0, origH);
      final x2 = ((cx - pre.padLeft + w / 2) / pre.scale).clamp(0, origW);
      final y2 = ((cy - pre.padTop  + h / 2) / pre.scale).clamp(0, origH);

      // 32 mask coefficients (stored for _decodeMasks, discarded after)
      final maskCoeffs = List<double>.generate(
          maskCount, (k) => (batch[maskStart + k] as List)[i].toDouble());

      candidates.add(DetectionResult(
        classIndex:       bestClass,
        className:        AppConfig.classNames[bestClass],
        confidence:       maxScore,
        box:              BoundingBox(x1: x1, y1: y1, x2: x2, y2: y2),
        maskCoefficients: maskCoeffs,
      ));
    }
    return _nms(candidates);
  }

  // ── Mask decoding ──────────────────────────────────────────────────────────
  // output1 shape: [1, 32, 160, 160]
  // For each detection:
  //   1. Map bounding box (image space) → mask space (divide by 640/160 = 4)
  //   2. For each pixel inside the box: mask = sigmoid(coeff · proto[:, y, x])
  //   3. Threshold at 0.5 → write class-colored RGBA pixel
  //   4. Wrap into ui.Image (async via decodeImageFromPixels)
  Future<void> _decodeMasks(
      List<DetectionResult> dets, List protoRaw, _Pre pre) async {
    final proto = protoRaw[0] as List;  // [32][160][160]
    const ms              = 160;
    const maskScaleFactor = 640.0 / ms; // = 4.0

    // Pre-cast outer list once — avoids repeated `as List` in inner loop
    final protoRows = List<List<dynamic>>.generate(
        32, (k) => proto[k] as List);

    for (final det in dets) {
      final coeffs = det.maskCoefficients;
      if (coeffs.isEmpty) continue;

      // Bounding box projected into mask-space
      final mx1 = ((det.box.x1 * pre.scale + pre.padLeft) / maskScaleFactor)
          .clamp(0.0, ms.toDouble()).toInt();
      final my1 = ((det.box.y1 * pre.scale + pre.padTop)  / maskScaleFactor)
          .clamp(0.0, ms.toDouble()).toInt();
      final mx2 = ((det.box.x2 * pre.scale + pre.padLeft) / maskScaleFactor)
          .clamp(0.0, ms.toDouble()).toInt();
      final my2 = ((det.box.y2 * pre.scale + pre.padTop)  / maskScaleFactor)
          .clamp(0.0, ms.toDouble()).toInt();

      // RGBA pixel buffer for the full 160×160 canvas (transparent background)
      final pixels = Uint8List(ms * ms * 4);

      // Class color — strip alpha, write as RGBA with fixed 55% opacity
      final rawColor = AppConfig.classColors[det.classIndex] ?? 0xFFFFFF;
      final cr = (rawColor >> 16) & 0xFF;
      final cg = (rawColor >>  8) & 0xFF;
      final cb =  rawColor        & 0xFF;

      for (int y = my1; y < my2; y++) {
        final protoRowY = List<dynamic>.from(
            protoRows.map((r) => (r[y] as List)));
        for (int x = mx1; x < mx2; x++) {
          double val = 0;
          for (int k = 0; k < 32; k++) {
            val += coeffs[k] * protoRowY[k][x].toDouble();
          }
          // Sigmoid activation
          val = 1.0 / (1.0 + exp(-val));
          if (val > 0.5) {
            final idx = (y * ms + x) * 4;
            pixels[idx]     = cr;
            pixels[idx + 1] = cg;
            pixels[idx + 2] = cb;
            pixels[idx + 3] = 140; // ~55% opacity
          }
        }
      }

      // decodeImageFromPixels is callback-based — wrap in Completer
      final completer = Completer<ui.Image>();
      ui.decodeImageFromPixels(
          pixels, ms, ms, ui.PixelFormat.rgba8888, completer.complete);
      det.maskImage = await completer.future;
    }
  }

  // ── NMS (unchanged from detection branch) ─────────────────────────────────
  List<DetectionResult> _nms(List<DetectionResult> c) {
    if (c.isEmpty) return [];
    c.sort((a, b) => b.confidence.compareTo(a.confidence));
    final kept       = <DetectionResult>[];
    final suppressed = List.filled(c.length, false);
    for (int i = 0; i < c.length; i++) {
      if (suppressed[i]) continue;
      kept.add(c[i]);
      for (int j = i + 1; j < c.length; j++) {
        if (suppressed[j]) continue;
        if (c[i].classIndex != c[j].classIndex) continue;
        if (c[i].box.iou(c[j].box) > AppConfig.iouThreshold) {
          suppressed[j] = true;
        }
      }
    }
    return kept;
  }

  void dispose() {
    _session?.release();
    OrtEnv.instance.release();
  }
}