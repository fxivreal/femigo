"use client"

import { useState } from "react"
import { getAuthInstance } from "@/lib/firebase"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validations"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true)
    try {
      const auth = await getAuthInstance()
      const { sendPasswordResetEmail } = await import("firebase/auth")
      await sendPasswordResetEmail(auth, data.email)
      setSent(true)
      toast.success("Reset email sent")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a password reset link to your email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Forgot password?</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="john@example.com" {...register("email")} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <a href="/login" className="font-medium underline underline-offset-4 hover:text-primary">
            Sign in
          </a>
        </p>
      </CardContent>
    </Card>
  )
}
