import 'dart:io' show Platform;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../constants/api_config.dart';
import '../constants/app_version.dart';
import 'app_update_screen.dart';
import 'infelo_hub_web_screen.dart';

/// Loads [app_current_version] from the API on Android before showing the hub.
/// iOS and other platforms skip this (no APK sideload path).
class AppEntry extends StatefulWidget {
  const AppEntry({super.key});

  @override
  State<AppEntry> createState() => _AppEntryState();
}

class _AppEntryState extends State<AppEntry> {
  late final Future<_GateResult> _gate;

  @override
  void initState() {
    super.initState();
    _gate = _runGate();
  }

  Future<_GateResult> _runGate() async {
    if (!Platform.isAndroid) {
      return const _GateOk();
    }

    var base = kApiBaseUrl.trim();
    while (base.endsWith('/')) {
      base = base.substring(0, base.length - 1);
    }
    final url = '$base/app-version/';

    try {
      final res = await Dio(
        BaseOptions(
          connectTimeout: const Duration(seconds: 20),
          receiveTimeout: const Duration(seconds: 20),
        ),
      ).get<Map<String, dynamic>>(url);

      final data = res.data;
      if (data == null) {
        return const _GateError('Invalid response from server.');
      }

      final serverRaw = data['app_current_version'];
      final server =
          (serverRaw is String ? serverRaw : serverRaw?.toString() ?? '')
              .trim();
      final serverNorm = server.isEmpty ? '1' : server;

      final apkRaw = data['android_file_url'];
      final apkUrl = apkRaw is String ? apkRaw.trim() : null;
      final apk = apkUrl != null && apkUrl.isNotEmpty ? apkUrl : null;

      if (serverNorm != app_version.trim()) {
        return _GateUpdate(requiredVersion: serverNorm, apkUrl: apk);
      }
      return const _GateOk();
    } on DioException catch (e) {
      final msg = e.message ?? e.toString();
      return _GateError('Could not reach the server.\n$msg');
    } catch (e) {
      return _GateError(e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!Platform.isAndroid) {
      return const InfeloHubWebScreen();
    }

    return FutureBuilder<_GateResult>(
      future: _gate,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Scaffold(
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Checking for updates…'),
                ],
              ),
            ),
          );
        }

        final result = snapshot.data;
        if (result is _GateOk) {
          return const InfeloHubWebScreen();
        }
        if (result is _GateUpdate) {
          return AppUpdateScreen(
            requiredVersion: result.requiredVersion,
            apkUrl: result.apkUrl,
          );
        }
        if (result is _GateError) {
          return Scaffold(
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Spacer(),
                    Text(
                      result.message,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const Spacer(),
                    FilledButton(
                      onPressed: () => setState(() => _gate = _runGate()),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        return const InfeloHubWebScreen();
      },
    );
  }
}

sealed class _GateResult {
  const _GateResult();
}

class _GateOk extends _GateResult {
  const _GateOk();
}

class _GateUpdate extends _GateResult {
  const _GateUpdate({required this.requiredVersion, this.apkUrl});

  final String requiredVersion;
  final String? apkUrl;
}

class _GateError extends _GateResult {
  const _GateError(this.message);

  final String message;
}
