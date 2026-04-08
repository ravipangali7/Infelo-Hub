import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'screens/app_entry.dart';
import 'services/hub_local_notifications.dart';
import 'services/hub_push_navigation.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp();
    await initHubLocalNotifications();
    await HubPushLinks.attachFirebaseListeners();
    attachForegroundFcmListener();
  } catch (e) {
    debugPrint(
      'Firebase / notifications init failed — add a real google-services.json: $e',
    );
  }
  runApp(const InfeloHubApp());
}

class InfeloHubApp extends StatelessWidget {
  const InfeloHubApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Infelo Hub',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1565C0)),
        useMaterial3: true,
      ),
      home: const AppEntry(),
    );
  }
}
