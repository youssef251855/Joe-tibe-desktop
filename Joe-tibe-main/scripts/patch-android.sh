#!/usr/bin/env bash
# يضيف صلاحيات التخزين للإصدارات القديمة من أندرويد (9 وما قبل) إلى AndroidManifest.xml
set -e
M="android/app/src/main/AndroidManifest.xml"
if ! grep -q "WRITE_EXTERNAL_STORAGE" "$M"; then
  sed -i 's#<uses-permission android:name="android.permission.INTERNET" />#<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />#' "$M"
fi
grep -n "uses-permission" "$M"
