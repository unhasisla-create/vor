'use client'
import ShellLayout from '@/components/ShellLayout'
import { ToastProvider } from '@/components/ui'
import MasterData from '@/components/modules/MasterData'
export default function Page() {
  return <ShellLayout><ToastProvider /><MasterData /></ShellLayout>
}
