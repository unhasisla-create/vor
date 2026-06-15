export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-[#5B8F82] font-medium">Memuat...</p>
      </div>
    </div>
  )
}
