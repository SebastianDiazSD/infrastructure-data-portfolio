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
  const _ClassOption({required this.index, required this.label,
      required this.color});
}

// ── User-drawn box stored in display coords; converted to image coords on save
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
  final img.Image             image;
  final List<DetectionResult> detections;
  final File                  imageFile;
  final double                threshold;

  const ResultScreen({super.key, required this.image,
      required this.detections, required this.imageFile,
      this.threshold = AppConfig.confThreshold});

  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  final _feedback = FeedbackService();

  // YOLO detections — visual mark only; NOT saved until _commitAll()
  final _pendingConfirmed = <int>{};
  final _pendingRejected  = <int>{};

  // Drawn boxes: pending = staged but not in SQLite yet
  //              saved   = already persisted (kept for overlay display only)
  final _pendingDrawnBoxes = <_DrawnBox>[];
  final _savedDrawnBoxes   = <_DrawnBox>[];

  // draw mode
  bool    _drawMode    = false;
  Offset? _dragStart;
  Offset? _dragCurrent;

  // set by LayoutBuilder — needed for display→image coord conversion at save time
  Size _displaySize = Size.zero;

  int _savedCount = 0;

  bool get _hasPending =>
      _pendingConfirmed.isNotEmpty || _pendingDrawnBoxes.isNotEmpty;

  @override
  void initState() {
    super.initState();
    _loadCount();
  }

  Future<void> _loadCount() async {
    final c = await _feedback.getCount();
    if (mounted) setState(() => _savedCount = c);
  }

  // ── Visual-only marks — no SQLite ──────────────────────────────────────────
  void _markConfirmed(int i) => setState(() {
    _pendingConfirmed.add(i);
    _pendingRejected.remove(i);
  });

  void _markRejected(int i) => setState(() {
    _pendingRejected.add(i);
    _pendingConfirmed.remove(i);
  });

  // ── Drawn boxes — pending only, no SQLite ──────────────────────────────────
  void _addPendingBox(_DrawnBox box) =>
      setState(() => _pendingDrawnBoxes.add(box));

  void _deletePendingBox(int index) =>
      setState(() => _pendingDrawnBoxes.removeAt(index));

  // ── Commit all pending to SQLite in one operation ─────────────────────────
  Future<void> _commitAll() async {
    int count = 0;

    // 1 — confirmed YOLO detections
    for (final i in _pendingConfirmed) {
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
      count++;
    }

    // 2 — manually drawn boxes: convert display → image coords at save time
    if (_displaySize != Size.zero) {
      final scaleX = widget.image.width  / _displaySize.width;
      final scaleY = widget.image.height / _displaySize.height;

      for (final drawn in _pendingDrawnBoxes) {
        final r = drawn.rect;
        await _feedback.saveEntry(FeedbackEntry(
          imagePath:   widget.imageFile.path,
          classIndex:  drawn.classIndex,
          className:   drawn.className,
          x1: (r.left   * scaleX).clamp(0.0, widget.image.width.toDouble()),
          y1: (r.top    * scaleY).clamp(0.0, widget.image.height.toDouble()),
          x2: (r.right  * scaleX).clamp(0.0, widget.image.width.toDouble()),
          y2: (r.bottom * scaleY).clamp(0.0, widget.image.height.toDouble()),
          imageWidth:  widget.image.width,
          imageHeight: widget.image.height,
          userAdded:   true,
          timestamp:   DateTime.now(),
        ));
        _savedDrawnBoxes.add(drawn); // move to saved for overlay persistence
        count++;
      }
    }

    setState(() {
      _pendingConfirmed.clear();
      _pendingRejected.clear();
      _pendingDrawnBoxes.clear();
      _savedCount += count;
    });

    _showSnack('✓ $count item(s) saved to feedback');
  }

  // ── Class picker bottom sheet ───────────────────────────────────────────────
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

  // ── Export ──────────────────────────────────────────────────────────────────
  Future<void> _export() async {
    try {
      final path = await _feedback.exportZip();
      if (mounted) _showSnack('Exported to: $path');
    } catch (e) {
      if (mounted) _showSnack('Export failed: $e');
    }
  }

  void _showSnack(String msg) => ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), duration: const Duration(seconds: 2)));

  // ─────────────────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final detCount   = widget.detections.length;
    final drawnCount = _savedDrawnBoxes.length + _pendingDrawnBoxes.length;
    final hasContent = detCount > 0 || drawnCount > 0;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: hasContent ? Colors.red[900] : Colors.green[800],
        foregroundColor: Colors.white,
        title: Text(detCount == 0 && drawnCount == 0
            ? 'No detections (conf ≥ ${widget.threshold.toStringAsFixed(2)})'
            : '$detCount detected'
              '${drawnCount > 0 ? " + $drawnCount added" : ""}'),
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
                      style: const TextStyle(
                          fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ),
            ),
        ],
      ),
      body: Column(children: [
        // ── Image + overlays ────────────────────────────────────────────────
        LayoutBuilder(builder: (ctx, constraints) {
          final w = constraints.maxWidth;
          final naturalH = w * widget.image.height / widget.image.width;
          final h = naturalH.clamp(0.0, MediaQuery.of(ctx).size.height * 0.58);
          _displaySize = Size(w, h);

          return SizedBox(width: w, height: h, child: Stack(children: [
            // Base image
            Image.file(widget.imageFile, width: w, height: h,
                fit: BoxFit.fill),

            // YOLO boxes (hide rejected)
            BoundingBoxOverlay(
              detections: [
                for (int i = 0; i < widget.detections.length; i++)
                  if (!_pendingRejected.contains(i)) widget.detections[i],
              ],
              imageSize:   Size(widget.image.width.toDouble(),
                                widget.image.height.toDouble()),
              displaySize: Size(w, h),
            ),

            // Drawn boxes: saved = solid, pending = dashed
            if (_savedDrawnBoxes.isNotEmpty || _pendingDrawnBoxes.isNotEmpty)
              CustomPaint(
                size: Size(w, h),
                painter: _DrawnBoxPainter(
                  saved:   _savedDrawnBoxes,
                  pending: _pendingDrawnBoxes,
                ),
              ),

            // Draw gesture layer
            if (_drawMode)
              GestureDetector(
                onPanStart:  (d) => setState(() => _dragStart = d.localPosition),
                onPanUpdate: (d) => setState(() => _dragCurrent = d.localPosition),
                onPanEnd:    (_) async {
                  if (_dragStart == null || _dragCurrent == null) return;
                  final start = _dragStart!;
                  final end   = _dragCurrent!;
                  setState(() { _dragStart = null; _dragCurrent = null; });
                  if ((end - start).distance < 20) return; // ignore accidental taps

                  final cls = await _pickClass();
                  if (cls == null) return;

                  _addPendingBox(_DrawnBox(
                    start:      start,
                    end:        end,
                    classIndex: cls.index,
                    className:  _classNames[cls.index],
                  ));
                  setState(() => _drawMode = false);
                },
                child: Container(
                  color: Colors.white.withOpacity(0.05),
                  child: Stack(children: [
                    if (_dragStart != null && _dragCurrent != null)
                      CustomPaint(
                        size: Size(w, h),
                        painter: _PreviewPainter(_dragStart!, _dragCurrent!),
                      ),
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

        // ── Content list ────────────────────────────────────────────────────
        Expanded(child: !hasContent && _pendingDrawnBoxes.isEmpty
            ? _emptyState()
            : _contentList()),

        // ── Action bar ──────────────────────────────────────────────────────
        _actionBar(),
      ]),
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
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

  // ── Content list: YOLO cards + pending drawn cards ──────────────────────────
  Widget _contentList() => ListView(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    children: [
      for (int i = 0; i < widget.detections.length; i++)
        _DetectionCard(
          detection: widget.detections[i],
          confirmed: _pendingConfirmed.contains(i),
          rejected:  _pendingRejected.contains(i),
          onConfirm: _pendingConfirmed.contains(i) ? null : () => _markConfirmed(i),
          onReject:  _pendingRejected.contains(i)  ? null : () => _markRejected(i),
        ),
      for (int i = 0; i < _pendingDrawnBoxes.length; i++)
        _PendingDrawnCard(
          box:      _pendingDrawnBoxes[i],
          onDelete: () => _deletePendingBox(i),
        ),
    ],
  );

  // ── Action bar ───────────────────────────────────────────────────────────────
  Widget _actionBar() => Container(
    color: const Color(0xFF111111),
    padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(children: [
          // Mark missed / Cancel draw mode
          Expanded(
            child: ElevatedButton.icon(
              icon: Icon(
                  _drawMode ? Icons.cancel : Icons.add_box_outlined, size: 18),
              label: Text(_drawMode ? 'Cancel' : 'Mark missed',
                  style: const TextStyle(fontSize: 12)),
              style: ElevatedButton.styleFrom(
                backgroundColor: _drawMode
                    ? Colors.grey[800] : const Color(0xFF1565C0),
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
          // Save pending — active only when there is something to save
          Expanded(
            child: ElevatedButton.icon(
              icon: const Icon(Icons.save_outlined, size: 18),
              label: Text(
                _hasPending
                    ? 'Save '
                      '(${_pendingConfirmed.length + _pendingDrawnBoxes.length})'
                    : 'Save',
                style: const TextStyle(fontSize: 12),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor:
                    _hasPending ? Colors.green[700] : Colors.grey[800],
                minimumSize: const Size(0, 44),
              ),
              onPressed: _hasPending ? _commitAll : null,
            ),
          ),
        ]),
        // Export row — only rendered when there is saved data
        if (_savedCount > 0) ...[
          const SizedBox(height: 6),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.upload_file, size: 18),
              label: Text('Export training data ($_savedCount items)',
                  style: const TextStyle(fontSize: 12)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.amber[800],
                minimumSize: const Size(0, 38),
              ),
              onPressed: _export,
            ),
          ),
        ],
      ],
    ),
  );
}

// ── Pending drawn box card — shows before save, has delete button ─────────────
class _PendingDrawnCard extends StatelessWidget {
  final _DrawnBox    box;
  final VoidCallback onDelete;
  const _PendingDrawnCard({required this.box, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final cls = _activeClasses.firstWhere(
        (c) => c.index == box.classIndex,
        orElse: () => _activeClasses[0]);

    return Card(
      color: const Color(0xFF1A1C2A),
      margin: const EdgeInsets.symmetric(vertical: 3),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Row(children: [
          Container(width: 3, height: 44, color: cls.color),
          const SizedBox(width: 10),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(cls.label.toUpperCase(),
                  style: const TextStyle(color: Colors.white,
                      fontWeight: FontWeight.bold, fontSize: 12)),
              const Text('Manually drawn · tap Save to commit',
                  style: TextStyle(color: Colors.white38, fontSize: 11)),
            ],
          )),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
            onPressed: onDelete,
            tooltip: 'Remove this box',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
        ]),
      ),
    );
  }
}

// ── Detection card ────────────────────────────────────────────────────────────
class _DetectionCard extends StatelessWidget {
  final DetectionResult detection;
  final bool            confirmed, rejected;
  final VoidCallback?   onConfirm, onReject;

  const _DetectionCard({
    required this.detection, required this.confirmed, required this.rejected,
    this.onConfirm, this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    final sev    = detection.severity;
    final color  = Color(AppConfig.classColors[detection.classIndex] ?? 0xFFFFFFFF);
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
                Text(sev.description,
                    style: const TextStyle(color: Colors.white70, fontSize: 11),
                    maxLines: 2, overflow: TextOverflow.ellipsis),
            ],
          )),
          const SizedBox(width: 8),
          if (sev != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                  color: tColor, borderRadius: BorderRadius.circular(5)),
              child: Text('SK${sev.schadenklasse}',
                  style: const TextStyle(color: Colors.white,
                      fontWeight: FontWeight.bold, fontSize: 13)),
            )
          else
            const SizedBox(width: 36, height: 36,
                child: CircularProgressIndicator(strokeWidth: 2)),
          const SizedBox(width: 8),
          Column(children: [
            _FeedbackButton(
              icon: Icons.check, color: Colors.green,
              active: confirmed, onTap: onConfirm,
              tooltip: 'Correct — mark for saving',
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
  final IconData      icon;
  final Color         color;
  final bool          active;
  final VoidCallback? onTap;
  final String        tooltip;

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
          border: Border.all(
              color: active ? color : Colors.grey[700]!, width: 1),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Icon(icon, size: 16,
            color: active ? color : Colors.grey[600]),
      ),
    ),
  );
}

// ── Painters ──────────────────────────────────────────────────────────────────

class _DrawnBoxPainter extends CustomPainter {
  final List<_DrawnBox> saved, pending;
  _DrawnBoxPainter({required this.saved, required this.pending});

  @override
  void paint(Canvas canvas, Size size) {
    _draw(canvas, saved,   dashed: false);
    _draw(canvas, pending, dashed: true);
  }

  void _draw(Canvas canvas, List<_DrawnBox> boxes, {required bool dashed}) {
    for (final box in boxes) {
      final cls = _activeClasses.firstWhere(
          (c) => c.index == box.classIndex,
          orElse: () => _activeClasses[0]);
      final paint = Paint()
        ..color      = dashed ? cls.color.withOpacity(0.6) : cls.color
        ..style      = PaintingStyle.stroke
        ..strokeWidth = 2.5;

      dashed
          ? _drawDashedRect(canvas, box.rect, paint)
          : canvas.drawRect(box.rect, paint);

      final tp = TextPainter(
        text: TextSpan(
          text: dashed ? ' ${cls.label} ⏳ ' : ' ${cls.label} ',
          style: TextStyle(color: Colors.white, fontSize: 11,
              backgroundColor: cls.color.withOpacity(0.8)),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, box.rect.topLeft + const Offset(0, -14));
    }
  }

  void _drawDashedRect(Canvas canvas, Rect rect, Paint paint) {
    _dashLine(canvas, rect.topLeft,    rect.topRight,    paint);
    _dashLine(canvas, rect.topRight,   rect.bottomRight, paint);
    _dashLine(canvas, rect.bottomRight, rect.bottomLeft, paint);
    _dashLine(canvas, rect.bottomLeft, rect.topLeft,     paint);
  }

  void _dashLine(Canvas c, Offset a, Offset b, Paint p,
      [double dash = 6, double gap = 4]) {
    final len = (b - a).distance;
    final dir = (b - a) / len;
    double d = 0;
    bool on = true;
    while (d < len) {
      final seg = (on ? dash : gap).clamp(0.0, len - d);
      if (on) c.drawLine(a + dir * d, a + dir * (d + seg), p);
      d += seg;
      on = !on;
    }
  }

  @override
  bool shouldRepaint(_DrawnBoxPainter old) =>
      old.saved != saved || old.pending != pending;
}

class _PreviewPainter extends CustomPainter {
  final Offset start, end;
  _PreviewPainter(this.start, this.end);

  @override
  void paint(Canvas canvas, Size size) => canvas.drawRect(
    Rect.fromPoints(start, end),
    Paint()
      ..color = Colors.yellowAccent
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2,
  );

  @override
  bool shouldRepaint(_PreviewPainter old) =>
      old.start != start || old.end != end;
}