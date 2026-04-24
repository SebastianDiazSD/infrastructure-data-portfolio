import 'dart:io';
import 'package:flutter/material.dart';
import '../models/feedback_entry.dart';
import '../services/feedback_service.dart';

class FeedbackHistoryScreen extends StatefulWidget {
  const FeedbackHistoryScreen({super.key});
  @override
  State<FeedbackHistoryScreen> createState() => _FeedbackHistoryScreenState();
}

class _FeedbackHistoryScreenState extends State<FeedbackHistoryScreen> {
  final _feedback = FeedbackService();
  List<FeedbackEntry> _entries = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final entries = await _feedback.getAll();
    if (mounted) setState(() { _entries = entries; _loading = false; });
  }

  Future<void> _delete(FeedbackEntry entry) async {
    if (entry.id == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E1E),
        title: const Text('Delete entry?',
            style: TextStyle(color: Colors.white, fontSize: 15)),
        content: Text(
          '${entry.className.replaceAll("_", " ")} · '
          '${entry.timestamp.toLocal().toString().substring(0, 16)}',
          style: const TextStyle(color: Colors.white70, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel',
                style: TextStyle(color: Colors.white54)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete',
                style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _feedback.delete(entry.id!);
    setState(() => _entries.removeWhere((e) => e.id == entry.id));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Entry deleted'),
          duration: Duration(seconds: 2)));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.black,
    appBar: AppBar(
      backgroundColor: Colors.black,
      foregroundColor: Colors.white,
      title: Text(_loading
          ? 'Feedback History'
          : 'Feedback History (${_entries.length})'),
    ),
    body: _loading
        ? const Center(child: CircularProgressIndicator(color: Colors.white))
        : _entries.isEmpty
            ? const Center(
                child: Text('No feedback saved yet.',
                    style: TextStyle(color: Colors.white54)))
            : ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 4),
                itemCount: _entries.length,
                itemBuilder: (_, i) => _EntryTile(
                  entry:    _entries[i],
                  onDelete: () => _delete(_entries[i]),
                ),
              ),
  );
}

class _EntryTile extends StatelessWidget {
  final FeedbackEntry entry;
  final VoidCallback  onDelete;
  const _EntryTile({required this.entry, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final imgFile = File(entry.imagePath);
    // nc=3 display names — matches app_config.dart
    final label  = entry.className.replaceAll('_', ' ');
    final source = entry.userAdded ? 'Manually drawn' : 'YOLO confirmed';
    final ts     = entry.timestamp.toLocal().toString().substring(0, 16);

    return Card(
      color: const Color(0xFF1E1E1E),
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      child: ListTile(
        leading: imgFile.existsSync()
            ? ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: Image.file(imgFile,
                    width: 48, height: 48, fit: BoxFit.cover),
              )
            : Container(
                width: 48, height: 48,
                color: Colors.grey[800],
                child: const Icon(Icons.image_not_supported,
                    color: Colors.white38, size: 20),
              ),
        title: Text(label.toUpperCase(),
            style: const TextStyle(color: Colors.white,
                fontWeight: FontWeight.bold, fontSize: 12)),
        subtitle: Text('$source · $ts',
            style: TextStyle(color: Colors.grey[500], fontSize: 11)),
        trailing: IconButton(
          icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
          onPressed: onDelete,
          tooltip: 'Delete entry',
        ),
      ),
    );
  }
}