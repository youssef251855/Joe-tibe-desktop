# النشر على Vercel

1. ارفع المشروع إلى GitHub (بدون `node_modules` و`.env*` — موجودة في `.gitignore`).
2. في Vercel: Add New Project ← اختر المستودع ← Framework: Vite ← Deploy (الإعدادات تُقرأ من `vercel.json`).
3. اترك `VITE_API_BASE` فارغًا (الواجهة والـ API على نفس الدومين).
4. متغيرات بيئة اختيارية (Project Settings ← Environment Variables):
   - `WORKER_URL` / `WORKER_KEY`: خادم worker لتجاوز حظر يوتيوب لعناوين IP الخاصة بـ Vercel
   - `YT_PROXY` أو `YT_COOKIE`: بديل لتجاوز تحقق «لست روبوت»
   - `CORS_ORIGIN`: اختياري

## التشغيل المحلي
`npm install` ثم `npm run dev` — الـ API يعمل داخل Vite نفسه (لا حاجة لتشغيل backend منفصل).

## ملاحظة
`api/_server/` ناتج تجميع `backend/src/server` عبر `npm run build:api`. أعد تشغيل الأمر وارفع الناتج عند تعديل كود الـ backend.
