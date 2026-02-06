const http = require('http');

http.get('http://localhost:3002/api/user/current', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('User:', data);
  });
}).on('error', (e) => console.error(e));
