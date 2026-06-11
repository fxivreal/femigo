import Link from "next/link"
import { SignupForm } from "@/components/auth/signup-form"
import { Logo } from "@/components/logo"

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <SignupForm />
    </div>
  )
}
