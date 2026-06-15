'use client'
import ShellLayout from '@/components/ShellLayout'
import { ToastProvider } from '@/components/ui'
import ActualOperation from '@/components/modules/ActualOperation'
export default function Page() {
  return <ShellLayout><ToastProvider /><ActualOperation /></ShellLayout>
}
