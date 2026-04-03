import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import '../models/detection_result.dart';
import '../widgets/bounding_box_overlay.dart';
import '../config/app_config.dart';

class ResultScreen extends StatelessWidget {
  final img.Image image;
  final List<DetectionResult> detections;
  final File imageFile;
  final double threshold;

  const ResultScreen({super.key, required this.image,
      required this.detections, required this.imageFile,
      this.threshold = AppConfig.confThreshold});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(detections.isEmpty
          ? 'No defects (conf ≥ ${threshold.toStringAsFixed(2)})'
          : '${detections.length} defect(s) detected'),
      backgroundColor: detections.isEmpty ? Colors.green[800] : Colors.red[800],
      foregroundColor: Colors.white,
    ),
    body: Column(children: [
      LayoutBuilder(builder: (_, c) {
        final w = c.maxWidth;
        final h = w * image.height / image.width;
        return SizedBox(width: w, height: h, child: Stack(children: [
          Image.file(imageFile, width: w, height: h, fit: BoxFit.fill),
          BoundingBoxOverlay(
            detections: detections,
            imageSize: Size(image.width.toDouble(), image.height.toDouble()),
            displaySize: Size(w, h),
          ),
        ]));
      }),
      Expanded(child: detections.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min, // ← fix overflow
                  children: [
                    const Icon(Icons.check_circle,
                        color: Colors.green, size: 48),
                    const SizedBox(height: 12),
                    const Text('No defects detected',
                        style: TextStyle(color: Colors.green, fontSize: 16)),
                    const SizedBox(height: 4),
                    Text('Threshold: ${threshold.toStringAsFixed(2)}',
                        style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                    const SizedBox(height: 16),
                    Text(
                      'Try lowering the confidence slider\n'
                      'or use a closer, face-on shot of the sleeper surface.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
                  ],
                ),
              ))
          : ListView.builder(
              padding: const EdgeInsets.all(8),
              itemCount: detections.length,
              itemBuilder: (_, i) => _Card(detection: detections[i]))),
    ]),
  );
}

class _Card extends StatelessWidget {
  final DetectionResult detection;
  const _Card({required this.detection});

  @override
  Widget build(BuildContext context) {
    final sev   = detection.severity;
    final color = Color(AppConfig.classColors[detection.classIndex] ?? 0xFFFFFFFF);
    final tColor = switch (sev?.trafficLight) {
      'red'   => Colors.red[700]!,
      'amber' => Colors.orange[700]!,
      'green' => Colors.green[700]!,
      _       => Colors.grey,
    };
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          Container(width: 4, height: 60, color: color),
          const SizedBox(width: 12),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(detection.className.replaceAll('_', ' ').toUpperCase(),
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 13)),
              Text('Confidence: ${(detection.confidence * 100).toStringAsFixed(1)}%',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12)),
              if (sev != null)
                Text(sev.description,
                    style: const TextStyle(fontSize: 12),
                    maxLines: 2, overflow: TextOverflow.ellipsis),
            ],
          )),
          const SizedBox(width: 8),
          if (sev != null)
            Column(children: [
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: tColor,
                    borderRadius: BorderRadius.circular(6)),
                child: Text('SK${sev.schadenklasse}',
                    style: const TextStyle(color: Colors.white,
                        fontWeight: FontWeight.bold, fontSize: 14)),
              ),
              const SizedBox(height: 4),
              Text('F${sev.fehlerstufe}',
                  style: TextStyle(color: Colors.grey[600], fontSize: 11)),
            ])
          else
            const SizedBox(width: 40, height: 40,
                child: CircularProgressIndicator(strokeWidth: 2)),
        ]),
      ),
    );
  }
}