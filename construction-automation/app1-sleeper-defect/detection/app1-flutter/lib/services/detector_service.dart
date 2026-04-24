import 'dart:typed_data';
import 'dart:math';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import 'package:onnxruntime/onnxruntime.dart';
import '../config/app_config.dart';
import '../models/detection_result.dart';

class _Pre {
  final Float32List pixels;
  final double padLeft, padTop, scale;
  const _Pre({required this.pixels, required this.padLeft,
               required this.padTop, required this.scale});
}

class DetectorService {
  OrtSession? _session;
  bool _ready = false;
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

  bool get isReady => _ready;
  String? get initError => _initError;

  Future<List<DetectionResult>> detect(
    img.Image image, {
    double? threshold,
    bool safetyMode = false,
  }) async {
    if (!_ready) {
      print('DetectorService: not ready — returning empty');
      return [];
    }
    // Priority: explicit threshold > safetyMode > default
    final thresh = threshold ??
        (safetyMode ? AppConfig.confThresholdSafety : AppConfig.confThreshold);

    final pre = _preprocess(image);
    final input = OrtValueTensor.createTensorWithDataList(
        pre.pixels, [1, 3, AppConfig.inputSize, AppConfig.inputSize]);
    final runOpts = OrtRunOptions();
    final outputs = await _session!.runAsync(runOpts, {'images': input});
    input.release();
    runOpts.release();

    final raw = outputs![0]!.value as List;
    final results = _parse(raw, image.width.toDouble(),
        image.height.toDouble(), pre, thresh);
    for (final o in outputs) { o?.release(); }

    print('DetectorService: ${results.length} detections at conf ≥ ${thresh.toStringAsFixed(2)}');
    return results;
  }

  _Pre _preprocess(img.Image src) {
    const t = AppConfig.inputSize;
    final scale = min(t / src.width, t / src.height);
    final sw = (src.width  * scale).round();
    final sh = (src.height * scale).round();
    final resized = img.copyResize(src, width: sw, height: sh);
    final canvas = img.Image(width: t, height: t, numChannels: 3);
    img.fill(canvas, color: img.ColorRgb8(114, 114, 114));
    final pl = ((t - sw) / 2).round();
    final pt = ((t - sh) / 2).round();
    img.compositeImage(canvas, resized, dstX: pl, dstY: pt);

    final total = t * t;
    final pixels = Float32List(3 * total);
    for (int y = 0; y < t; y++) {
      for (int x = 0; x < t; x++) {
        final p = canvas.getPixel(x, y);
        final i = y * t + x;
        pixels[i]           = p.r / 255.0;
        pixels[total + i]   = p.g / 255.0;
        pixels[total*2 + i] = p.b / 255.0;
      }
    }
    return _Pre(pixels: pixels, padLeft: pl.toDouble(),
                padTop: pt.toDouble(), scale: scale);
  }

  List<DetectionResult> _parse(List raw, double origW, double origH,
      _Pre pre, double thresh) {
    final batch = raw[0] as List;
    const anchors = 8400;
    final candidates = <DetectionResult>[];

    for (int i = 0; i < anchors; i++) {
      double maxScore = 0; int bestClass = -1;
      for (int c = 0; c < 5; c++) {
        final s = (batch[4 + c] as List)[i].toDouble();
        if (s > maxScore) { maxScore = s; bestClass = c; }
      }
      if (maxScore < thresh) continue;
      if (!AppConfig.activeClasses.contains(bestClass)) continue;

      final cx = (batch[0] as List)[i].toDouble();
      final cy = (batch[1] as List)[i].toDouble();
      final w  = (batch[2] as List)[i].toDouble();
      final h  = (batch[3] as List)[i].toDouble();

      final x1 = ((cx - pre.padLeft - w / 2) / pre.scale).clamp(0, origW);
      final y1 = ((cy - pre.padTop  - h / 2) / pre.scale).clamp(0, origH);
      final x2 = ((cx - pre.padLeft + w / 2) / pre.scale).clamp(0, origW);
      final y2 = ((cy - pre.padTop  + h / 2) / pre.scale).clamp(0, origH);

      candidates.add(DetectionResult(
        classIndex: bestClass,
        className:  AppConfig.classNames[bestClass],
        confidence: maxScore,
        box: BoundingBox(x1: x1, y1: y1, x2: x2, y2: y2),
      ));
    }
    return _nms(candidates);
  }

  List<DetectionResult> _nms(List<DetectionResult> c) {
    if (c.isEmpty) return [];
    c.sort((a, b) => b.confidence.compareTo(a.confidence));
    final kept = <DetectionResult>[];
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
