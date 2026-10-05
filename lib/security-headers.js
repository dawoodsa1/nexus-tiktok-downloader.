export function securityHeaders(contentType, secure = true) {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin'
  };
  if (secure) headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  if (contentType?.toLowerCase().includes('text/html')) {
    headers['Content-Security-Policy'] = [
      "default-src 'self'", "base-uri 'self'", "form-action 'self'",
      "frame-ancestors 'none'", "object-src 'none'",
      "img-src 'self' https: data: blob:", "media-src 'self' https: blob:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
      "connect-src 'self' https://www.tiktok.com https://www.tikwm.com https://cloudflareinsights.com",
      'frame-src https:', ...(secure ? ['upgrade-insecure-requests'] : [])
    ].join('; ');
  }
  return headers;
}
