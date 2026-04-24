import 'dart:io';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';
import 'package:archive/archive_io.dart';
import '../models/feedback_entry.dart';

class FeedbackService {
  static final FeedbackService _instance = FeedbackService._();
  factory FeedbackService() => _instance;
  FeedbackService._();

  Database? _db;

  Future<void> init() async {
    if (_db != null) return;
    final dir = await getDatabasesPath();
    _db = await openDatabase(
      p.join(dir, 'feedback.db'),
      version: 1,
      onCreate: (db, _) => db.execute('''
        CREATE TABLE feedback (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          image_path   TEXT    NOT NULL,
          class_index  INTEGER NOT NULL,
          class_name   TEXT    NOT NULL,
          x1 REAL, y1 REAL, x2 REAL, y2 REAL,
          image_width  INTEGER NOT NULL,
          image_height INTEGER NOT NULL,
          user_added   INTEGER NOT NULL DEFAULT 0,
          timestamp    TEXT    NOT NULL
        )
      '''),
    );
  }

  Future<void> saveEntry(FeedbackEntry entry) async {
    await init();
    await _db!.insert('feedback', entry.toMap());
  }

  Future<List<FeedbackEntry>> getAll() async {
    await init();
    final rows = await _db!.query('feedback', orderBy: 'timestamp DESC');
    return rows.map(FeedbackEntry.fromMap).toList();
  }

  Future<int> getCount() async {
    await init();
    final result = await _db!.rawQuery('SELECT COUNT(*) as c FROM feedback');
    return Sqflite.firstIntValue(result) ?? 0;
  }

  Future<void> delete(int id) async {
  await init();
  await _db!.delete('feedback', where: 'id = ?', whereArgs: [id]);
  }

  /// Export all entries as a Kaggle-ready ZIP:
  ///   feedback_export/
  ///     images/  ← copies of the original images (EXIF already stripped)
  ///     labels/  ← YOLO .txt files, one per image
  Future<String> exportZip() async {
    await init();
    final entries = await getAll();
    if (entries.isEmpty) throw Exception('No feedback entries to export');

    // Group entries by image path
    final byImage = <String, List<FeedbackEntry>>{};
    for (final e in entries) {
      byImage.putIfAbsent(e.imagePath, () => []).add(e);
    }

    final encoder = ZipFileEncoder();
    final outDir  = await getApplicationDocumentsDirectory();
    final zipPath = p.join(outDir.path, 'g2t_feedback_${DateTime.now().millisecondsSinceEpoch}.zip');
    encoder.create(zipPath);

    for (final entry in byImage.entries) {
      final imgFile = File(entry.key);
      if (!imgFile.existsSync()) continue;

      final stem = p.basenameWithoutExtension(entry.key);
      final ext  = p.extension(entry.key);

      // Add image
      encoder.addFile(imgFile, 'images/$stem$ext');

      // Build label file
      final labels = entry.value.map((e) => e.toYoloLabel()).join('\n');
      final tmpLabel = File(p.join(outDir.path, '$stem.txt'));
      await tmpLabel.writeAsString(labels);
      encoder.addFile(tmpLabel, 'labels/$stem.txt');
      await tmpLabel.delete();
    }

    encoder.close();
    return zipPath;
  }
}