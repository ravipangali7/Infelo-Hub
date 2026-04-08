// Keep routing rules in sync with web/src/lib/notificationRoutes.ts

import 'dart:async' show unawaited;

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

import '../constants/hub_url.dart';

/// Normalizes FCM data values to strings (same shape as web notificationDataToPath).
Map<String, String> normalizePushData(Map<String, dynamic>? raw) {
  if (raw == null || raw.isEmpty) return {};
  final out = <String, String>{};
  for (final e in raw.entries) {
    final v = e.value;
    if (v == null) continue;
    out[e.key] = v.toString();
  }
  return out;
}

/// Returns a path starting with `/`.
String notificationDataToPath(Map<String, String> data) {
  final kind = (data['kind'] ?? '').trim();
  if (kind.isEmpty) return '/notifications';

  final orderId = data['order_id']?.trim();
  final submissionId = data['submission_id']?.trim();
  final campaignId = data['campaign_id']?.trim();

  final userPayment = RegExp(r'^USER_0[1-6]$');
  if (userPayment.hasMatch(kind)) return '/wallet';
  if (kind == 'USER_07' || kind == 'USER_26' || kind == 'USER_29') {
    return '/transactions';
  }

  final userKyc = RegExp(r'^USER_(08|09|10)$');
  if (userKyc.hasMatch(kind)) return '/kyc';

  final userPayout = RegExp(r'^USER_(11|12|13)$');
  if (userPayout.hasMatch(kind)) return '/payout-accounts';

  final userOrder = RegExp(r'^USER_(14|15|16|17|21|22)$');
  if (userOrder.hasMatch(kind)) {
    if (orderId != null && orderId.isNotEmpty) return '/orders/$orderId';
    return '/orders';
  }

  if (kind == 'USER_19') {
    if (submissionId != null && submissionId.isNotEmpty) {
      return '/submission/$submissionId';
    }
    if (campaignId != null && campaignId.isNotEmpty) {
      return '/campaign/$campaignId';
    }
    return '/campaigns';
  }

  final userCamp = RegExp(r'^USER_(18|20|27)$');
  if (userCamp.hasMatch(kind)) {
    if (submissionId != null && submissionId.isNotEmpty) {
      return '/submission/$submissionId';
    }
    if (campaignId != null && campaignId.isNotEmpty) {
      return '/campaign/$campaignId';
    }
    return '/campaigns';
  }

  final userAcct = RegExp(r'^USER_(23|24|25)$');
  if (userAcct.hasMatch(kind)) return '/profile';

  if (kind == 'USER_28') return '/wishlist';

  if (kind == 'ADMIN_A1') return '/system/deposits';
  if (kind == 'ADMIN_A2') return '/system/withdrawals';
  if (kind == 'ADMIN_A3') return '/system/kyc';
  if (kind == 'ADMIN_A4') return '/system/payout-accounts';
  if (kind == 'ADMIN_A5' || kind == 'ADMIN_A10' || kind == 'ADMIN_A11') {
    if (orderId != null && orderId.isNotEmpty) return '/system/sales/$orderId';
    return '/system/sales';
  }
  if (kind == 'ADMIN_A6') return '/system/submissions';
  if (kind == 'ADMIN_A7') return '/system/products';
  if (kind == 'ADMIN_A8') return '/system';
  if (kind == 'ADMIN_A9') return '/system/deposits';

  if (data['type'] == 'push_notification' &&
      (data['push_id'] ?? '').isNotEmpty) {
    return '/notifications';
  }

  return '/notifications';
}

/// Applies deep links to the hub WebView (transactional + marketing push taps).
class HubPushLinks {
  HubPushLinks._();

  static InAppWebViewController? _controller;
  static String? _pendingPath;
  static bool _handlersAttached = false;

  static void setWebController(InAppWebViewController? controller) {
    _controller = controller;
    // Pending paths are flushed from WebView onLoadStop only — the controller
    // is attached before the hub URL finishes loading.
  }

  static String hubUrlForPath(String path) {
    final origin = Uri.parse(kInfeloHubUrl).origin;
    if (!path.startsWith('/')) return '$origin/$path';
    return '$origin$path';
  }

  /// Call from [RemoteMessage.data] or local-notification payload map.
  static Future<void> handleData(Map<String, dynamic> raw) async {
    final data = normalizePushData(raw);
    final path = notificationDataToPath(data);
    await navigateToPath(path);
  }

  static Future<void> navigateToPath(String path) async {
    final url = hubUrlForPath(path);
    final c = _controller;
    if (c == null) {
      _pendingPath = path;
      debugPrint('HubPushLinks: queued path $path');
      return;
    }
    try {
      await c.loadUrl(urlRequest: URLRequest(url: WebUri(url)));
    } catch (e, st) {
      debugPrint('HubPushLinks: loadUrl failed $e\n$st');
    }
  }

  static Future<void> flushPending() async {
    final p = _pendingPath;
    if (p == null || _controller == null) return;
    _pendingPath = null;
    await navigateToPath(p);
  }

  static Future<void> attachFirebaseListeners() async {
    if (_handlersAttached) return;
    _handlersAttached = true;

    await FirebaseMessaging.instance
        .setForegroundNotificationPresentationOptions(
          alert: true,
          badge: true,
          sound: true,
        );

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage msg) {
      unawaited(handleData(msg.data));
    });

    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) {
      final data = normalizePushData(initial.data);
      _pendingPath = notificationDataToPath(data);
      debugPrint('HubPushLinks: initial message queued $_pendingPath');
    }
  }
}
