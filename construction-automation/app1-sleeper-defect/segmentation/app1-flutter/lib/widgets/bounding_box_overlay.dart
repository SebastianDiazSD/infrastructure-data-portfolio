import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import '../config/app_config.dart';
import '../models/detection_result.dart';

// BoundingBoxOverlay
//
// Paints two layers per detection:
//   1. Mask image overlay (if maskImage is available) — 160×160 RGBA, projected
//      from letterbox-space to display-space via LetterboxInfo.
//   2. Bounding box rectangle + label tag (same as detection branch).
//
// Mask projection rationale:
//   The mask is decoded in 160×160 space which corresponds to the padded 640×640
//   ONNX input. The active (non-padded) region of the mask maps to the original
//   image. We use drawImageRect with:
//     src = active sub-rect in mask-space  (removes letterbox padding)
//     dst = full display rect              (fills the displayed image area)
//   This gives pixel-accurate alignment without additional coordinate math.

class BoundingBoxOverlay extends StatelessWidget {
  final List<DetectionResult> detections;
  final Size           imageSize;
  final Size           displaySize;
  final LetterboxInfo  letterbox;

  const BoundingBoxOverlay({
    super.key,
    required this.detections,
    required this.imageSize,
    required this.displaySize,
    required this.letterbox,
  });

  @override
  Widget build(BuildContext context) => CustomPaint(
      size: displaySize,
      painter: _Painter(detections, imageSize, displaySize, letterbox));
}

class _Painter extends CustomPainter {
  final List<DetectionResult> detections;
  final Size          imageSize, displaySize;
  final LetterboxInfo letterbox;

  _Painter(this.detections, this.imageSize, this.displaySize, this.letterbox);

  @override
  void paint(Canvas canvas, Size size) {
    final sx = displaySize.width  / imageSize.width;
    final sy = displaySize.height / imageSize.height;

    // Mask source rect in 160×160 space — the active (non-padded) region
    // 640/160 = 4; divide padLeft/padTop by 4 to get mask-space offsets
    const maskDim       = 160.0;
    const maskScale     = 640.0 / maskDim;  // = 4.0
    final maskSrcLeft   = letterbox.padLeft  / maskScale;
    final maskSrcTop    = letterbox.padTop   / maskScale;
    final maskSrcWidth  = imageSize.width  * letterbox.scale / maskScale;
    final maskSrcHeight = imageSize.height * letterbox.scale / maskScale;
    final maskSrc = Rect.fromLTWH(
        maskSrcLeft, maskSrcTop, maskSrcWidth, maskSrcHeight);
    final maskDst = Rect.fromLTWH(
        0, 0, displaySize.width, displaySize.height);
    final maskPaint = Paint()
      ..filterQuality = FilterQuality.low
      ..isAntiAlias   = false;

    for (final det in detections) {
      // ── 1. Mask overlay ──────────────────────────────────────────────────
      if (det.maskImage != null) {
        canvas.drawImageRect(det.maskImage!, maskSrc, maskDst, maskPaint);
      }

      // ── 2. Bounding box + label ──────────────────────────────────────────
      final color = Color(AppConfig.classColors[det.classIndex] ?? 0xFFFFFFFF);
      canvas.drawRect(
        Rect.fromLTRB(det.box.x1 * sx, det.box.y1 * sy,
                      det.box.x2 * sx, det.box.y2 * sy),
        Paint()
          ..color       = color
          ..style       = PaintingStyle.stroke
          ..strokeWidth = 2.5,
      );

      final sk    = det.severity?.schadenklasse ?? '?';
      final label =
          ' ${det.className.replaceAll('_', ' ')} '
          '${(det.confidence * 100).toStringAsFixed(0)}% SK$sk ';
      final tp = TextPainter(
        text: TextSpan(
            text: label,
            style: const TextStyle(
                color: Colors.white, fontSize: 11,
                fontWeight: FontWeight.w600)),
        textDirection: TextDirection.ltr,
      )..layout();

      canvas.drawRect(
        Rect.fromLTWH(det.box.x1 * sx, det.box.y1 * sy - tp.height - 4,
                      tp.width, tp.height + 4),
        Paint()..color = color.withOpacity(0.85),
      );
      tp.paint(canvas,
          Offset(det.box.x1 * sx, det.box.y1 * sy - tp.height - 2));
    }
  }

  @override
  bool shouldRepaint(covariant _Painter old) =>
      old.detections != detections || old.letterbox != letterbox;
}