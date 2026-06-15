const http = require('http')

async function run(){
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'vor2024' }),
  })
  const loginJson = await loginRes.json().catch(()=>null)
  console.log('login status', loginRes.status, JSON.stringify(loginJson))
  const setCookie = loginRes.headers.get('set-cookie')
  if(!setCookie){
    console.error('No set-cookie header; aborting')
    process.exit(1)
  }
  const cookieVal = setCookie.split(';')[0]
  const usersRes = await fetch('http://localhost:3000/api/admin/users', { headers: { Cookie: cookieVal } })
  const usersJson = await usersRes.json().catch(()=>null)
  console.log('admin/users status', usersRes.status, JSON.stringify(usersJson).slice(0,2000))
}

run().catch(e=>{ console.error(e); process.exit(1) })
