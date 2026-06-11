import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"
import { Logo } from "@/components/logo"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <LoginForm />
    </div>
  )
}
