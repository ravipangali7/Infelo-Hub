import 'dart:async';
import 'dart:collection' show UnmodifiableListView;
import 'dart:convert' show base64Decode;
import 'dart:io' show Directory, File, HttpHeaders, Platform;

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../constants/hub_url.dart';
import '../services/hub_fcm_register.dart';
import '../services/hub_push_navigation.dart';

/// Keeps a [Blob] reference by object URL so Android WebView can still read it after revoke / without fetch/XHR.
const String _kBlobUrlHookScript = '''
(function() {
  if (window.__infeloHubBlobHooked) return;
  window.__infeloHubBlobHooked = true;
  window.__infeloHubBlobCache = Object.create(null);
  var origCreate = URL.createObjectURL.bind(URL);
  var origRevoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = function(blob) {
    var url = origCreate(blob);
    try { window.__infeloHubBlobCache[url] = blob; } catch (e) {}
    return url;
  };
  URL.revokeObjectURL = function(url) {
    origRevoke(url);
  };
})();
''';

/// Lets the hub SPA hide in-WebView-only UI (e.g. Android download promo). Must match web check for `__infeloHubFlutterClient`.
const String _kFlutterClientFlagScript = '''
(function() {
  try { window.__infeloHubFlutterClient = true; } catch (e) {}
})();
''';

bool _isWhatsAppLaunchUri(Uri uri) {
  final host = uri.host.toLowerCase();
  if (host == 'wa.me' || host == 'www.wa.me') return true;
  if (host == 'api.whatsapp.com' || host == 'www.api.whatsapp.com') {
    return true;
  }
  if (host == 'web.whatsapp.com' || host == 'www.web.whatsapp.com') {
    return true;
  }
  if (uri.scheme == 'whatsapp') return true;
  return false;
}

Future<void> _openWhatsAppExternally(Uri uri) async {
  const mode = LaunchMode.externalApplication;
  if (await canLaunchUrl(uri)) {
    await launchUrl(uri, mode: mode);
    return;
  }
  final host = uri.host.toLowerCase();
  if (host == 'wa.me' || host == 'www.wa.me') {
    var path = uri.path;
    while (path.startsWith('/')) {
      path = path.substring(1);
    }
    final digits = path.split('').where((ch) {
      final u = ch.codeUnitAt(0);
      return u >= 0x30 && u <= 0x39;
    }).join();
    if (digits.isNotEmpty) {
      final direct = Uri.parse('whatsapp://send?phone=$digits');
      if (await canLaunchUrl(direct)) {
        await launchUrl(direct, mode: mode);
      }
    }
  }
}

class InfeloHubWebScreen extends StatefulWidget {
  const InfeloHubWebScreen({super.key});

  @override
  State<InfeloHubWebScreen> createState() => _InfeloHubWebScreenState();
}

class _InfeloHubWebScreenState extends State<InfeloHubWebScreen>
    with WidgetsBindingObserver {
  InAppWebViewController? _webController;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  late final PullToRefreshController _pullToRefreshController;

  AppLifecycleState? _lastLifecycleState;
  int _scrollY = 0;
  bool _pullColorsApplied = false;

  bool _isOffline = false;
  bool _isLoading = true;
  int _loadProgress = 0;

  @override
  void initState() {
    super.initState();
    _pullToRefreshController = PullToRefreshController(
      settings: PullToRefreshSettings(enabled: true),
      onRefresh: () async {
        try {
          await _hardReload(_webController);
        } finally {
          if (mounted) {
            await _pullToRefreshController.endRefreshing();
          }
        }
      },
    );
    WidgetsBinding.instance.addObserver(this);
    _initConnectivity();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_pullColorsApplied) return;
    _pullColorsApplied = true;
    final scheme = Theme.of(context).colorScheme;
    unawaited(_pullToRefreshController.setColor(scheme.primary));
    unawaited(_pullToRefreshController.setBackgroundColor(scheme.surface));
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (_lastLifecycleState == AppLifecycleState.paused &&
        state == AppLifecycleState.resumed) {
      final c = _webController;
      if (c != null && !_isOffline) {
        unawaited(_hardReload(c));
      }
    }
    _lastLifecycleState = state;
  }

  /// Clears WebView cache then reloads. Use [bootstrap] on first load from `about:blank`.
  Future<void> _hardReload(
    InAppWebViewController? controller, {
    bool bootstrap = false,
  }) async {
    final c = controller ?? _webController;
    if (c == null) return;

    await InAppWebViewController.clearAllCache(includeDiskFiles: true);

    if (bootstrap) {
      await c.loadUrl(urlRequest: URLRequest(url: WebUri(kInfeloHubUrl)));
      return;
    }

    if (Platform.isIOS) {
      await c.reloadFromOrigin();
    } else {
      await c.reload();
    }
  }

  Future<void> _syncPullToRefreshEnabled() async {
    if (_isOffline) {
      await _pullToRefreshController.setEnabled(false);
      return;
    }
    await _pullToRefreshController.setEnabled(_scrollY <= 0);
  }

  Future<void> _initConnectivity() async {
    final initial = await Connectivity().checkConnectivity();
    _applyConnectivity(initial);
    _connectivitySub = Connectivity().onConnectivityChanged.listen(
      _applyConnectivity,
    );
  }

  void _applyConnectivity(List<ConnectivityResult> results) {
    final offline = results.contains(ConnectivityResult.none);
    if (!mounted) return;
    setState(() => _isOffline = offline);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) unawaited(_syncPullToRefreshEnabled());
    });
  }

  Future<void> _onRetryPressed() async {
    final results = await Connectivity().checkConnectivity();
    if (!mounted) return;
    if (results.contains(ConnectivityResult.none)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Still offline. Check your connection.')),
      );
      return;
    }
    setState(() => _isOffline = false);
    await _hardReload(_webController);
    if (mounted) unawaited(_syncPullToRefreshEnabled());
  }

  Future<void> _onPopInvoked(bool didPop, Object? result) async {
    if (didPop) return;

    final controller = _webController;
    if (controller != null && await controller.canGoBack()) {
      await controller.goBack();
      return;
    }

    if (!mounted) return;
    final shouldExit = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Exit Infelo Hub?'),
        content: const Text('Do you want to close the app?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Exit'),
          ),
        ],
      ),
    );

    if (shouldExit == true && mounted) {
      SystemNavigator.pop();
    }
  }

  /// System / user-visible Downloads when the platform exposes it; otherwise app storage.
  Future<Directory> _resolveDownloadDirectory() async {
    Directory? dir;

    try {
      dir = await getDownloadsDirectory();
    } catch (_) {
      dir = null;
    }

    if (dir != null) {
      try {
        if (!await dir.exists()) {
          await dir.create(recursive: true);
        }
        return dir;
      } catch (_) {
        dir = null;
      }
    }

    if (Platform.isAndroid) {
      try {
        final list = await getExternalStorageDirectories(
          type: StorageDirectory.downloads,
        );
        if (list != null && list.isNotEmpty) {
          dir = list.first;
          if (!await dir.exists()) {
            await dir.create(recursive: true);
          }
          return dir;
        }
      } catch (_) {}
    }

    final docs = await getApplicationDocumentsDirectory();
    final fallback = Directory('${docs.path}/downloads');
    if (!await fallback.exists()) {
      await fallback.create(recursive: true);
    }
    return fallback;
  }

  Future<void> _onDownloadStart(
    InAppWebViewController controller,
    DownloadStartRequest request,
  ) async {
    final uri = request.url;
    final messenger = ScaffoldMessenger.maybeOf(context);

    var name = request.suggestedFilename?.trim();
    if (name == null || name.isEmpty) {
      final segments = uri.pathSegments;
      name = segments.isNotEmpty ? segments.last : 'download';
    }
    name = _sanitizeFileName(name);
    if (!name.contains('.')) {
      name += _extensionForMime(request.mimeType);
    }

    try {
      final downloadsDir = await _resolveDownloadDirectory();

      var path = '${downloadsDir.path}/$name';
      path = await _uniquePath(path);

      final urlString = uri.toString();
      if (uri.scheme == 'blob' || urlString.startsWith('blob:')) {
        await _saveBlobToFile(controller, urlString, path, messenger);
        return;
      }

      final cookies = await CookieManager.instance().getCookies(
        url: uri,
        webViewController: controller,
      );
      final cookieHeader = cookies
          .map((c) => '${c.name}=${c.value}')
          .join('; ');

      final headers = <String, dynamic>{};
      if (cookieHeader.isNotEmpty) {
        headers[HttpHeaders.cookieHeader] = cookieHeader;
      }
      final ua = request.userAgent;
      if (ua != null && ua.isNotEmpty) {
        headers[HttpHeaders.userAgentHeader] = ua;
      }

      await Dio().download(urlString, path, options: Options(headers: headers));

      if (!mounted) return;
      await OpenFilex.open(path);
      if (!mounted) return;
      messenger?.showSnackBar(
        SnackBar(content: Text('Saved: ${File(path).uri.pathSegments.last}')),
      );
    } catch (e, st) {
      debugPrint('Download failed: $e\n$st');
      if (!mounted) return;
      messenger?.showSnackBar(SnackBar(content: Text('Download failed: $e')));
    }
  }

  /// [blob:] URLs only exist inside the page; fetch via JS and write bytes to [filePath].
  Future<void> _saveBlobToFile(
    InAppWebViewController controller,
    String blobUrl,
    String filePath,
    ScaffoldMessengerState? messenger,
  ) async {
    // PAGE world + blob cache: Android WebView often blocks fetch/XHR on blob: URLs.
    final result = await controller.callAsyncJavaScript(
      functionBody: '''
        async function blobToDataUrl(url) {
          var cache = window.__infeloHubBlobCache;
          var blob = cache && cache[url];
          if (!blob) {
            try {
              var response = await fetch(url);
              if (response.ok) blob = await response.blob();
            } catch (e) {}
          }
          if (!blob) {
            try {
              blob = await new Promise(function(resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.responseType = 'blob';
                xhr.onload = function() {
                  if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
                  else reject(new Error('xhr status ' + xhr.status));
                };
                xhr.onerror = function() { reject(new Error('xhr failed')); };
                xhr.send();
              });
            } catch (e) {}
          }
          if (!blob) {
            throw new Error('blob unavailable (cache miss or revoked)');
          }
          try { delete window.__infeloHubBlobCache[url]; } catch (e) {}
          return await new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onloadend = function() { resolve(reader.result); };
            reader.onerror = function() { reject(reader.error); };
            reader.readAsDataURL(blob);
          });
        }
        return await blobToDataUrl(blobUrl);
      ''',
      arguments: {'blobUrl': blobUrl},
      contentWorld: ContentWorld.PAGE,
    );

    if (result == null) {
      throw Exception('Could not read blob from page');
    }
    if (result.error != null) {
      throw Exception(result.error);
    }
    final value = result.value;
    if (value is! String) {
      throw Exception('Unexpected blob result');
    }

    final bytes = _bytesFromDataUrl(value);
    if (bytes == null) {
      throw Exception('Could not decode blob data');
    }

    await File(filePath).writeAsBytes(bytes);

    if (!mounted) return;
    await OpenFilex.open(filePath);
    if (!mounted) return;
    messenger?.showSnackBar(
      SnackBar(content: Text('Saved: ${File(filePath).uri.pathSegments.last}')),
    );
  }

  static Uint8List? _bytesFromDataUrl(String dataUrl) {
    final comma = dataUrl.indexOf(',');
    if (comma < 0 || comma >= dataUrl.length - 1) return null;
    final header = dataUrl.substring(0, comma);
    final payload = dataUrl.substring(comma + 1);
    if (!header.contains('base64')) return null;
    try {
      return Uint8List.fromList(base64Decode(payload));
    } on FormatException {
      return null;
    }
  }

  static String _sanitizeFileName(String name) {
    const bad = r'\/:*?"<>|';
    var s = name;
    for (final c in bad.split('')) {
      s = s.replaceAll(c, '_');
    }
    s = s.replaceAll(RegExp(r'\.{2,}'), '_');
    if (s.isEmpty) s = 'download';
    return s;
  }

  static String _extensionForMime(String? mime) {
    if (mime == null) return '';
    switch (mime.split(';').first.trim().toLowerCase()) {
      case 'application/pdf':
        return '.pdf';
      case 'image/png':
        return '.png';
      case 'image/jpeg':
        return '.jpg';
      case 'text/plain':
        return '.txt';
      case 'application/zip':
        return '.zip';
      default:
        return '';
    }
  }

  static Future<String> _uniquePath(String path) async {
    if (!await File(path).exists()) return path;
    final dot = path.lastIndexOf('.');
    final base = dot > 0 ? path.substring(0, dot) : path;
    final ext = dot > 0 ? path.substring(dot) : '';
    var i = 1;
    while (await File('$base ($i)$ext').exists()) {
      i++;
    }
    return '$base ($i)$ext';
  }

  @override
  void dispose() {
    HubPushLinks.setWebController(null);
    WidgetsBinding.instance.removeObserver(this);
    _pullToRefreshController.dispose();
    _connectivitySub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: _onPopInvoked,
      child: Scaffold(
        body: SafeArea(
          child: Stack(
            fit: StackFit.expand,
            children: [
              InAppWebView(
                initialUrlRequest: URLRequest(url: WebUri('about:blank')),
                initialUserScripts: UnmodifiableListView<UserScript>([
                  UserScript(
                    source: _kBlobUrlHookScript,
                    injectionTime: UserScriptInjectionTime.AT_DOCUMENT_START,
                    contentWorld: ContentWorld.PAGE,
                    forMainFrameOnly: false,
                  ),
                  UserScript(
                    source: _kFlutterClientFlagScript,
                    injectionTime: UserScriptInjectionTime.AT_DOCUMENT_START,
                    contentWorld: ContentWorld.PAGE,
                    forMainFrameOnly: false,
                  ),
                ]),
                pullToRefreshController: _pullToRefreshController,
                initialSettings: InAppWebViewSettings(
                  javaScriptEnabled: true,
                  domStorageEnabled: true,
                  databaseEnabled: true,
                  cacheEnabled: true,
                  useHybridComposition: true,
                  useWideViewPort: true,
                  loadWithOverviewMode: true,
                  supportZoom: false,
                  builtInZoomControls: false,
                  displayZoomControls: false,
                  allowsInlineMediaPlayback: true,
                  mediaPlaybackRequiresUserGesture: false,
                  allowsBackForwardNavigationGestures: true,
                  mixedContentMode:
                      MixedContentMode.MIXED_CONTENT_COMPATIBILITY_MODE,
                  useShouldOverrideUrlLoading: true,
                  supportMultipleWindows: true,
                ),
                shouldOverrideUrlLoading: (controller, navigationAction) async {
                  final uri = navigationAction.request.url;
                  if (uri != null && _isWhatsAppLaunchUri(uri)) {
                    await _openWhatsAppExternally(uri);
                    return NavigationActionPolicy.CANCEL;
                  }
                  return NavigationActionPolicy.ALLOW;
                },
                onCreateWindow: (controller, createWindowAction) async {
                  final uri = createWindowAction.request.url;
                  if (uri != null && _isWhatsAppLaunchUri(uri)) {
                    await _openWhatsAppExternally(uri);
                    return true;
                  }
                  return false;
                },
                onWebViewCreated: (c) async {
                  _webController = c;
                  HubPushLinks.setWebController(c);
                  await _hardReload(c, bootstrap: true);
                },
                onScrollChanged: (controller, x, y) {
                  _scrollY = y;
                  unawaited(_syncPullToRefreshEnabled());
                },
                onLoadStart: (controller, url) {
                  if (!mounted) return;
                  setState(() {
                    _isLoading = true;
                    _loadProgress = 0;
                  });
                },
                onLoadStop: (controller, url) async {
                  if (!mounted) return;
                  setState(() {
                    _isLoading = false;
                    _loadProgress = 100;
                  });
                  _scrollY = 0;
                  await _syncPullToRefreshEnabled();
                  unawaited(
                    controller.evaluateJavascript(
                      source: _kBlobUrlHookScript,
                      contentWorld: ContentWorld.PAGE,
                    ),
                  );
                  unawaited(
                    Future<void>.delayed(
                      const Duration(milliseconds: 900),
                      () async {
                        if (!mounted) return;
                        final c = _webController;
                        if (c != null) await tryRegisterFcmFromWebView(c);
                      },
                    ),
                  );
                  unawaited(HubPushLinks.flushPending());
                },
                onProgressChanged: (controller, progress) {
                  if (!mounted) return;
                  setState(() => _loadProgress = progress);
                },
                onReceivedError: (controller, request, error) {
                  if (!mounted) return;
                  setState(() => _isLoading = false);
                  final messenger = ScaffoldMessenger.maybeOf(context);
                  messenger?.showSnackBar(
                    SnackBar(content: Text(error.description)),
                  );
                },
                onDownloadStartRequest: _onDownloadStart,
              ),
              if (_isLoading && !_isOffline)
                Align(
                  alignment: Alignment.topCenter,
                  child: LinearProgressIndicator(
                    value: _loadProgress >= 100
                        ? null
                        : (_loadProgress <= 0 ? null : _loadProgress / 100),
                  ),
                ),
              if (_isOffline)
                Material(
                  color: theme.colorScheme.surface,
                  child: SafeArea(
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.wifi_off_rounded,
                              size: 72,
                              color: theme.colorScheme.primary,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No internet connection',
                              style: theme.textTheme.titleLarge,
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Connect to the internet, then try again.',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 24),
                            FilledButton.icon(
                              onPressed: _onRetryPressed,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Retry'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
