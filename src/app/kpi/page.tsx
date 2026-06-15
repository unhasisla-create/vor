'use client'
import ShellLayout from '@/components/ShellLayout'
import { ToastProvider } from '@/components/ui'
import KPIEngine from '@/components/modules/KPIEngine'
export default function Page() {
  return <ShellLayout><ToastProvider /><KPIEngine /></ShellLayout>
}
