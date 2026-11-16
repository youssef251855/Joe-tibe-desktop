# JoeTube كتطبيق أندرويد (استخراج من جهاز المستخدم)

**كيف يعمل:** الواجهة نفسها داخل غلاف Capacitor. طلبات `/api/*` تُخدَّم محليًا من `src/native/*`
(نفس منطق Cloudflare Worker) عبر HTTP أصلي بلا CORS، والتنزيل يتم من خوادم يوتيوب مباشرة إلى الجهاز.
لا خادم ولا Worker. في المتصفح العادي يبقى الموقع يعمل كما كان.

## أسهل طريق: بناء APK على GitHub (بدون Android Studio)
1. ارفع المشروع إلى مستودع GitHub.
2. تبويب **Actions** ← **Build Android APK** ← **Run workflow**.
3. بعد دقائق نزّل `JoeTube-debug-apk` من قسم Artifacts، فكّ الضغط، وثبّت `app-debug.apk` على هاتفك.

## البناء المحلي (يلزم Node 20 وJDK 21 وAndroid SDK)
```bash
npm install
npm run build:web
npx cap add android
bash scripts/patch-android.sh
npx cap sync android
cd android && ./gradlew assembleDebug
# الناتج: android/app/build/outputs/apk/debug/app-debug.apk
```
أو افتحه في Android Studio: `npm run android:open`.

## ما لم يُختبر بعد (يرجى التجربة على جهاز حقيقي)
- استخراج روابط يوتيوب الفعلية (عملاء InnerTube قد يتغيّر سلوكهم أو يطلبون تحقق «لست روبوت»).
- الحفظ في `Documents/JoeTube`؛ إن رفضه النظام يُحفظ في مجلد التطبيق (يُعرض المسار في الإشعار).
- ملفات الـ MP3 الحقيقية والجودات العالية المنفصلة غير متاحة (لا ffmpeg): الصوت M4A، والفيديو MP4 بصوت مدمج.
