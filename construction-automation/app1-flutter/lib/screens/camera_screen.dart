import 'dart:io';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:image/image.dart' as img;
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import '../services/detector_service.dart';
import '../services/severity_service.dart';
import '../config/app_config.dart';
import 'result_screen.dart';
import 'feedback_history_screen.dart';

class CameraScreen extends StatefulWidget {
  const CameraScreen({super.key});
  @override State<CameraScreen> createState() => _State();
}

class _State extends State<CameraScreen> {
  CameraController? _ctrl;
  bool _processing = false;
  String _status = 'Initialising model...';
  double _threshold = AppConfig.confThreshold; // adjustable for testing
  FlashMode _flashMode = FlashMode.off;
  final _detector = DetectorService();
  final _severity = SeverityService();
  final _picker   = ImagePicker();

  @override
  void initState() {
    super.initState();
    _initAll();
  }

  Future<void> _initAll() async {
    await _detector.initialise();
    if (_detector.isReady) {
      setState(() => _status = 'Ready');
    } else {
      setState(() => _status = 'Model error: ${_detector.initError}');
      return;
    }
    await _initCamera();
  }

  Future<void> _initCamera() async {
    if (!await Permission.camera.request().isGranted) {
      setState(() => _status = 'Camera permission denied');
      return;
    }
    final cams = await availableCameras();
    if (cams.isEmpty) return;
    _ctrl = CameraController(cams[0], ResolutionPreset.high, enableAudio: false);
    await _ctrl!.initialize();
    if (mounted) setState(() {});
  }

  Future<void> _processImage(File file) async {
    setState(() { _processing = true; _status = 'Running detection...'; });
    try {
      final bytes = await file.readAsBytes();
      final image = img.decodeImage(bytes);
      if (image == null) { setState(() => _status = 'Decode failed'); return; }

      final dets = await _detector.detect(image, threshold: _threshold);

      setState(() => _status =
          dets.isEmpty ? 'No detections at conf ≥ ${_threshold.toStringAsFixed(2)}'
                       : 'Found ${dets.length} defect(s) — assessing severity...');

      if (dets.isNotEmpty) {
        await Future.wait(dets.map((d) async {
          d.severity = await _severity.assessSeverity(
              originalImage: image, detection: d);
        }));
      }

      if (mounted) await Navigator.push(context, MaterialPageRoute(
        builder: (_) => ResultScreen(
            image: image, detections: dets, imageFile: file,
            threshold: _threshold)));

      setState(() => _status = 'Ready — conf threshold: ${_threshold.toStringAsFixed(2)}');
    } catch (e) {
      setState(() => _status = 'Error: $e');
    } finally {
      setState(() => _processing = false);
    }
  }

  Future<void> _capture() async {
    if (_ctrl == null || !_ctrl!.value.isInitialized || _processing) return;
    final photo = await _ctrl!.takePicture();
    await _processImage(File(photo.path));
  }

  Future<void> _pickFromGallery() async {
    if (_processing) return;
    final picked = await _picker.pickImage(source: ImageSource.gallery);
    if (picked == null) return;
    await _processImage(File(picked.path));
  }

  Future<void> _toggleFlash() async {
  if (_ctrl == null || !_ctrl!.value.isInitialized) return;
  final next = _flashMode == FlashMode.off
      ? FlashMode.torch   // continuous torch for night inspection
      : FlashMode.off;
  await _ctrl!.setFlashMode(next);
  setState(() => _flashMode = next);
}

  @override
  void dispose() { _ctrl?.dispose(); _detector.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.black,
    appBar: AppBar(
      backgroundColor: Colors.black,
      title: const Text('G2T Inspector',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      actions: [
  // History button
  IconButton(
    icon: const Icon(Icons.history, color: Colors.white70),
    onPressed: () => Navigator.push(context,
        MaterialPageRoute(
            builder: (_) => const FeedbackHistoryScreen())),
    tooltip: 'Feedback history',
  ),
  // Flash Toggle Button
  Padding(
    padding: const EdgeInsets.only(right: 12),
    child: IconButton(
      icon: Icon(
        _flashMode == FlashMode.torch ? Icons.flash_on : Icons.flash_off,
        color: _flashMode == FlashMode.torch ? Colors.yellow : Colors.white54,
      ),
      onPressed: _toggleFlash,
      tooltip: 'Toggle torch',
    ),
  ),
  // Status Icon (non-interactive)
  Padding(
    padding: const EdgeInsets.only(right: 12),
    child: Icon(
      _detector.isReady ? Icons.check_circle : Icons.error,
      color: _detector.isReady ? Colors.green : Colors.red,
    ),
  ),
],
    ),
    body: Column(children: [
      Expanded(child: _ctrl?.value.isInitialized == true
          ? CameraPreview(_ctrl!)
          : Center(child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (!_detector.isReady && _detector.initError != null)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(_detector.initError!,
                        style: const TextStyle(color: Colors.red, fontSize: 12)),
                  ),
                const CircularProgressIndicator(color: Colors.white),
              ]))),

      // Threshold control
      Container(
        color: const Color(0xFF1A1A1A),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Row(children: [
          const Text('Conf:', style: TextStyle(color: Colors.white54, fontSize: 12)),
          Expanded(
            child: Slider(
              value: _threshold,
              min: 0.10,
              max: 0.80,
              divisions: 70,
              label: _threshold.toStringAsFixed(2),
              activeColor: _thresholdColor(),
              onChanged: (v) => setState(() => _threshold = v),
            ),
          ),
          Container(
            width: 42,
            alignment: Alignment.center,
            child: Text(
              _threshold.toStringAsFixed(2),
              style: TextStyle(
                color: _thresholdColor(),
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ),
        ]),
      ),

      Container(
        color: Colors.black, padding: const EdgeInsets.all(16),
        child: Column(children: [
          Text(_status,
              style: const TextStyle(color: Colors.white70, fontSize: 13),
              textAlign: TextAlign.center),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: (_processing || !_detector.isReady)
                    ? null : _pickFromGallery,
                icon: const Icon(Icons.photo_library, color: Colors.white70),
                label: const Text('Gallery',
                    style: TextStyle(color: Colors.white70)),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(0, 52),
                  side: const BorderSide(color: Colors.white30),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: ElevatedButton.icon(
                onPressed: (_processing || !_detector.isReady) ? null : _capture,
                icon: _processing
                    ? const SizedBox(width: 18, height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.camera_alt),
                label: Text(_processing ? 'Analysing...' : 'Capture & Analyse'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(0, 52),
                  backgroundColor: const Color(0xFF1B5E20),
                ),
              ),
            ),
          ]),
        ]),
      ),
    ]),
  );

  Color _thresholdColor() {
    if (_threshold <= 0.25) return Colors.orange;
    if (_threshold <= 0.41) return Colors.green;
    return Colors.blue;
  }
}
