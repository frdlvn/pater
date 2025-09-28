import { StateGraph, Annotation, START, END } from '@langchain/langgraph'

/**
 * Minimal LangGraph agent that maps an input string to a toast payload.
 */
export function buildAgentGraph () {
  const AgentState = Annotation.Root({
    input: Annotation(),
    title: Annotation(),
    body: Annotation()
  })

  const builder = new StateGraph(AgentState)

  const planNode = (state) => {
    const raw = state.input ?? ''
    const title = 'Pater Agent'
    const body = raw && typeof raw === 'string' ? raw : 'Hello from LangGraph'
    return { title, body }
  }

  return builder
    .addNode('plan', planNode)
    .addEdge(START, 'plan')
    .addEdge('plan', END)
    .compile()
}
