import Link from "next/link"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { Sparkles } from "lucide-react"

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Sparkles className="size-5 text-[#1877F2]" />
        <span className="font-semibold text-lg text-heading">Femigo</span>
      </Link>
      <ForgotPasswordForm />
    </div>
  )
}
