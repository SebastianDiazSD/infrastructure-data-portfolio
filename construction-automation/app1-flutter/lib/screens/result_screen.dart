import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import '../models/detection_result.dart';
import '../models/feedback_entry.dart';
import '../services/feedback_service.dart';
import '../widgets/bounding_box_overlay.dart';
import '../config/app_config.dart';

// ── Class names and colours ───────────────────────────────────────────────────
const _classNames = ['broken_rail', 'corner_breakout',
                     'spalling_body', 'spalling_rail_seat', 'surface_crack'];

const _activeClasses = [
  _ClassOption(index: 1, label: 'Corner Breakout',    color: Color(0xFFE53935)),
  _ClassOption(index: 2, label: 'Spalling Body',      color: Color(0xFFFF9800)),
  _ClassOption(index: 3, label: 'Spalling Rail Seat', color: Color(0xFF8E24AA)),
];

class _ClassOption {
  final int    index;
  final String label;
  final Color  color;
  const _ClassOption({required this.index, required this.label, required this.color});
}

// ── User-drawn box (display coords, converted to image coords on save) ────────
class _DrawnBox {
  final Offset start, end;
  final int classIndex;
  final String className;
  const _DrawnBox({required this.start, required this.end,
                   required this.classIndex, required this.className});
  Rect get rect => Rect.fromPoints(start, end);
}

// ─────────────────────────────────────────────────────────────────────────────

class ResultScreen extends StatefulWidget {
  final img.Image          image;
  final List<DetectionResult> detections;
  final File               imageFile;
  final double             threshold;

  const ResultScreen({super.key, required this.image,
      required this.detections, required this.imageFile,
      this.threshold = AppConfig.confThreshold});

  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  final _feedback = FeedbackService();

  // confirmed/rejected sets (index into widget.detections)
  final _confirmed = <int>{};
  final _rejected  = <int>{};

  // draw mode
  bool   _drawMode   = false;
  Offset? _dragStart;
  Offset? _dragCurrent;
  final  _drawnBoxes = <_DrawnBox>[];

  // display size of the image widget (set by LayoutBuilder)
  Size _displaySize = Size.zero;

  int _savedCount = 0;

  @override
  void initState() {
    super.initState();
    _loadCount();
  }

  Future<void> _loadCount() async {
    final c = await _feedback.getCount();
    if (mounted) setState(() => _savedCount = c);
  }

  // ── Confirm a YOLO detection ────────────────────────────────────────────────
  Future<void> _confirm(int i) async {
    final det = widget.detections[i];
    await _feedback.saveEntry(FeedbackEntry(
      imagePath:   widget.imageFile.path,
      classIndex:  det.classIndex,
      className:   det.className,
      x1: det.box.x1, y1: det.box.y1,
      x2: det.box.x2, y2: det.box.y2,
      imageWidth:  widget.image.width,
      imageHeight: widget.image.height,
      userAdded:   false,
      timestamp:   DateTime.now(),
    ));
    setState(() { _confirmed.add(i); _rejected.remove(i); _savedCount++; });
    _showSnack('✓ Confirmed and saved');
  }

  // ── Reject a YOLO detection (false positive) ────────────────────────────────
  void _reject(int i) => setState(() { _rejected.add(i); _confirmed.remove(i); });

  // ── Save a user-drawn box ───────────────────────────────────────────────────
  Future<void> _saveDrawnBox(_DrawnBox drawn) async {
    if (_displaySize == Size.zero) return;

    // Convert display coords → image pixel coords
    final scaleX = widget.image.width  / _displaySize.width;
    final scaleY = widget.image.height / _displaySize.height;

    final rect = drawn.rect;
    final x1 = (rect.left   * scaleX).clamp(0.0, widget.image.width.toDouble());
    final y1 = (rect.top    * scaleY).clamp(0.0, widget.image.height.toDouble());
    final x2 = (rect.right  * scaleX).clamp(0.0, widget.image.width.toDouble());
    final y2 = (rect.bottom * scaleY).clamp(0.0, widget.image.height.toDouble());

    await _feedback.saveEntry(FeedbackEntry(
      imagePath:   widget.imageFile.path,
      classIndex:  drawn.classIndex,
      className:   drawn.className,
      x1: x1, y1: y1, x2: x2, y2: y2,
      imageWidth:  widget.image.width,
      imageHeight: widget.image.height,
      userAdded:   true,
      timestamp:   DateTime.now(),
    ));
    setState(() { _drawnBoxes.add(drawn); _savedCount++; });
    _showSnack('📌 Defect saved: ${drawn.className.replaceAll("_", " ")}');
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), duration: const Duration(seconds: 2)));
  }

  // ── Class selector bottom sheet ─────────────────────────────────────────────
  Future<_ClassOption?> _pickClass() => showModalBottomSheet<_ClassOption>(
    context: context,
    backgroundColor: const Color(0xFF1A1A1A),
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
    builder: (_) => Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Padding(
          padding: EdgeInsets.all(16),
          child: Text('Select defect class',
              style: TextStyle(color: Colors.white70,
                  fontWeight: FontWeight.bold, fontSize: 15)),
        ),
        ..._activeClasses.map((c) => ListTile(
          leading: CircleAvatar(backgroundColor: c.color, radius: 10),
          title: Text(c.label,
              style: const TextStyle(color: Colors.white, fontSize: 14)),
          onTap: () => Navigator.pop(context, c),
        )),
        const SizedBox(height: 16),
      ],
    ),
  );

  // ── Export feedback ──────────────────────────────────────────────────────────
  Future<void> _export() async {
    try {
      final path = await _feedback.exportZip();
      if (mounted) _showSnack('Exported to: $path');
    } catch (e) {
      if (mounted) _showSnack('Export failed: $e');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final hasDetections = widget.detections.isNotEmpty || _drawnBoxes.isNotEmpty;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: hasDetections ? Colors.red[900] : Colors.green[800],
        foregroundColor: Colors.white,
        title: Text(widget.detections.isEmpty && _drawnBoxes.isEmpty
            ? 'No detections (conf ≥ ${widget.threshold.toStringAsFixed(2)})'
            : '${widget.detections.length} detected'
              '${_drawnBoxes.isNotEmpty ? " + ${_drawnBoxes.length} added" : ""}'),
        actions: [
          if (_savedCount > 0)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.amber[700],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text('$_savedCount saved',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ),
            ),
        ],
      ),
      body: Column(children: [
        // ── Image + overlays ──────────────────────────────────────────────────
        LayoutBuilder(builder: (ctx, constraints) {
          final w = constraints.maxWidth;
          final naturalH = w * widget.image.height / widget.image.width;
          final h = naturalH.clamp(0.0, MediaQuery.of(ctx).size.height * 0.58);
          _displaySize = Size(w, h);

          return SizedBox(width: w, height: h, child: Stack(children: [
            // Base image
            Image.file(widget.imageFile, width: w, height: h, fit: BoxFit.fill),

            // YOLO bounding boxes (hide rejected ones)
            BoundingBoxOverlay(
  detections: [
    for (int i = 0; i < widget.detections.length; i++)
      if (!_rejected.contains(i)) widget.detections[i],
  ],
              imageSize:   Size(widget.image.width.toDouble(),
                                widget.image.height.toDouble()),
              displaySize: Size(w, h),
            ),

            // User-drawn boxes
            if (_drawnBoxes.isNotEmpty)
              CustomPaint(
                size: Size(w, h),
                painter: _DrawnBoxPainter(_drawnBoxes),
              ),

            // Active draw gesture + preview
            if (_drawMode)
              GestureDetector(
                onPanStart:  (d) => setState(() => _dragStart = d.localPosition),
                onPanUpdate: (d) => setState(() => _dragCurrent = d.localPosition),
                onPanEnd:    (_) async {
                  if (_dragStart == null || _dragCurrent == null) return;
                  final start = _dragStart!;
                  final end   = _dragCurrent!;
                  setState(() { _dragStart = null; _dragCurrent = null; });

                  if ((end - start).distance < 20) return; // too small

                  final cls = await _pickClass();
                  if (cls == null) return;

                  await _saveDrawnBox(_DrawnBox(
                    start: start, end: end,
                    classIndex: cls.index,
                    className:  _classNames[cls.index],
                  ));
                  setState(() => _drawMode = false);
                },
                child: Container(
                  color: Colors.white.withOpacity(0.05),
                  child: Stack(children: [
                    // Draw preview rectangle
                    if (_dragStart != null && _dragCurrent != null)
                      CustomPaint(
                        size: Size(w, h),
                        painter: _PreviewPainter(_dragStart!, _dragCurrent!),
                      ),
                    // Instruction overlay
                    const Center(child: Text(
                      'Drag to mark missed defect',
                      style: TextStyle(color: Colors.white70, fontSize: 13,
                          backgroundColor: Colors.black54),
                    )),
                  ]),
                ),
              ),
          ]));
        }),

        // ── Bottom panel ──────────────────────────────────────────────────────
        Expanded(child: widget.detections.isEmpty && _drawnBoxes.isEmpty
            ? _emptyState()
            : _detectionList()),

        // ── Action bar ────────────────────────────────────────────────────────
        _actionBar(),
      ]),
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  Widget _emptyState() => SingleChildScrollView(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(children: [
        const Icon(Icons.check_circle, color: Colors.green, size: 40),
        const SizedBox(height: 8),
        const Text('No defects detected',
            style: TextStyle(color: Colors.green, fontSize: 15)),
        const SizedBox(height: 4),
        Text('Threshold: ${widget.threshold.toStringAsFixed(2)}',
            style: TextStyle(color: Colors.grey[600], fontSize: 12)),
        const SizedBox(height: 8),
        Text(
          'Lower the confidence slider or use a closer shot.\n'
          'If there IS a defect, use "Mark missed defect" below.',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.grey[500], fontSize: 12),
        ),
      ]),
    ),
  );

  // ── Detection list ───────────────────────────────────────────────────────────
  Widget _detectionList() => ListView.builder(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    itemCount: widget.detections.length,
    itemBuilder: (_, i) {
      final det = widget.detections[i];
      final isConfirmed = _confirmed.contains(i);
      final isRejected  = _rejected.contains(i);
      return _DetectionCard(
        detection:   det,
        confirmed:   isConfirmed,
        rejected:    isRejected,
        onConfirm:   isConfirmed ? null : () => _confirm(i),
        onReject:    isRejected  ? null : () => _reject(i),
      );
    },
  );

  // ── Action bar at bottom ─────────────────────────────────────────────────────
  Widget _actionBar() => Container(
    color: const Color(0xFF111111),
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    child: Row(children: [
      // Mark missed defect
      Expanded(
        child: ElevatedButton.icon(
          icon: Icon(_drawMode ? Icons.cancel : Icons.add_box_outlined,
              size: 18),
          label: Text(_drawMode ? 'Cancel' : 'Mark missed',
              style: const TextStyle(fontSize: 12)),
          style: ElevatedButton.styleFrom(
            backgroundColor: _drawMode ? Colors.grey[800]
                                       : const Color(0xFF1565C0),
            minimumSize: const Size(0, 44),
          ),
          onPressed: () => setState(() {
            _drawMode = !_drawMode;
            _dragStart = null;
            _dragCurrent = null;
          }),
        ),
      ),
      const SizedBox(width: 8),
      // Export
      ElevatedButton.icon(
        icon: const Icon(Icons.upload_file, size: 18),
        label: Text('Export ($_savedCount)',
            style: const TextStyle(fontSize: 12)),
        style: ElevatedButton.styleFrom(
          backgroundColor: _savedCount > 0
              ? Colors.amber[800] : Colors.grey[800],
          minimumSize: const Size(0, 44),
        ),
        onPressed: _savedCount > 0 ? _export : null,
      ),
    ]),
  );
}

// ── Detection card with confirm/reject ───────────────────────────────────────
class _DetectionCard extends StatelessWidget {
  final DetectionResult detection;
  final bool  confirmed, rejected;
  final VoidCallback? onConfirm, onReject;

  const _DetectionCard({
    required this.detection, required this.confirmed, required this.rejected,
    this.onConfirm, this.onReject,
  });

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

    Color cardBg = const Color(0xFF1E1E1E);
    if (confirmed) cardBg = const Color(0xFF1B3A1B);
    if (rejected)  cardBg = const Color(0xFF3A1B1B);

    return Card(
      color: cardBg,
      margin: const EdgeInsets.symmetric(vertical: 3),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Row(children: [
          Container(width: 3, height: 56, color: color),
          const SizedBox(width: 10),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(detection.className.replaceAll('_', ' ').toUpperCase(),
                  style: const TextStyle(color: Colors.white,
                      fontWeight: FontWeight.bold, fontSize: 12)),
              Text('Conf: ${(detection.confidence * 100).toStringAsFixed(1)}%',
                  style: TextStyle(color: Colors.grey[500], fontSize: 11)),
              if (sev != null)
                Text(sev.description, style: const TextStyle(
                    color: Colors.white70, fontSize: 11),
                    maxLines: 2, overflow: TextOverflow.ellipsis),
            ],
          )),
          const SizedBox(width: 8),
          // SK badge
          if (sev != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(color: tColor,
                  borderRadius: BorderRadius.circular(5)),
              child: Text('SK${sev.schadenklasse}',
                  style: const TextStyle(color: Colors.white,
                      fontWeight: FontWeight.bold, fontSize: 13)),
            )
          else
            const SizedBox(width: 36, height: 36,
                child: CircularProgressIndicator(strokeWidth: 2)),
          const SizedBox(width: 8),
          // Confirm / Reject buttons
          Column(children: [
            _FeedbackButton(
              icon: Icons.check, color: Colors.green,
              active: confirmed, onTap: onConfirm,
              tooltip: 'Correct — save as training data',
            ),
            const SizedBox(height: 4),
            _FeedbackButton(
              icon: Icons.close, color: Colors.red,
              active: rejected, onTap: onReject,
              tooltip: 'False positive — ignore',
            ),
          ]),
        ]),
      ),
    );
  }
}

class _FeedbackButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final bool active;
  final VoidCallback? onTap;
  final String tooltip;

  const _FeedbackButton({required this.icon, required this.color,
      required this.active, this.onTap, required this.tooltip});

  @override
  Widget build(BuildContext context) => Tooltip(
    message: tooltip,
    child: GestureDetector(
      onTap: onTap,
      child: Container(
        width: 30, height: 26,
        decoration: BoxDecoration(
          color: active ? color.withOpacity(0.3) : Colors.transparent,
          border: Border.all(color: active ? color : Colors.grey[700]!, width: 1),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Icon(icon, size: 16,
            color: active ? color : Colors.grey[600]),
      ),
    ),
  );
}

// ── Painters ─────────────────────────────────────────────────────────────────

class _DrawnBoxPainter extends CustomPainter {
  final List<_DrawnBox> boxes;
  _DrawnBoxPainter(this.boxes);

  @override
  void paint(Canvas canvas, Size size) {
    for (final box in boxes) {
      final cls = _activeClasses.firstWhere(
        (c) => c.index == box.classIndex,
        orElse: () => _activeClasses[0],
      );
      final paint = Paint()
        ..color = cls.color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5;
      canvas.drawRect(box.rect, paint);

      final tp = TextPainter(
        text: TextSpan(
          text: ' ${cls.label} ',
          style: TextStyle(color: Colors.white, fontSize: 11,
              backgroundColor: cls.color.withOpacity(0.8)),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, box.rect.topLeft + const Offset(0, -14));
    }
  }

  @override
  bool shouldRepaint(_DrawnBoxPainter old) => old.boxes != boxes;
}

class _PreviewPainter extends CustomPainter {
  final Offset start, end;
  _PreviewPainter(this.start, this.end);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Rect.fromPoints(start, end),
      Paint()
        ..color = Colors.yellowAccent
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(_PreviewPainter old) =>
      old.start != start || old.end != end;
}