const axios = require('axios');
const fs = require('fs');
const path = require('path');

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  Cookie: 'selected_language=ro; ucity=Bucharest; _ga=GA1.1.680372286.1774211530; _fbp=fb.1.1774211530479.795133777336882891; _tt_enable_cookie=1; _ttp=01KMBKYZYY5WDEJNHYX0PCD0YE_.tt.1; cookie_ul=granted; cc_ads=granted; cc_analytics=granted; _gcl_au=1.1.910533331.1774211529.290702095.1774213108.1774213145; ttcsid_CH8BGCJC77UEQOU9DA60=1774211530731::BUCFxvgRN9adVhUPkwbC.1.1774213193989.1; ttcsid=1774211530732::h-IgPyzuHe0Ok0kalIvA.1.1774213193990.0; XSRF-TOKEN=eyJpdiI6ImdYRllSQVFUMERuZTFpVWMyOFJmT1E9PSIsInZhbHVlIjoiNUpETzZ4WjFWSllYaEFKS3llUVpJMkNmSlhBem5teGRhQnI5K3V5ZDNtS2dMSXBXczI2SDBNRnJxVzRONE5XOFJQSmJyRUVSR09XWWRUbndnUVd5clFPU2o2dzBmK0NiSEVLNHQwUFZzMWFUQWd2NjdyUmFRT083d0E0WmtJL3giLCJtYWMiOiIwZDQ5ZjJmN2JjY2U1OWI0MzIyYWExYzcwNWNjOGY0ODg0ZGQ3NWRhMDM0ZTM2ODRhNTgxZmFlMzljM2NhMzA5IiwidGFnIjoiIn0%3D; wherewework_session=eyJpdiI6InN6SFJHaktTMEQweGFBQ2RpeUU0cmc9PSIsInZhbHVlIjoieFlYRjZMR2wzbXcyZ25NYndPRFJvWXFva2JDL0xIRWdZdjZMZW9FbTZoeUFQYThOSFcyNlE3SjZDMVhtMXY4ZUcwZkhLQ1FZeE80dlk0SWdQRHF0dFNpdFE1dlM0Q01rcnlvTUVWakYyK2NnS1VzK3pXMnY2Y0hqQ2dNYUN5MVYiLCJtYWMiOiI2OTQ2MDMwMGM0MjA1ZDZjODI2MzU0ZDhlOGZhZjY5OTY2YjU2ZDUyNTQ0NzU2YzRiOGE5M2JjYzk0NTZmNmI2IiwidGFnIjoiIn0%3D; _ga_7RGD8DK7VG=GS2.1.s1774211530$o1$g1$t1774213196$j55$l0$h0',
};

async function check() {
  try {
    const res = await axios.get('https://www.undelucram.ro/ro/salarii-kpmg-romania-totul-despre-mediul-de-lucru-interviu-120', { headers: HEADERS });
    fs.writeFileSync(path.join(__dirname, 'kpmg.html'), res.data);
    console.log('Saved to kpmg.html. Length:', res.data.length);

    // Look for typical salary entries in the dumped HTML
    const matchLei = res.data.match(/[\d.,]+\s*Lei/gi);
    console.log('Found "Lei" instances:', matchLei ? matchLei.length : 0);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
check();
