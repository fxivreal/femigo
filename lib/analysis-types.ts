export interface ContentAnalysis {
  mainTopic: string
  subtopics: string[]
  keyTakeaways: string[]
  actionableAdvice: string[]
  statistics: { value: string; context: string }[]
  quotes: { text: string; attribution?: string }[]
  examples: string[]
  commonMistakes: string[]
  lessonsLearned: string[]
  frequentlyAskedQuestions: { question: string; answer: string }[]
  contentHooks: string[]
  viralAngles: string[]
}

export interface InsightCluster {
  id: string
  title: string
  description: string
  insightIndices: number[]
}
