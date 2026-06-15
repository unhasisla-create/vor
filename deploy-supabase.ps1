# deploy-supabase.ps1
# Aman: hanya push ke Supabase, tidak sentuh lokal

# Backup .env lokal (untuk jaga-jaga)
Copy-Item ".env" ".env.backup.$(Get-Date -Format 'yyyyMMddHHmmss')" -ErrorAction SilentlyContinue

Write-Host "=== Masukkan password Supabase ===" -ForegroundColor Yellow
$pw = Read-Host -AsSecureString "Password"
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw)
$plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Encode karakter @ (kalau ada)
$encoded = $plain -replace '@', '%40'

Write-Host "`n=== Push schema ke Supabase ===" -ForegroundColor Green

$env:DATABASE_URL = "postgresql://postgres.sjitbazprlvebumkwjuq:$encoded@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
$env:DIRECT_URL = "postgresql://postgres.sjitbazprlvebumkwjuq:$encoded@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

npx prisma db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Berhasil! Sekarang deploy ke Vercel." -ForegroundColor Green
} else {
    Write-Host "`n❌ Gagal. Cek error di atas." -ForegroundColor Red
    Write-Host "   Database lokal TIDAK tersentuh." -ForegroundColor Yellow
}
