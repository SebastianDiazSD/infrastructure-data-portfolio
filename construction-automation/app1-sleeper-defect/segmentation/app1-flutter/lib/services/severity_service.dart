import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:image/image.dart' as img;
import '../config/app_config.dart';
import '../models/detection_result.dart';

class SeverityService {
  Future<SeverityResult?> assessSeverity({
    required img.Image originalImage,
    required DetectionResult detection,
  }) async {
    try {
      final crop = _crop(originalImage, detection.box);
      final b64  = base64Encode(img.encodeJpg(crop, quality: 85));
      return await _callClaude(b64, detection.className, detection.confidence);
    } catch (_) {
      return null;
    }
  }

  img.Image _crop(img.Image src, BoundingBox box) {
    final px = (box.width  * 0.10).round();
    final py = (box.height * 0.10).round();
    final x  = (box.x1 - px).round().clamp(0, src.width);
    final y  = (box.y1 - py).round().clamp(0, src.height);
    final w  = (box.width  + px * 2).round().clamp(1, src.width  - x);
    final h  = (box.height + py * 2).round().clamp(1, src.height - y);
    return img.copyCrop(src, x: x, y: y, width: w, height: h);
  }

  Future<SeverityResult?> _callClaude(
      String b64, String className, double conf) async {
      // Guard: fail clearly rather than sending empty key to API
    if (AppConfig.claudeApiKey.isEmpty) {
        print('SeverityService: CLAUDE_API_KEY not set — skipping severity assessment');
        return SeverityResult(
                schadenklasse: 'N/A',
                      fehlerstufe: 'N/A',
                            description: 'API key not configured',
                                  trafficLight: 'amber',
                                      );
                                        }
    final body = {
      'model': AppConfig.claudeModel,
      'max_tokens': 512,
      'messages': [{
        'role': 'user',
        'content': [
          {'type': 'image',
           'source': {'type': 'base64',
                      'media_type': 'image/jpeg', 'data': b64}},
          {'type': 'text', 'text': _prompt(className, conf)},
        ],
      }],
    };
    final resp = await http.post(
      Uri.parse(AppConfig.anthropicApiUrl),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AppConfig.claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 15));

    if (resp.statusCode != 200) return null;
    final text = (jsonDecode(resp.body)['content'][0]['text'] as String)
        .replaceAll('```json', '').replaceAll('```', '').trim();
    return SeverityResult.fromJson(jsonDecode(text));
  }

  String _prompt(String className, double conf) => '''
You are a railway infrastructure inspection assistant trained on Deutsche Bahn standards (DB Schadenskatalog 2002, Ril. 821.2018, DBS 918 143).

The image shows a cropped region of a B70 prestressed concrete sleeper.
Detected defect: $className (confidence: ${(conf * 100).toStringAsFixed(1)}%)

Respond ONLY with valid JSON, no preamble, no markdown:
{"schadenklasse":"1|2|3|4","fehlerstufe":"1|2|3|N/A","description":"one sentence","traffic_light":"red|amber|green"}

Schadenklasse: 1=stark geschädigt (immediate), 2=geschädigt (plan), 3=gering geschädigt (monitor), 4=optische Mängel (none)
Traffic light: red=SK1, amber=SK2-3, green=SK4
''';
}
