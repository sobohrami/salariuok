const http = require('http');
const data = JSON.stringify({
  jobTitle: 'Software Developer',
  location: 'București',
  yearsExperience: 5,
  salary: 7000,
  currency: 'RON'
});
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/analyze',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
}, res => {
  let b = '';
  res.on('data', d => b += d);
  res.on('end', () => console.log(JSON.parse(b)));
});
req.on('error', e => console.error(e.message));
req.write(data);
req.end();
