# JoeTube API على Cloudflare Workers

باك مكتوب بـ fetch فقط (بدون Node ولا مكتبات)، ينفّذ نفس مسارات الباك القديم:
`/ping` `/api/health` `/api/search` `/api/video` `/api/playlist` `/api/download` `/api/stream`

## النشر
```bash
cd cloudflare
npm install
npx wrangler login
npx wrangler deploy
```
سيعطيك رابطًا مثل `https://joetube-api.<name>.workers.dev`.

## ربطه بالواجهة (Vercel)
في Vercel ← Project Settings ← Environment Variables أضف:
`VITE_API_BASE = https://joetube-api.<name>.workers.dev` ثم أعد النشر (Redeploy).
وفي `wrangler.toml` غيّر `CORS_ORIGIN` إلى دومين موقعك.

## أسرار اختيارية
```bash
npx wrangler secret put YT_COOKIE     # كوكيز حساب يوتيوب ثانوي
npx wrangler secret put YT_PO_TOKEN
```

## حدود مهمة
- Cloudflare عناوين IP تابعة لمركز بيانات، ويوتيوب قد يطلب «لست روبوت» لبعضها. لا يوجد ضمان من جهة الكود.
- بدون ffmpeg: الفيديو يُقدَّم فقط بصيغة MP4 التي فيها صوت مدمج (غالبًا 360p/720p). الصوت يُقدَّم M4A/AAC وليس MP3 حقيقيًا.
- فيسبوك/إنستغرام/تيك توك/X تستخدم نفس واجهات الطرف الثالث الموجودة في الباك القديم.
