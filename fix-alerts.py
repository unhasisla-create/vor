import re

with open('src/components/modules/MasterData.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("alert('Gagal memperbarui cabang')", "const errData = await res.json().catch(()=>null); alert(errData?.error || 'Gagal memperbarui cabang')")
content = content.replace("alert('Gagal menambah cabang')", "const errData = await res.json().catch(()=>null); alert(errData?.error || 'Gagal menambah cabang')")

with open('src/components/modules/MasterData.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
