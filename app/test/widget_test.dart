import 'package:flutter_test/flutter_test.dart';

import 'package:infelohub/screens/infelo_hub_web_screen.dart';

void main() {
  test('hub entry URL uses HTTPS', () {
    expect(kInfeloHubUrl, 'https://infelohub.infelogroup.com');
  });
}
