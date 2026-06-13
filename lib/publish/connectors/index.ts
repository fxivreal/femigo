import type { PublishResult, PublishPlatform } from "../types"

export interface IPlatformConnector {
  id: PublishPlatform
  label: string
  icon: string
  publish(
    userId: string,
    content: string,
    recipientPhone?: string | null
  ): Promise<PublishResult>
}

const registry = new Map<PublishPlatform, IPlatformConnector>()

export function registerConnector(connector: IPlatformConnector): void {
  registry.set(connector.id, connector)
}

export function getConnector(platform: PublishPlatform): IPlatformConnector | undefined {
  return registry.get(platform)
}

export function getAllConnectors(): IPlatformConnector[] {
  return Array.from(registry.values())
}
