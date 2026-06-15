'use client'
import ShellLayout from '@/components/ShellLayout'
import { ToastProvider } from '@/components/ui'
import Dashboard from '@/components/modules/Dashboard'
export default function DashboardPage() {
  return <ShellLayout><ToastProvider /><Dashboard /></ShellLayout>
}
