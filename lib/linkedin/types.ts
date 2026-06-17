export interface LinkedInAuth {
  accessToken: string
  expiresAt: Date
  personId: string
  name?: string
  email?: string
}

export interface PostInput {
  text: string
  mediaUrls?: string[]
}

export interface PostResult {
  success: boolean
  postId?: string
  error?: string
}

export interface LinkedInConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export function getLinkedInConfig(): LinkedInConfig {
  return {
    clientId: process.env.LINKEDIN_CLIENT_ID || "",
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || "http://localhost:3000/api/linkedin/callback",
  }
}
