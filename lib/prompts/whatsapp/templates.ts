export interface CampaignTemplate {
  id: string
  name: string
  description: string
  category: "funnel" | "followup"
  goal?: string
  audience?: string
  angle?: string
  config: {
    status: { enabled: boolean; count: number }
    broadcast: { enabled: boolean }
    "sales-funnel": { enabled: boolean }
    "follow-up": { enabled: boolean }
  }
  suggestedContent: string
}

export const funnelTemplates: CampaignTemplate[] = [
  {
    id: "product-launch",
    name: "Week-long Product Launch",
    description: "Tease → problem → solution → features → testimonials → offer → urgency",
    category: "funnel",
    goal: "awareness",
    audience: "default",
    angle: "educational",
    config: {
      status: { enabled: true, count: 10 },
      broadcast: { enabled: true },
      "sales-funnel": { enabled: true },
      "follow-up": { enabled: false },
    },
    suggestedContent:
      "Describe your new product or service. What problem does it solve? Who is it for? What makes it different from competitors? Include key features, pricing, and target audience details.",
  },
  {
    id: "webinar-reminder",
    name: "Webinar / Event Reminder",
    description: "Announcement → reminder → last call → follow-up",
    category: "funnel",
    goal: "engagement",
    audience: "default",
    angle: "educational",
    config: {
      status: { enabled: true, count: 5 },
      broadcast: { enabled: true },
      "sales-funnel": { enabled: true },
      "follow-up": { enabled: true },
    },
    suggestedContent:
      "Describe your upcoming webinar or event. What date and time? What will attendees learn? Who is the host/speaker? Include the registration link and any early-bird offers.",
  },
  {
    id: "abandoned-cart",
    name: "Abandoned Cart Recovery",
    description: "Gentle reminder → incentive → last chance",
    category: "funnel",
    goal: "conversion",
    audience: "default",
    angle: "sales-oriented",
    config: {
      status: { enabled: true, count: 3 },
      broadcast: { enabled: false },
      "sales-funnel": { enabled: true },
      "follow-up": { enabled: true },
    },
    suggestedContent:
      "Describe your product or service that customers typically leave in their cart. What's the price point? What objections might they have? Include any current discounts or urgency triggers.",
  },
  {
    id: "welcome-series",
    name: "New Subscriber Welcome",
    description: "Welcome → value → social proof → offer",
    category: "funnel",
    goal: "engagement",
    audience: "default",
    angle: "friendly",
    config: {
      status: { enabled: true, count: 5 },
      broadcast: { enabled: false },
      "sales-funnel": { enabled: true },
      "follow-up": { enabled: false },
    },
    suggestedContent:
      "Describe your brand or business. What value do you provide to new subscribers? What can they expect from you? Include your best free resource or introductory offer.",
  },
]

export const followupTemplates: CampaignTemplate[] = [
  {
    id: "thank-you",
    name: "Post-Purchase Thank You",
    description: "Thank you + upsell suggestion + support info",
    category: "followup",
    goal: "retention",
    audience: "default",
    angle: "friendly",
    config: {
      status: { enabled: false, count: 5 },
      broadcast: { enabled: false },
      "sales-funnel": { enabled: false },
      "follow-up": { enabled: true },
    },
    suggestedContent:
      "Describe what customers typically purchase from you. What's the customer journey after purchase? What complementary products or services exist? Include common support questions.",
  },
  {
    id: "nps-survey",
    name: "NPS / Feedback Survey",
    description: "Ask for rating → thank you → improvement offer",
    category: "followup",
    goal: "engagement",
    audience: "default",
    angle: "friendly",
    config: {
      status: { enabled: false, count: 5 },
      broadcast: { enabled: false },
      "sales-funnel": { enabled: false },
      "follow-up": { enabled: true },
    },
    suggestedContent:
      "Describe your product or service and the typical customer experience. What aspects would you like feedback on? What metrics matter to your business (satisfaction, ease of use, support quality)?",
  },
  {
    id: "upsell-crossell",
    name: "Upsell / Cross-sell",
    description: "Value add → complementary product → exclusive offer",
    category: "followup",
    goal: "conversion",
    audience: "default",
    angle: "sales-oriented",
    config: {
      status: { enabled: false, count: 5 },
      broadcast: { enabled: false },
      "sales-funnel": { enabled: false },
      "follow-up": { enabled: true },
    },
    suggestedContent:
      "Describe your product catalogue. What products naturally complement each other? What's the typical order value? Include pricing tiers and bundle options.",
  },
  {
    id: "re-engagement",
    name: "Re-engagement (Win-back)",
    description: "We miss you → what's new → incentive to return",
    category: "followup",
    goal: "retention",
    audience: "default",
    angle: "friendly",
    config: {
      status: { enabled: true, count: 3 },
      broadcast: { enabled: false },
      "sales-funnel": { enabled: false },
      "follow-up": { enabled: true },
    },
    suggestedContent:
      "Describe your typical customer lifecycle. How long before customers become inactive? What new features or products have been added recently? Include past customer preferences or purchase history context.",
  },
  {
    id: "appointment-reminder",
    name: "Appointment / Booking Reminder",
    description: "Confirmation → prep instructions → reminder → reschedule",
    category: "followup",
    goal: "conversion",
    audience: "default",
    angle: "professional",
    config: {
      status: { enabled: false, count: 5 },
      broadcast: { enabled: false },
      "sales-funnel": { enabled: false },
      "follow-up": { enabled: true },
    },
    suggestedContent:
      "Describe your appointment or booking process. What services do you offer? What preparation is needed? What's the cancellation policy? Include typical appointment duration and location details.",
  },
]

export const allTemplates = [...funnelTemplates, ...followupTemplates]

export function getTemplateById(id: string): CampaignTemplate | undefined {
  return allTemplates.find((t) => t.id === id)
}
