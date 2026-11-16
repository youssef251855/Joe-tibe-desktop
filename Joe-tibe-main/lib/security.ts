import { URL } from 'url';

const ALLOWED_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'm.youtube.com',
  'tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
  'facebook.com',
  'fb.watch',
  'fb.com',
  'instagram.com',
  'instagr.am',
  'twitter.com',
  'x.com',
  't.co'
];

export function validateAndSanitizeUrl(rawUrl: string): { valid: boolean; platform?: string; sanitizedUrl?: string; error?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'الرابط المطلوب غير صالح أو فارغ.' };
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length > 2048) {
    return { valid: false, error: 'الرابط طويل جداً.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'صيغة الرابط غير صحيحة.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'يُسمح فقط ببروتوكولات HTTP و HTTPS الآمنة.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  const matchedDomain = ALLOWED_DOMAINS.find(domain => hostname === domain || hostname.endsWith('.' + domain));

  if (!matchedDomain) {
    return { valid: false, error: 'النطاق غير مدعوم. النطاق المدعومة هي: يوتيوب، تيك توك، فيسبوك، وإنستغرام.' };
  }

  // Determine platform
  let platform = 'unknown';
  if (matchedDomain.includes('youtube') || matchedDomain.includes('youtu.be')) platform = 'youtube';
  else if (matchedDomain.includes('tiktok')) platform = 'tiktok';
  else if (matchedDomain.includes('facebook') || matchedDomain.includes('fb.')) platform = 'facebook';
  else if (matchedDomain.includes('instagram') || matchedDomain.includes('instagr')) platform = 'instagram';

  return {
    valid: true,
    platform,
    sanitizedUrl: parsed.toString()
  };
}

export function setCorsHeaders(res: any, req?: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
}
