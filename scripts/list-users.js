const fs = require('fs')
const path = require('path')
// simple .env.local loader (avoid adding dotenv dep)
;(function(){
  try{
    const envPath = path.resolve(__dirname, '..', '.env.local')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      content.split(/\r?\n/).forEach(line => {
        if (!line || line.trim().startsWith('#')) return
        const idx = line.indexOf('=')
        if (idx === -1) return
        const key = line.slice(0, idx).trim()
        let val = line.slice(idx + 1).trim()
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
        if (process.env[key] === undefined) process.env[key] = val
      })
    }
  }catch(e){/* ignore */}
})()
const { PrismaClient } = require('@prisma/client')

async function main(){
  const p = new PrismaClient()
  try{
    const users = await p.user.findMany({ select: { id:true, username:true, name:true, role:true, branchId:true, isActive:true } })
    console.log(JSON.stringify(users, null, 2))
  }catch(e){
    console.error(e)
    process.exit(1)
  }finally{
    await p.$disconnect()
  }
}

main()
