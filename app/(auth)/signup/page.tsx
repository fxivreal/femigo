import Link from "next/link"
import { SignupForm } from "@/components/auth/signup-form"
import { Sparkles } from "lucide-react"

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Sparkles className="size-5 text-[#6366F1]" />
        <span className="font-semibold text-lg text-heading">Femigo</span>
      </Link>
      <SignupForm />
    </div>
  )
}
