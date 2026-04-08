import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants/api_config.dart';

const _kPrefsFcm = 'hub_last_registered_fcm';
const _kPrefsSession = 'hub_last_registered_session_suffix';

String _apiRoot() {
  var base = kApiBaseUrl.trim();
  while (base.endsWith('/')) {
    base = base.substring(0, base.length - 1);
  }
  return base;
}

Map<String, dynamic>? _parseLocalAuthResult(dynamic raw) {
  if (raw == null) return null;
  if (raw is Map) {
    return Map<String, dynamic>.from(raw);
  }
  final s = raw is String ? raw.trim() : raw.toString().trim();
  if (s.isEmpty || s == 'null') return null;
  try {
    return jsonDecode(s) as Map<String, dynamic>;
  } catch (_) {
    return null;
  }
}

/// Reads WebView [localStorage] auth, then registers FCM with the API when logged in.
Future<void> tryRegisterFcmFromWebView(
  InAppWebViewController controller,
) async {
  try {
    final raw = await controller.evaluateJavascript(
      source: r'''
(function(){
  try {
    var t = localStorage.getItem('infelo_token');
    var u = localStorage.getItem('infelo_user');
    var phone = '';
    if (u) { try { phone = (JSON.parse(u).phone || '').toString(); } catch(e) {} }
    return JSON.stringify({ token: (t || '').toString(), phone: phone });
  } catch(e) {
    return JSON.stringify({ token: '', phone: '' });
  }
})()
''',
    );

    final map = _parseLocalAuthResult(raw);
    if (map == null) return;

    final apiToken = (map['token'] as String? ?? '').trim();
    final phone = (map['phone'] as String? ?? '').trim();
    if (apiToken.isEmpty) return;

    await FirebaseMessaging.instance.requestPermission();

    final fcm = await FirebaseMessaging.instance.getToken();
    if (fcm == null || fcm.isEmpty) return;

    final prefs = await SharedPreferences.getInstance();
    final sessionKey = apiToken.length > 12
        ? apiToken.substring(apiToken.length - 12)
        : apiToken;
    final lastFcm = prefs.getString(_kPrefsFcm);
    final lastSess = prefs.getString(_kPrefsSession);
    if (lastFcm == fcm && lastSess == sessionKey) return;

    final url = '${_apiRoot()}/client/fcm-token/';
    final body = <String, dynamic>{'fcm_token': fcm};
    if (phone.isNotEmpty) body['phone'] = phone;

    await Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 20),
        headers: {
          'Authorization': 'Token $apiToken',
          'Content-Type': 'application/json',
        },
      ),
    ).post<void>(url, data: body);

    await prefs.setString(_kPrefsFcm, fcm);
    await prefs.setString(_kPrefsSession, sessionKey);
  } catch (e) {
    debugPrint('hub_fcm_register: $e');
  }
}
