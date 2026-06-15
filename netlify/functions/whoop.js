const https = require('https');

function post(body) {
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

function get(path, token) {
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
  // Refresh to get a valid access token
  const tokenData = await post(new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: process.env.WHOOP_REFRESH_TOKEN,
    client_id: process.env.WHOOP_CLIENT_ID,
    client_secret: process.env.WHOOP_CLIENT_SECRET,
  }).toString());

  if (!tokenData.access_token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Token refresh failed', detail: tokenData })
    };
  }

  const path = (event.path || '').replace('/.netlify/functions/whoop', '') || '/cycle?limit=1';
  const result = await get(path, tokenData.access_token);

  return {
    statusCode: result.status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: result.body
  };
};
