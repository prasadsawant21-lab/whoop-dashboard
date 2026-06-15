const https = require('https');
const { getStore } = require('@netlify/blobs');

const CLIENT_ID = process.env.WHOOP_CLIENT_ID;
const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;

function httpsPost(body) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.prod.whoop.com',
      path: '/oauth/oauth2/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpsGet(path, token) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.prod.whoop.com',
      path: '/developer/v1' + path,
      headers: { Authorization: `Bearer ${token}` }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    }).on('error', reject);
  });
}

exports.handler = async (event) => {
  const store = getStore('whoop-tokens');

  let tokens = null;
  try { tokens = await store.get('tokens', { type: 'json' }); } catch (_) {}

  const now = Date.now();
  if (!tokens || now >= tokens.expires_at) {
    const refreshToken = tokens?.refresh_token || process.env.WHOOP_REFRESH_TOKEN;
    const newTokens = await httpsPost(new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }).toString());

    if (!newTokens.access_token) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Token refresh failed', detail: newTokens }) };
    }

    tokens = {
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      expires_at: now + (newTokens.expires_in - 60) * 1000
    };
    await store.setJSON('tokens', tokens);
  }

  const path = (event.path || '').replace('/.netlify/functions/whoop', '') || '/cycle?limit=1';
  const result = await httpsGet(path, tokens.access_token);

  return {
    statusCode: result.status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: result.body
  };
};
