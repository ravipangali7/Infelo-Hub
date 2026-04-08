import 'dart:io' show File, Platform;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

import '../constants/app_version.dart';

/// Infelo Hub brand (logo palette).
const Color _kBrandOrange = Color(0xFFF99D1C);
const Color _kBrandNavy = Color(0xFF002D62);
const Color _kNearBlack = Color(0xFF000000);
const String _kLogoAsset = 'assets/images/infelo_hub_logo.png';

class AppUpdateScreen extends StatefulWidget {
  const AppUpdateScreen({
    super.key,
    required this.requiredVersion,
    required this.apkUrl,
  });

  final String requiredVersion;
  final String? apkUrl;

  @override
  State<AppUpdateScreen> createState() => _AppUpdateScreenState();
}

class _AppUpdateScreenState extends State<AppUpdateScreen>
    with TickerProviderStateMixin {
  double _downloadProgress = 0;
  bool _downloading = false;
  String? _error;

  late final AnimationController _pulseController;
  late final Animation<double> _pulseScale;
  late final AnimationController _ringPulseController;
  late final Animation<double> _ringPulseOpacity;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat(reverse: true);
    _pulseScale = Tween<double>(begin: 0.98, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _ringPulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    _ringPulseOpacity = Tween<double>(begin: 0.35, end: 0.9).animate(
      CurvedAnimation(parent: _ringPulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _ringPulseController.dispose();
    super.dispose();
  }

  Future<void> _downloadAndInstall() async {
    final url = widget.apkUrl?.trim();
    if (url == null || url.isEmpty) {
      setState(() => _error = 'No APK is configured on the server yet.');
      return;
    }

    setState(() {
      _error = null;
      _downloading = true;
      _downloadProgress = 0;
    });
    _ringPulseController.repeat(reverse: true);

    try {
      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/infelo_hub_update.apk';
      final file = File(path);
      if (await file.exists()) {
        await file.delete();
      }

      await Dio().download(
        url,
        path,
        onReceiveProgress: (received, total) {
          if (!mounted) return;
          if (total <= 0) {
            setState(() => _downloadProgress = 0);
            return;
          }
          setState(() => _downloadProgress = received / total);
        },
      );

      if (!mounted) return;
      _ringPulseController.stop();
      _ringPulseController.reset();
      setState(() {
        _downloading = false;
        _downloadProgress = 1;
      });

      final result = await OpenFilex.open(
        path,
        type: 'application/vnd.android.package-archive',
      );
      if (!mounted) return;
      if (result.type != ResultType.done) {
        setState(
          () => _error = result.message.isNotEmpty
              ? result.message
              : 'Could not open the installer.',
        );
      }
    } catch (e) {
      if (!mounted) return;
      _ringPulseController.stop();
      _ringPulseController.reset();
      setState(() {
        _downloading = false;
        _error = e.toString();
      });
    }
  }

  Widget _versionChip(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: _kBrandNavy.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _kBrandNavy.withValues(alpha: 0.9),
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.65),
              fontSize: 11,
              letterSpacing: 0.6,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'v$value',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroLogo(double displayProgress, {required bool showRing}) {
    const double ringSize = 228;
    const double logoWidth = 168;

    return SizedBox(
      width: ringSize,
      height: ringSize,
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (showRing)
            AnimatedBuilder(
              animation: _ringPulseOpacity,
              builder: (context, child) {
                return SizedBox(
                  width: ringSize,
                  height: ringSize,
                  child: CircularProgressIndicator(
                    value: displayProgress > 0 && displayProgress < 1
                        ? displayProgress
                        : null,
                    strokeWidth: 4,
                    strokeCap: StrokeCap.round,
                    backgroundColor: Colors.white.withValues(alpha: 0.12),
                    color: _kBrandOrange.withValues(
                      alpha: _ringPulseOpacity.value,
                    ),
                  ),
                );
              },
            )
          else
            SizedBox(
              width: ringSize,
              height: ringSize,
              child: CircularProgressIndicator(
                value: null,
                strokeWidth: 2,
                strokeCap: StrokeCap.round,
                backgroundColor: Colors.white.withValues(alpha: 0.06),
                color: _kBrandOrange.withValues(alpha: 0.35),
              ),
            ),
          ScaleTransition(
            scale: _pulseScale,
            child: Container(
              decoration: BoxDecoration(
                boxShadow: [
                  BoxShadow(
                    color: _kBrandOrange.withValues(alpha: 0.22),
                    blurRadius: 28,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Image.asset(
                _kLogoAsset,
                width: logoWidth,
                fit: BoxFit.contain,
                filterQuality: FilterQuality.high,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasApk = widget.apkUrl != null && widget.apkUrl!.trim().isNotEmpty;

    final brandedTheme = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.dark(
        primary: _kBrandOrange,
        onPrimary: _kNearBlack,
        surface: _kBrandNavy.withValues(alpha: 0.4),
        onSurface: Colors.white,
        error: const Color(0xFFFF6B6B),
        onError: Colors.white,
      ),
    );

    return Theme(
      data: brandedTheme,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        extendBody: true,
        body: Container(
          width: double.infinity,
          height: double.infinity,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xFF001428), _kNearBlack, Color(0xFF050810)],
              stops: [0.0, 0.45, 1.0],
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 8),
                  Text(
                    'New version available',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: _kBrandOrange,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.4,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Update Infelo Hub to continue.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.72),
                      fontSize: 15,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 28),
                  Center(
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: _downloadProgress),
                      duration: const Duration(milliseconds: 180),
                      builder: (context, animProgress, _) {
                        return _buildHeroLogo(
                          _downloading ? animProgress : 0,
                          showRing: _downloading,
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 28),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _versionChip("You're on", app_version),
                      const SizedBox(width: 12),
                      _versionChip('Required', widget.requiredVersion),
                    ],
                  ),
                  if (!hasApk) ...[
                    const SizedBox(height: 20),
                    _InlineBanner(
                      message:
                          'APK not configured on the server. Contact support.',
                      isError: true,
                    ),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    _InlineBanner(message: _error!, isError: true),
                  ],
                  const Spacer(),
                  if (_downloading) ...[
                    TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: _downloadProgress),
                      duration: const Duration(milliseconds: 200),
                      builder: (context, value, child) {
                        final pct = (value * 100)
                            .clamp(0, 100)
                            .toStringAsFixed(0);
                        final label = value >= 1
                            ? 'Opening installer…'
                            : 'Downloading… $pct%';
                        return Column(
                          children: [
                            Text(
                              label,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: _kBrandOrange,
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
                                letterSpacing: 0.2,
                              ),
                            ),
                            const SizedBox(height: 10),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: LinearProgressIndicator(
                                value: value > 0 && value < 1 ? value : null,
                                minHeight: 6,
                                backgroundColor: Colors.white.withValues(
                                  alpha: 0.12,
                                ),
                                color: _kBrandOrange,
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 20),
                  ],
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: _kBrandOrange,
                      foregroundColor: _kNearBlack,
                      disabledBackgroundColor: Colors.white.withValues(
                        alpha: 0.2,
                      ),
                      disabledForegroundColor: Colors.white54,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: _downloading || !hasApk ? 0 : 4,
                      shadowColor: _kBrandOrange.withValues(alpha: 0.45),
                    ),
                    onPressed: (_downloading || !hasApk)
                        ? null
                        : _downloadAndInstall,
                    icon: Icon(
                      _downloading
                          ? Icons.downloading_rounded
                          : Icons.bolt_rounded,
                      size: 22,
                    ),
                    label: Text(
                      _downloading ? 'Downloading…' : 'Update now',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.4,
                      ),
                    ),
                  ),
                  if (Platform.isAndroid) ...[
                    const SizedBox(height: 12),
                    Text(
                      'Android will ask you to confirm the install.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.5),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _InlineBanner extends StatelessWidget {
  const _InlineBanner({required this.message, required this.isError});

  final String message;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _kBrandNavy.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isError
              ? _kBrandOrange.withValues(alpha: 0.85)
              : Colors.white24,
          width: 1.5,
        ),
      ),
      child: Text(
        message,
        textAlign: TextAlign.center,
        style: TextStyle(
          color: Colors.white.withValues(alpha: 0.92),
          fontSize: 13,
          height: 1.35,
        ),
      ),
    );
  }
}
