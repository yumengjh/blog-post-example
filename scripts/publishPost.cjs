const https = require('https');

const options = {
  hostname: 'api.netlify.com',
  path: '/build_hooks/6878a62634e95e4fb0b4e87e',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': 0
  }
};

const req = https.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  res.on('data', (d) => process.stdout.write(d));
});

req.on('error', (e) => {
  console.error(`请求遇到问题: ${e.message}`);
});

req.end();