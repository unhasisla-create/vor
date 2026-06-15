'use client'
import ShellLayout from '@/components/ShellLayout'
import { ToastProvider } from '@/components/ui'
import AuditTrail from '@/components/modules/AuditTrail'
export default function Page() {
  return <ShellLayout><ToastProvider /><AuditTrail /></ShellLayout>
}
