import { describe, it, expect } from 'vitest'
import { buildAgentGraph } from '../src/agent.js'

describe('agent graph', () => {
  it('produces title/body for empty input', async () => {
    const g = buildAgentGraph()
    const res = await g.invoke({ input: '' })
    expect(res.title).toBe('Pater Agent')
    expect(typeof res.body).toBe('string')
  })

  it('echoes input into body', async () => {
    const g = buildAgentGraph()
    const res = await g.invoke({ input: 'Hello' })
    expect(res.body).toBe('Hello')
  })
})


