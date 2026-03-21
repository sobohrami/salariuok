const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test() {
  const res = await fetch('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobTitle: "Lucrător sexual",
      location: "București",
      yearsExperience: 5,
      salary: 15000,
      currency: "RON"
    }),
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
