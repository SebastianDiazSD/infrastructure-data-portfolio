class AppConfig {
  static const String modelAssetPath = 'assets/models/sleeper_detector.onnx';
  static const int inputSize = 640;
  static const double confThreshold = 0.15;
  static const double confThresholdSafety = 0.35;
  static const double iouThreshold = 0.50;

  static const List<String> classNames = [
    'broken_rail',
    'corner_breakout',
    'spalling_body',
    'spalling_rail_seat',
    'surface_crack',
  ];

  static const Set<int> activeClasses = {1, 2, 3};

  static const String claudeApiKey = String.fromEnvironment('CLAUDE_API_KEY');
  static const String claudeModel = 'claude-haiku-4-5';
  static const String anthropicApiUrl =
      'https://api.anthropic.com/v1/messages';

  static const Map<int, int> classColors = {
    1: 0xFFFF6B35,
    2: 0xFFFF2222,
    3: 0xFFFFD700,
  };
}
