Pater (Electron + LangGraph POC)

Proof-of-concept Electron app using `@langchain/langgraph` to run a minimal agent that triggers a native toast via Electron's `Notification` API.

Requirements
- Node.js 18+
- Desktop OS with notification support (Windows 10/11, macOS, many Linux DEs)

Install
```bash
npm install
```

Run
```bash
npm run dev
```
This launches Electron. Use the input and click:
- "Toast Direct" to send a toast directly
- "Toast via Agent" to run the LangGraph agent and toast the result

Structure
- `src/main.js`: Electron main process, AppUserModelID, IPC, toast code
- `src/preload.js`: Exposes safe APIs to renderer
- `src/renderer.html` + `src/renderer.js`: Simple UI to trigger actions
- `src/agent.js`: Minimal LangGraph StateGraph that maps input to `{ title, body }`

Notes
- On platforms where notifications are disabled or unsupported, calls will return an error state.
- AppUserModelID is set to `com.pater.app` and enables Windows toast integration.

Tests
Basic agent unit test can be added with Vitest (placeholder script configured).

