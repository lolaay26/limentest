// api/images.js — Vercel serverless image proxy
// Fetches images server-side, bypassing browser CORS/hotlinking restrictions

export default async function handler(req, res) {
  // Allow requests from your Vercel domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'No url parameter provided' });
  }

  // Only allow known trusted image domains
  const allowedDomains = [
    'upload.wikimedia.org',
    'media.getty.edu',
    'www.artic.edu',
    'collectionapi.metmuseum.org',
    'images.metmuseum.org',
  ];

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const isAllowed = allowedDomains.some(d => parsedUrl.hostname === d);
  if (!isAllowed) {
    return res.status(403).json({ error: 'Domain not allowed' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Limn/1.0 (https://limn-mu.vercel.app; educational art app)',
        'Referer': 'https://limn-mu.vercel.app',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Upstream returned ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    // Cache for 7 days — images don't change
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('Content-Type', contentType);
    res.send(Buffer.from(buffer));

  } catch (err) {
    return res.status(500).json({ error: 'Fetch failed', detail: err.message });
  }
}
