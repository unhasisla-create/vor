'use client'
import ShellLayout from '@/components/ShellLayout'
import { ToastProvider } from '@/components/ui'
import ForecastPlanning from '@/components/modules/ForecastPlanning'
export default function Page() {
  return <ShellLayout><ToastProvider /><ForecastPlanning /></ShellLayout>
}
