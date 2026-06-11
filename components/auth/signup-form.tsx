"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getAuthInstance, getDbInstance } from "@/lib/firebase"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signupSchema, type SignupFormData } from "@/lib/validations"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GoogleButton } from "@/components/auth/google-button"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function SignupForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true)
    try {
      const [auth, db] = await Promise.all([getAuthInstance(), getDbInstance()])
      const { createUserWithEmailAndPassword } = await import("firebase/auth")
      const { doc, setDoc, serverTimestamp } = await import("firebase/firestore")
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password)
      await setDoc(doc(db, "users", cred.user.uid), {
        name: data.name,
        email: data.email,
        createdAt: serverTimestamp(),
      })
      toast.success("Account created successfully")
      router.push("/home")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md animate-fade-in">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Enter your details to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Enter your name"
              className={cn(errors.name && "border-destructive focus-visible:ring-destructive/20")}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              className={cn(errors.email && "border-destructive focus-visible:ring-destructive/20")}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              className={cn(errors.password && "border-destructive focus-visible:ring-destructive/20")}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full bg-[#6366F1] hover:bg-[#6366F1]/80 text-white" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>
        <GoogleButton />
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#6366F1] hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
