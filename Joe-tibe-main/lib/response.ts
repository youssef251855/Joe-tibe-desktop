import { setCorsHeaders } from './security.js';

export function sendSuccess(res: any, data: any, statusCode: number = 200) {
  setCorsHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(statusCode).json({
    success: true,
    data,
    error: null
  });
}

export function sendError(res: any, message: string, statusCode: number = 400) {
  setCorsHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: message
  });
}

export function handleCors(req: any, res: any): boolean {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}
