'use client'
import ShellLayout from '@/components/ShellLayout'
import { ToastProvider } from '@/components/ui'
import ForecastVsActual from '@/components/modules/ForecastVsActual'
export default function Page() {
  return <ShellLayout><ToastProvider /><ForecastVsActual /></ShellLayout>
}
