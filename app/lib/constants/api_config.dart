/// API root including trailing segment `api` (no trailing slash), e.g. production server.
/// Override at build time: `--dart-define=API_BASE_URL=https://example.com/api`
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://infelohubserver.infelogroup.com/api',
);
