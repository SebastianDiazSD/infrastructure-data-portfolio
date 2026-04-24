class FeedbackEntry {
  final int? id;
  final String imagePath;
  final int classIndex;
  final String className;
  // Pixel coords in original image space
  final double x1, y1, x2, y2;
  final int imageWidth, imageHeight;
  final bool userAdded; // false = YOLO-detected + confirmed, true = manually drawn
  final DateTime timestamp;

  const FeedbackEntry({
    this.id,
    required this.imagePath,
    required this.classIndex,
    required this.className,
    required this.x1,
    required this.y1,
    required this.x2,
    required this.y2,
    required this.imageWidth,
    required this.imageHeight,
    required this.userAdded,
    required this.timestamp,
  });

  // YOLO format: class_idx cx_norm cy_norm w_norm h_norm
  String toYoloLabel() {
    final cx = (x1 + x2) / 2 / imageWidth;
    final cy = (y1 + y2) / 2 / imageHeight;
    final w  = (x2 - x1) / imageWidth;
    final h  = (y2 - y1) / imageHeight;
    return '$classIndex '
        '${cx.toStringAsFixed(6)} '
        '${cy.toStringAsFixed(6)} '
        '${w.toStringAsFixed(6)} '
        '${h.toStringAsFixed(6)}';
  }

  Map<String, dynamic> toMap() => {
    if (id != null) 'id': id,
    'image_path':    imagePath,
    'class_index':   classIndex,
    'class_name':    className,
    'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2,
    'image_width':   imageWidth,
    'image_height':  imageHeight,
    'user_added':    userAdded ? 1 : 0,
    'timestamp':     timestamp.toIso8601String(),
  };

  factory FeedbackEntry.fromMap(Map<String, dynamic> m) => FeedbackEntry(
    id:           m['id'],
    imagePath:    m['image_path'],
    classIndex:   m['class_index'],
    className:    m['class_name'],
    x1: m['x1'], y1: m['y1'], x2: m['x2'], y2: m['y2'],
    imageWidth:   m['image_width'],
    imageHeight:  m['image_height'],
    userAdded:    m['user_added'] == 1,
    timestamp:    DateTime.parse(m['timestamp']),
  );
}