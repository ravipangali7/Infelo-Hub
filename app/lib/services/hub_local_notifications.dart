import 'dart:async' show unawaited;
import 'dart:convert';
import 'dart:io' show Platform;

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'hub_push_navigation.dart';

const String _androidChannelId = 'infelo_hub_high';
const String _androidChannelName = 'Infelo Hub alerts';
final FlutterLocalNotificationsPlugin _plugin =
    FlutterLocalNotificationsPlugin();

bool _initialized = false;
bool _onMessageAttached = false;

/// Foreground FCM: show a system notification; tap uses same deep link as background.
Future<void> initHubLocalNotifications() async {
  if (_initialized) return;
  _initialized = true;

  const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
  const darwinInit = DarwinInitializationSettings();
  const initSettings = InitializationSettings(
    android: androidInit,
    iOS: darwinInit,
    macOS: darwinInit,
  );

  await _plugin.initialize(
    initSettings,
    onDidReceiveNotificationResponse: (NotificationResponse response) {
      final p = response.payload;
      if (p == null || p.isEmpty) return;
      try {
        final map = jsonDecode(p) as Map<String, dynamic>;
        unawaited(HubPushLinks.handleData(map));
      } catch (e, st) {
        debugPrint('hub_local_notifications: bad payload $e\n$st');
      }
    },
  );

  if (Platform.isAndroid) {
    final android = _plugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    await android?.createNotificationChannel(
      const AndroidNotificationChannel(
        _androidChannelId,
        _androidChannelName,
        description: 'Order, wallet, and admin alerts',
        importance: Importance.high,
      ),
    );
    await android?.requestNotificationsPermission();
  }

  if (Platform.isIOS) {
    await _plugin
        .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin
        >()
        ?.requestPermissions(alert: true, badge: true, sound: true);
  }
}

void attachForegroundFcmListener() {
  if (_onMessageAttached) return;
  _onMessageAttached = true;

  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    unawaited(showNotificationFromRemoteMessage(message));
  });
}

Future<void> showNotificationFromRemoteMessage(RemoteMessage message) async {
  final notification = message.notification;
  final title = notification?.title;
  final body = notification?.body;
  if (title == null && body == null) {
    // Data-only message: still show a minimal banner so user can open the app to the right screen.
    final kind = message.data['kind']?.toString();
    if (kind == null || kind.isEmpty) return;
  }

  final payload = jsonEncode(message.data);
  final androidDetails = AndroidNotificationDetails(
    _androidChannelId,
    _androidChannelName,
    channelDescription: 'Foreground push mirror',
    importance: Importance.high,
    priority: Priority.high,
    icon: '@mipmap/ic_launcher',
  );
  const darwinDetails = DarwinNotificationDetails();
  final details = NotificationDetails(
    android: androidDetails,
    iOS: darwinDetails,
    macOS: darwinDetails,
  );

  final nid = DateTime.now().millisecondsSinceEpoch.remainder(0x7fffffff);
  await _plugin.show(
    nid,
    title ?? 'Infelo Hub',
    body ?? message.data['kind']?.toString() ?? 'New update',
    details,
    payload: payload,
  );
}
