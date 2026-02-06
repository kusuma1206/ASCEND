const http = require('http');

http.get('http://localhost:3002/api/dashboard/stats', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const json = JSON.parse(data);
      console.log('Overall Score:', json.data.overall.score);
      console.log('Modules:', Object.keys(json.data.modules));
    } catch (e) {
      console.log('Response:', data);
    }
  });
}).on('error', (e) => console.error(e));
