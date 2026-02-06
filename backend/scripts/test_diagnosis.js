const http = require('http');

const data = JSON.stringify({
  semester: 6,
  branch: "CSE",
  targetRole: "AI Engineer",
  skills: ["Python"], // Missing ML, Data Analysis -> Should trigger gaps
  weeklyHours: 10 // Low hours -> Should trigger risk
});

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/diagnosis',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Diagnosis:', body);
  });
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
