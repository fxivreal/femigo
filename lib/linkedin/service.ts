import type { PostInput, PostResult, LinkedInConfig } from "./types"

export interface ILinkedInService {
  post(userId: string, input: PostInput, accessToken: string): Promise<PostResult>
}

export class MockLinkedInService implements ILinkedInService {
  async post(userId: string, input: PostInput, accessToken: string): Promise<PostResult> {
    return {
      success: true,
      postId: `mock_li_post_${Date.now()}`,
    }
  }
}

export class LinkedInApiService implements ILinkedInService {
  private config: LinkedInConfig

  constructor(config: LinkedInConfig) {
    this.config = config
  }

  async post(userId: string, input: PostInput, accessToken: string): Promise<PostResult> {
    try {
      // Get user's LinkedIn URN
      const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!meRes.ok) {
        const errText = await meRes.text()
        return { success: false, error: `Failed to get LinkedIn profile: ${errText}` }
      }

      const meData = await meRes.json() as { sub: string; name?: string }
      const authorUrn = `urn:li:person:${meData.sub}`
      const mediaAttachments: { media: string; status: string }[] | undefined = input.mediaUrls?.map((url) => ({
        media: url,
        status: "READY",
      }))

      const body: Record<string, unknown> = {
        author: authorUrn,
        commentary: input.text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabled: false,
      }

      if (mediaAttachments) {
        body.content = {
          media: { mediaAttachments },
        }
      }

      const postRes = await fetch("https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202501",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(body),
      })

      if (!postRes.ok) {
        const errText = await postRes.text()
        return { success: false, error: `LinkedIn API error: ${errText}` }
      }

      const postId = postRes.headers.get("x-restli-id") || `post_${Date.now()}`
      return { success: true, postId }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      return { success: false, error: message }
    }
  }
}

let instance: ILinkedInService | null = null

export function getLinkedInService(): ILinkedInService {
  if (!instance) {
    const { clientId, clientSecret } = getLinkedInConfig()
    if (clientId && clientSecret) {
      instance = new LinkedInApiService(getLinkedInConfig())
    } else {
      instance = new MockLinkedInService()
    }
  }
  return instance
}

export function setLinkedInProvider(type: "mock" | "api", config?: LinkedInConfig): void {
  if (type === "api" && config) {
    instance = new LinkedInApiService(config)
  } else {
    instance = new MockLinkedInService()
  }
}
