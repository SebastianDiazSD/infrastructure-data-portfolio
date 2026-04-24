import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import '../models/detection_result.dart';
import '../models/feedback_entry.dart';
import '../services/feedback_service.dart';
import '../widgets/bounding_box_overlay.dart';
import '../config/app_config.dart';

// ── nc=3 class constants — must match app_config.dart ────────────────────────
const _classNames = [
  'corner_breakout',
  'spalling_body',
  'spalling_rail_seat',
];

const _activeClasses = [
  _ClassOption(index: 0, label: 'Corner Breakout',    color: Color(0xFFE53935)),
  _ClassOption(index: 1, label: 'Spalling Body',      color: Color(0xFFFF9800)),
  _ClassOption(index: 2, label: 'Spalling Rail Seat', color: Color(0xFF8E24AA)),
];

class _ClassOption {
  final int    index;
  final String label;
  final Color  color;
  const _ClassOption(
      {required this.index, required this.label, required this.color});
}

// ── User-drawn box (display coords; converted to image coords at commit) ──────
class _DrawnBox {
  final Offset start, end;
  final int    classIndex;
  final String className;
  const _DrawnBox(
      {required this.start, required this.end,
       required this.classIndex, required this.className});
  Rect get rect => Rect.fromPoints(start, end);
}

// ─────────────────────────────────────────────────────────────────────────────

class ResultScreen extends StatefulWidget {
  final img.Image             image;
  final List<DetectionResult> detections;
  final File                  imageFile;
  final double                threshold;

  const ResultScreen({
    super.key,
    required this.image,
    required this.detections,
    required this.imageFile,
    this.threshold = AppConfig.confThreshold,
  });

  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  final _feedback = FeedbackService();

  // YOLO detections — visual marks only; NOT written to SQLite until _commitAll()
  final _pendingConfirmed = <int>{};
  final _pendingRejected  = <int>{};

  // Box edits — keyed by detection index
  final Map<int, Rect>        _editDisplayRects = {};
  final Map<int, BoundingBox> _editedBoxes      = {};
  int? _editingIndex;

  // Drawn boxes: pending = staged; saved = already persisted
  final _pendingDrawnBoxes = <_DrawnBox>[];
  final _savedDrawnBoxes   = <_DrawnBox>[];

  bool    _drawMode    = false;
  Offset? _dragStart;
  Offset? _dragCurrent;

  Size _displaySize = Size.zero;
  int  _savedCount  = 0;

  late final LetterboxInfo _letterbox;

  bool get _hasPending =>
      _pendingConfirmed.isNotEmpty || _pendingDrawnBoxes.isNotEmpty;

  @override
  void initState() {
    super.initState();
    _letterbox = LetterboxInfo.fromImageSize(
        widget.image.width, widget.image.height);
    _loadCount();
  }

  Future<void> _loadCount() async {
    final c = await _feedback.getCount();
    if (mounted) setState(() => _savedCount = c);
  }

  void _markConfirmed(int i) => setState(() {
    _pendingConfirmed.add(i);
    _pendingRejected.remove(i);
  });

  void _markRejected(int i) => setState(() {
    _pendingRejected.add(i);
    _pendingConfirmed.remove(i);
  });

  void _startEdit(int i) {
    if (_displaySize == Size.zero) return;
    final box = _editedBoxes[i] ?? widget.detections[i].box;
    final sx  = _displaySize.width  / widget.image.width;
    final sy  = _displaySize.height / widget.image.height;
    setState(() {
      _drawMode     = false;
      _editingIndex = i;
      _editDisplayRects[i] = Rect.fromLTRB(
          box.x1 * sx, box.y1 * sy, box.x2 * sx, box.y2 * sy);
    });
  }

  void _finishEdit() {
    if (_editingIndex == null) return;
    final i  = _editingIndex!;
    final r  = _editDisplayRects[i]!;
    final sx = widget.image.width  / _displaySize.width;
    final sy = widget.image.height / _displaySize.height;
    _editedBoxes[i] = BoundingBox(
      x1: (r.left   * sx).clamp(0, widget.image.width.toDouble()),
      y1: (r.top    * sy).clamp(0, widget.image.height.toDouble()),
      x2: (r.right  * sx).clamp(0, widget.image.width.toDouble()),
      y2: (r.bottom * sy).clamp(0, widget.image.height.toDouble()),
    );
    setState(() => _editingIndex = null);
  }

  void _cancelEdit() => setState(() => _editingIndex = null);

  void _addPendingBox(_DrawnBox box) =>
      setState(() => _pendingDrawnBoxes.add(box));

  void _deletePendingBox(int index) =>
      setState(() => _pendingDrawnBoxes.removeAt(index));

  Future<void> _commitAll() async {
    int count = 0;

    for (final i in _pendingConfirmed) {
      final det = widget.detections[i];
      final box = _editedBoxes[i] ?? det.box;
      await _feedback.saveEntry(FeedbackEntry(
        imagePath:   widget.imageFile.path,
        classIndex:  det.classIndex,
        className:   det.className,
        x1: box.x1, y1: box.y1, x2: box.x2, y2: box.y2,
        imageWidth:  widget.image.width,
        imageHeight: widget.image.height,
        userAdded:   false,
        timestamp:   DateTime.now(),
      ));
      count++;
    }

    if (_displaySize != Size.zero) {
      final scaleX = widget.image.width  / _displaySize.width;
      final scaleY = widget.image.height / _displaySize.height;
      for (final drawn in _pendingDrawnBoxes) {
        final r = drawn.rect;
        await _feedback.saveEntry(FeedbackEntry(
          imagePath:   widget.imageFile.path,
          classIndex:  drawn.classIndex,
          className:   drawn.className,
          x1: (r.left   * scaleX).clamp(0, widget.image.width.toDouble()),
          y1: (r.top    * scaleY).clamp(0, widget.image.height.toDouble()),
          x2: (r.right  * scaleX).clamp(0, widget.image.width.toDouble()),
          y2: (r.bottom * scaleY).clamp(0, widget.image.height.toDouble()),
          imageWidth:  widget.image.width,
          imageHeight: widget.image.height,
          userAdded:   true,
          timestamp:   DateTime.now(),
        ));
        _savedDrawnBoxes.add(drawn);
        count++;
      }
    }

    setState(() {
      _pendingConfirmed.clear();
      _pendingDrawnBoxes.clear();
      _savedCount += count;
    });
    _showSnack('✓ $count item(s) saved to feedback');
  }

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
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                      color: Colors.amber[700],
                      borderRadius: BorderRadius.circular(12)),
                  child: Text('$_savedCount saved',
                      style: const TextStyle(
                          fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ),
            ),
        ],
      ),
      body: Column(children: [
        LayoutBuilder(builder: (ctx, constraints) {
          final w        = constraints.maxWidth;
          final naturalH = w * widget.image.height / widget.image.width;
          final h = naturalH.clamp(
              0.0, MediaQuery.of(ctx).size.height * 0.58);
          _displaySize = Size(w, h);

          return SizedBox(
            width: w, height: h,
            child: Stack(children: [
              Image.file(widget.imageFile,
                  width: w, height: h, fit: BoxFit.fill),

              BoundingBoxOverlay(
                detections: [
                  for (int i = 0; i < widget.detections.length; i++)
                    if (!_pendingRejected.contains(i))
                      widget.detections[i],
                ],
                imageSize:   Size(widget.image.width.toDouble(),
                                  widget.image.height.toDouble()),
                displaySize: Size(w, h),
                letterbox:   _letterbox,
              ),

              if (_savedDrawnBoxes.isNotEmpty ||
                  _pendingDrawnBoxes.isNotEmpty)
                CustomPaint(
                  size: Size(w, h),
                  painter: _DrawnBoxPainter(
                      saved: _savedDrawnBoxes,
                      pending: _pendingDrawnBoxes),
                ),

              if (_editingIndex != null)
                _EditModeOverlay(
                  rect:  _editDisplayRects[_editingIndex!]!,
                  color: Color(AppConfig.classColors[
                      widget.detections[_editingIndex!].classIndex] ??
                      0xFFFFFF),
                  size:  Size(w, h),
                  onRectChanged: (r) => setState(
                      () => _editDisplayRects[_editingIndex!] = r),
                  onDone:   _finishEdit,
                  onCancel: _cancelEdit,
                ),

              if (_drawMode)
                GestureDetector(
                  onPanStart:  (d) =>
                      setState(() => _dragStart = d.localPosition),
                  onPanUpdate: (d) =>
                      setState(() => _dragCurrent = d.localPosition),
                  onPanEnd: (_) async {
                    if (_dragStart == null || _dragCurrent == null) return;
                    final start = _dragStart!;
                    final end   = _dragCurrent!;
                    setState(() {
                      _dragStart = null; _dragCurrent = null;
                    });
                    if ((end - start).distance < 20) return;
                    final cls = await _pickClass();
                    if (cls == null) return;
                    _addPendingBox(_DrawnBox(
                      start: start, end: end,
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
                          painter: _PreviewPainter(
                              _dragStart!, _dragCurrent!),
                        ),
                      const Center(child: Text(
                        'Drag to mark missed defect',
                        style: TextStyle(color: Colors.white70,
                            fontSize: 13,
                            backgroundColor: Colors.black54),
                      )),
                    ]),
                  ),
                ),
            ]),
          );
        }),

        Expanded(
          child: !hasContent && _pendingDrawnBoxes.isEmpty
              ? _emptyState()
              : _contentList(),
        ),

        _actionBar(),
      ]),
    );
  }

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

  Widget _contentList() => ListView(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    children: [
      for (int i = 0; i < widget.detections.length; i++)
        _DetectionCard(
          detection:  widget.detections[i],
          confirmed:  _pendingConfirmed.contains(i),
          rejected:   _pendingRejected.contains(i),
          isEditing:  _editingIndex == i,
          hasEdit:    _editedBoxes.containsKey(i),
          onConfirm:  _pendingConfirmed.contains(i)
              ? null : () => _markConfirmed(i),
          onReject:   _pendingRejected.contains(i)
              ? null : () => _markRejected(i),
          onEdit: () => _editingIndex == i
              ? _finishEdit() : _startEdit(i),
        ),
      for (int i = 0; i < _pendingDrawnBoxes.length; i++)
        _PendingDrawnCard(
          box:      _pendingDrawnBoxes[i],
          onDelete: () => _deletePendingBox(i),
        ),
    ],
  );

  Widget _actionBar() => Container(
    color: const Color(0xFF111111),
    padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(children: [
          Expanded(
            child: ElevatedButton.icon(
              icon: Icon(
                  _drawMode ? Icons.cancel : Icons.add_box_outlined,
                  size: 18),
              label: Text(_drawMode ? 'Cancel' : 'Mark missed',
                  style: const TextStyle(fontSize: 12)),
              style: ElevatedButton.styleFrom(
                backgroundColor: _drawMode
                    ? Colors.grey[800] : const Color(0xFF1565C0),
                minimumSize: const Size(0, 44),
              ),
              onPressed: () => setState(() {
                _drawMode    = !_drawMode;
                _dragStart   = null;
                _dragCurrent = null;
                if (_drawMode) _editingIndex = null;
              }),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: ElevatedButton.icon(
              icon: const Icon(Icons.save_outlined, size: 18),
              label: Text(
                _hasPending
                    ? 'Save (${_pendingConfirmed.length + _pendingDrawnBoxes.length})'
                    : 'Save',
                style: const TextStyle(fontSize: 12),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: _hasPending
                    ? Colors.green[700] : Colors.grey[800],
                minimumSize: const Size(0, 44),
              ),
              onPressed: _hasPending ? _commitAll : null,
            ),
          ),
        ]),
        if (_savedCount > 0) ...[
          const SizedBox(height: 6),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.upload_file, size: 18),
              label: Text(
                  'Export training data ($_savedCount items)',
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

// ── Pending drawn card ────────────────────────────────────────────────────────
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
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12)),
              const Text('Manually drawn · tap Save to commit',
                  style: TextStyle(
                      color: Colors.white38, fontSize: 11)),
            ],
          )),
          IconButton(
            icon: const Icon(Icons.delete_outline,
                color: Colors.red, size: 20),
            onPressed: onDelete,
            tooltip: 'Remove this box',
            padding: EdgeInsets.zero,
            constraints:
                const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
        ]),
      ),
    );
  }
}

// ── Detection card ────────────────────────────────────────────────────────────
class _DetectionCard extends StatelessWidget {
  final DetectionResult detection;
  final bool          confirmed, rejected, isEditing, hasEdit;
  final VoidCallback? onConfirm, onReject, onEdit;

  const _DetectionCard({
    required this.detection, required this.confirmed,
    required this.rejected,  required this.isEditing,
    required this.hasEdit,   this.onConfirm,
    this.onReject,           this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    final sev   = detection.severity;
    final color = Color(
        AppConfig.classColors[detection.classIndex] ?? 0xFFFFFFFF);
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
              Text(detection.className
                  .replaceAll('_', ' ').toUpperCase(),
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12)),
              Text(
                'Conf: ${(detection.confidence*100).toStringAsFixed(1)}%'
                '${hasEdit ? "  ✏ edited" : ""}',
                style: TextStyle(
                    color: Colors.grey[500], fontSize: 11),
              ),
              if (sev != null)
                Text(sev.description,
                    style: const TextStyle(
                        color: Colors.white70, fontSize: 11),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis),
            ],
          )),
          const SizedBox(width: 8),
          if (sev != null)
            Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                  color: tColor,
                  borderRadius: BorderRadius.circular(5)),
              child: Text('SK${sev.schadenklasse}',
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 13)),
            )
          else
            const SizedBox(width: 36, height: 36,
                child: CircularProgressIndicator(strokeWidth: 2)),
          const SizedBox(width: 6),
          _ActionButton(
            icon: Icons.edit, color: Colors.blue,
            active: isEditing, onTap: onEdit,
            tooltip: isEditing ? 'Finish editing' : 'Edit box position',
          ),
          const SizedBox(width: 4),
          Column(children: [
            _ActionButton(
              icon: Icons.check, color: Colors.green,
              active: confirmed, onTap: onConfirm,
              tooltip: 'Correct — mark for saving',
            ),
            const SizedBox(height: 4),
            _ActionButton(
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

class _ActionButton extends StatelessWidget {
  final IconData icon; final Color color;
  final bool active;  final VoidCallback? onTap;
  final String tooltip;
  const _ActionButton({required this.icon, required this.color,
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

// ── Edit mode overlay ─────────────────────────────────────────────────────────
class _EditModeOverlay extends StatelessWidget {
  final Rect rect; final Color color; final Size size;
  final ValueChanged<Rect> onRectChanged;
  final VoidCallback onDone, onCancel;
  static const _hs = 22.0; static const _minSz = 20.0;

  const _EditModeOverlay({required this.rect, required this.color,
      required this.size, required this.onRectChanged,
      required this.onDone, required this.onCancel});

  Rect _clamp(double l, double t, double r, double b) => Rect.fromLTRB(
    l.clamp(0.0, r - _minSz), t.clamp(0.0, b - _minSz),
    r.clamp(l + _minSz, size.width), b.clamp(t + _minSz, size.height),
  );

  @override
  Widget build(BuildContext context) => SizedBox(
    width: size.width, height: size.height,
    child: Stack(clipBehavior: Clip.none, children: [
      CustomPaint(size: size, painter: _EditBoxPainter(rect, color)),
      Positioned(
        left: rect.left + _hs / 2, top: rect.top + _hs / 2,
        child: GestureDetector(
          onPanUpdate: (d) {
            final nr = rect.translate(d.delta.dx, d.delta.dy);
            onRectChanged(Rect.fromLTWH(
              nr.left.clamp(0.0, size.width  - rect.width),
              nr.top .clamp(0.0, size.height - rect.height),
              rect.width, rect.height,
            ));
          },
          child: Container(
            width:  (rect.width  - _hs).clamp(0.0, double.infinity),
            height: (rect.height - _hs).clamp(0.0, double.infinity),
            color:  Colors.transparent,
          ),
        ),
      ),
      _corner(rect.topLeft,
          (d) => onRectChanged(_clamp(rect.left+d.dx, rect.top+d.dy,
              rect.right, rect.bottom))),
      _corner(rect.topRight,
          (d) => onRectChanged(_clamp(rect.left, rect.top+d.dy,
              rect.right+d.dx, rect.bottom))),
      _corner(rect.bottomLeft,
          (d) => onRectChanged(_clamp(rect.left+d.dx, rect.top,
              rect.right, rect.bottom+d.dy))),
      _corner(rect.bottomRight,
          (d) => onRectChanged(_clamp(rect.left, rect.top,
              rect.right+d.dx, rect.bottom+d.dy))),
      Positioned(
        left: rect.left,
        top:  (rect.top - 32).clamp(0.0, size.height),
        child: Row(children: [
          _btn('Done',   color,           onDone),
          const SizedBox(width: 6),
          _btn('Cancel', Colors.grey[700]!, onCancel),
        ]),
      ),
    ]),
  );

  Widget _corner(Offset pos, void Function(Offset) drag) => Positioned(
    left: pos.dx - _hs/2, top: pos.dy - _hs/2,
    child: GestureDetector(
      onPanUpdate: (d) => drag(d.delta),
      child: Container(
        width: _hs, height: _hs,
        alignment: Alignment.center, color: Colors.transparent,
        child: Container(
          width: 12, height: 12,
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: color, width: 2),
            borderRadius: BorderRadius.circular(2),
          ),
        ),
      ),
    ),
  );

  Widget _btn(String label, Color bg, VoidCallback onTap) =>
    GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
            color: bg, borderRadius: BorderRadius.circular(4)),
        child: Text(label, style: const TextStyle(
            color: Colors.white, fontSize: 11,
            fontWeight: FontWeight.bold)),
      ),
    );
}

class _EditBoxPainter extends CustomPainter {
  final Rect rect; final Color color;
  _EditBoxPainter(this.rect, this.color);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(rect, Paint()..color = color.withOpacity(0.08));
    final p = Paint()
      ..color = color.withOpacity(0.9)
      ..style = PaintingStyle.stroke..strokeWidth = 2.0;
    for (final pair in [
      [rect.topLeft,    rect.topRight],
      [rect.topRight,   rect.bottomRight],
      [rect.bottomRight, rect.bottomLeft],
      [rect.bottomLeft, rect.topLeft],
    ]) { _dash(canvas, pair[0] as Offset, pair[1] as Offset, p); }
  }

  void _dash(Canvas c, Offset a, Offset b, Paint p) {
    const d = 7.0; const g = 4.0;
    final len = (b-a).distance; final dir = (b-a)/len;
    double pos = 0; bool on = true;
    while (pos < len) {
      final seg = (on ? d : g).clamp(0.0, len-pos);
      if (on) c.drawLine(a+dir*pos, a+dir*(pos+seg), p);
      pos += seg; on = !on;
    }
  }

  @override
  bool shouldRepaint(_EditBoxPainter o) =>
      o.rect != rect || o.color != color;
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

  void _draw(Canvas canvas, List<_DrawnBox> boxes,
      {required bool dashed}) {
    for (final box in boxes) {
      final cls = _activeClasses.firstWhere(
          (c) => c.index == box.classIndex,
          orElse: () => _activeClasses[0]);
      final paint = Paint()
        ..color = dashed ? cls.color.withOpacity(0.6) : cls.color
        ..style = PaintingStyle.stroke..strokeWidth = 2.5;
      dashed ? _dashedRect(canvas, box.rect, paint)
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

  void _dashedRect(Canvas c, Rect r, Paint p) {
    for (final pair in [
      [r.topLeft, r.topRight], [r.topRight, r.bottomRight],
      [r.bottomRight, r.bottomLeft], [r.bottomLeft, r.topLeft],
    ]) { _dashLine(c, pair[0] as Offset, pair[1] as Offset, p); }
  }

  void _dashLine(Canvas c, Offset a, Offset b, Paint p) {
    const d = 6.0; const g = 4.0;
    final len = (b-a).distance; final dir = (b-a)/len;
    double pos = 0; bool on = true;
    while (pos < len) {
      final seg = (on ? d : g).clamp(0.0, len-pos);
      if (on) c.drawLine(a+dir*pos, a+dir*(pos+seg), p);
      pos += seg; on = !on;
    }
  }

  @override
  bool shouldRepaint(_DrawnBoxPainter o) =>
      o.saved != saved || o.pending != pending;
}

class _PreviewPainter extends CustomPainter {
  final Offset start, end;
  _PreviewPainter(this.start, this.end);
  @override
  void paint(Canvas canvas, Size size) => canvas.drawRect(
    Rect.fromPoints(start, end),
    Paint()..color = Colors.yellowAccent
           ..style = PaintingStyle.stroke..strokeWidth = 2,
  );
  @override
  bool shouldRepaint(_PreviewPainter o) =>
      o.start != start || o.end != end;
}