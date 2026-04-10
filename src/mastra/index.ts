import { Mastra } from '@mastra/core'
import { vcLearningAgent } from './agents/vcLearningAgent'

export const mastra = new Mastra({
  agents: { vcLearningAgent },
})

export { vcLearningAgent }
