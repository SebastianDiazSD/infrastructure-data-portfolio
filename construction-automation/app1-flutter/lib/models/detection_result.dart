class BoundingBox {
  final double x1, y1, x2, y2;
  const BoundingBox({required this.x1, required this.y1,
                     required this.x2, required this.y2});
  double get width => x2 - x1;
  double get height => y2 - y1;

  double iou(BoundingBox o) {
    final ix1 = x1 > o.x1 ? x1 : o.x1;
    final iy1 = y1 > o.y1 ? y1 : o.y1;
    final ix2 = x2 < o.x2 ? x2 : o.x2;
    final iy2 = y2 < o.y2 ? y2 : o.y2;
    final inter = (ix2 - ix1).clamp(0, double.infinity) *
                  (iy2 - iy1).clamp(0, double.infinity);
    final union = width * height + o.width * o.height - inter;
    return union == 0 ? 0 : inter / union;
  }
}

class SeverityResult {
  final String schadenklasse;
  final String fehlerstufe;
  final String description;
  final String trafficLight;

  const SeverityResult({
    required this.schadenklasse,
    required this.fehlerstufe,
    required this.description,
    required this.trafficLight,
  });

  factory SeverityResult.fromJson(Map<String, dynamic> json) =>
      SeverityResult(
        schadenklasse: json['schadenklasse']?.toString() ?? 'N/A',
        fehlerstufe:   json['fehlerstufe']?.toString()   ?? 'N/A',
        description:   json['description'] ?? '',
        trafficLight:  json['traffic_light'] ?? 'amber',
      );
}

class DetectionResult {
  final int classIndex;
  final String className;
  final double confidence;
  final BoundingBox box;
  SeverityResult? severity;

  DetectionResult({
    required this.classIndex,
    required this.className,
    required this.confidence,
    required this.box,
    this.severity,
  });
}
