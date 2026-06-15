import RevenueEvaluation from '@/components/modules/RevenueEvaluation'
import ShellLayout from '@/components/ShellLayout'
import { ToastProvider } from '@/components/ui'

export default function RevenuePage() {
  return (
    <ShellLayout>
      <ToastProvider />
      <RevenueEvaluation />
    </ShellLayout>
  )
}
