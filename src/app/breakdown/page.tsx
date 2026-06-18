'use client'
import ShellLayout from '@/components/ShellLayout'
import { ToastProvider } from '@/components/ui'
import BreakdownAnalysis from '@/components/modules/BreakdownAnalysis'
export default function Page() {
  return <ShellLayout><ToastProvider /><BreakdownAnalysis /></ShellLayout>
}
