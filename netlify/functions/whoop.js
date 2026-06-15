const https = require('https');

exports.handler = async (event) => {
  const TOKEN = process.env.WHOOP_TOKEN;
  const path = event.path.replace('/.netlify/functions/whoop', '') || '/cycle?limit=1';

  return new Promise((resolve) => {
    https.get({
      hostname: 'api.prod.whoop.com',
      path: '/developer/v1' + path,
      headers: { Authorization: `Bearer ${TOKEN}` }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: data
      }));
    }).on('error', e => resolve({
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    }));
  });
};
