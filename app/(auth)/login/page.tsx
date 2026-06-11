import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"
import { Sparkles } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Sparkles className="size-5 text-[#1877F2]" />
        <span className="font-semibold text-lg text-heading">Femigo</span>
      </Link>
      <LoginForm />
    </div>
  )
}
