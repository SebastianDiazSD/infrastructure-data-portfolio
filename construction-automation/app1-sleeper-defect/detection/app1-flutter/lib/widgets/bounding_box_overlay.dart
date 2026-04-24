import 'package:flutter/material.dart';
import '../config/app_config.dart';
import '../models/detection_result.dart';

class BoundingBoxOverlay extends StatelessWidget {
  final List<DetectionResult> detections;
  final Size imageSize;
  final Size displaySize;
  const BoundingBoxOverlay({super.key, required this.detections,
      required this.imageSize, required this.displaySize});

  @override
  Widget build(BuildContext context) => CustomPaint(
      size: displaySize,
      painter: _Painter(detections, imageSize, displaySize));
}

class _Painter extends CustomPainter {
  final List<DetectionResult> detections;
  final Size imageSize, displaySize;
  _Painter(this.detections, this.imageSize, this.displaySize);

  @override
  void paint(Canvas canvas, Size size) {
    final sx = displaySize.width  / imageSize.width;
    final sy = displaySize.height / imageSize.height;

    for (final det in detections) {
      final color = Color(AppConfig.classColors[det.classIndex] ?? 0xFFFFFFFF);
      canvas.drawRect(
        Rect.fromLTRB(det.box.x1*sx, det.box.y1*sy,
                      det.box.x2*sx, det.box.y2*sy),
        Paint()..color=color..style=PaintingStyle.stroke..strokeWidth=2.5,
      );
      final sk = det.severity?.schadenklasse ?? '?';
      final label =
          ' ${det.className.replaceAll('_',' ')} '
          '${(det.confidence*100).toStringAsFixed(0)}% SK$sk ';
      final tp = TextPainter(
        text: TextSpan(text: label,
            style: const TextStyle(color: Colors.white,
                fontSize: 11, fontWeight: FontWeight.w600)),
        textDirection: TextDirection.ltr,
      )..layout();
      canvas.drawRect(
        Rect.fromLTWH(det.box.x1*sx, det.box.y1*sy - tp.height - 4,
                      tp.width, tp.height + 4),
        Paint()..color=color.withOpacity(0.85),
      );
      tp.paint(canvas,
          Offset(det.box.x1*sx, det.box.y1*sy - tp.height - 2));
    }
  }

  @override
  bool shouldRepaint(covariant _Painter old) => old.detections != detections;
}
