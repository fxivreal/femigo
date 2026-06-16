import { describe, it, expect } from "vitest"
import { signupSchema, loginSchema, forgotPasswordSchema } from "./validations"

describe("signupSchema", () => {
  it("accepts valid input", () => {
    const result = signupSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "secret123",
    })
    expect(result.success).toBe(true)
  })

  it("rejects short name", () => {
    const result = signupSchema.safeParse({
      name: "J",
      email: "john@example.com",
      password: "secret123",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("name")
    }
  })

  it("rejects invalid email", () => {
    const result = signupSchema.safeParse({
      name: "John Doe",
      email: "not-an-email",
      password: "secret123",
    })
    expect(result.success).toBe(false)
  })

  it("rejects short password", () => {
    const result = signupSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "12345",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty name", () => {
    const result = signupSchema.safeParse({
      name: "",
      email: "john@example.com",
      password: "secret123",
    })
    expect(result.success).toBe(false)
  })
})

describe("loginSchema", () => {
  it("accepts valid input", () => {
    const result = loginSchema.safeParse({
      email: "john@example.com",
      password: "secret123",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "secret123",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "john@example.com",
      password: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "bad-email",
      password: "secret123",
    })
    expect(result.success).toBe(false)
  })
})

describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "john@example.com",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty email", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid email", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "not-email",
    })
    expect(result.success).toBe(false)
  })
})
