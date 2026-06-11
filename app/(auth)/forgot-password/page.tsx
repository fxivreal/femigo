import Link from "next/link"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { Logo } from "@/components/logo"

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <ForgotPasswordForm />
    </div>
  )
}
