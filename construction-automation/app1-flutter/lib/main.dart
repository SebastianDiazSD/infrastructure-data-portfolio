import 'package:flutter/material.dart';
import 'screens/camera_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const G2TApp());
}

class G2TApp extends StatelessWidget {
  const G2TApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'G2T Inspector',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1B5E20), brightness: Brightness.dark),
      useMaterial3: true,
    ),
    home: const CameraScreen(),
  );
}
