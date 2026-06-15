async function test(username){
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'vor2024' })
  })
  const json = await res.json()
  console.log(username, res.status, JSON.stringify(json))
}

;(async()=>{
  await test('admin')
  await test('admin')
  await test('planner.lmks')
})().catch(e=>{ console.error(e); process.exit(1) })
