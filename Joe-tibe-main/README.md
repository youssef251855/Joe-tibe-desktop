# Joe Tube Backend — Serverless API

تطبيق وباشراف خلفي متكامل (Backend) مبني على بنية Serverless Functions لعمل تطبيق **Joe Tube**.

## 🚀 المميزات الرئيسية
- **دعم متعدد للمنصات:** YouTube, TikTok, Facebook, Instagram.
- **هيكلة Modular Providers:** إضافة منصات جديدة بسهولة تامة عبر محولات مستقلة.
- **أمان عالي وحماية من الثغرات:** فحص الروابط لمنع هجمات SSRF وOpen Redirect، وإعدادات CORS محكمة.
- **إدارة المهام غير المتزامنة (Jobs):** دعم تتبع حالات المعالجة (`queued`, `processing`, `completed`, `failed`).
- **جاهز للنشر على Vercel:** بدون الحاجة لخادم دائم التشغيل (VPS) وبدون تكاليف.

---

## 📂 هيكلية المشروع
```text
├── api/                  # مسارات Serverless API (Vercel)
│   ├── health.ts         # فحص حالة الخدمة
│   ├── inspect.ts        # التحقق من الرابط واكتشاف المنصة
│   ├── metadata.ts       # جلب بيانات الفيديو
│   ├── jobs.ts           # إنشاء مهمة معالجة
│   ├── job-status.ts     # الاستعلام عن حالة المهمة
│   ├── download.ts       # طلب تنزيل محتوى
│   └── providers.ts      # عرض المنصات المدعومة
├── providers/            # محولات المنصات المستقلة
│   ├── base.ts           # الواجهة الأساسية للموفرين
│   ├── youtube.ts        # موفر يوتيوب
│   ├── tiktok.ts         # موفر تيك توك
│   ├── facebook.ts       # موفر فيسبوك
│   ├── instagram.ts      # موفر إنستغرام
│   └── index.ts          # مسجل الموفرين
├── services/             # خدمات إدارة المهام والتخزين
│   └── jobManager.ts
├── lib/                  # مكتبات الأمان والتحقق والاستجابة
│   ├── security.ts
│   └── response.ts
├── client/               # مكتبة واجهة المستخدم للـ API
│   └── joetubeClient.ts
├── vercel.json           # إعدادات Vercel
└── package.json          # حزم المشروع
```

---

## 🛠️ التشغيل المحلي والنشر من الهاتف (Android)

### 1. النشر على Vercel من هاتف أندرويد:
1. أنشئ مستودعاً جديداً على **GitHub** وارفع ملفات المشروع هذه إليه.
2. افتح موقع [Vercel](https://vercel.com) من متصفح الهاتف (Chrome).
3. اضغط على **Add New Project** واختر المستودع من GitHub.
4. اترك الإعدادات الافتراضية واضغط **Deploy**.
5. ستحصل على رابط الـ Backend الخاص بك (مثلاً: `https://joetube-api.vercel.app`).

### 2. ربط الواجهة الأمامية بالـ Backend:
في ملفات الواجهة الأمامية أو عبر المتغيرات البيئية، قم بتعريف رابط الـ API:
```javascript
window.JOE_TUBE_API_URL = "https://your-vercel-domain.vercel.app";
```
ثم استدعِ الوظائف عبر العميل الجاهز:
```javascript
import { joetubeClient } from './client/joetubeClient.ts';

// مثال على جلب البيانات
async function checkVideo(url) {
  const result = await joetubeClient.getMetadata(url);
  console.log(result);
}
```
