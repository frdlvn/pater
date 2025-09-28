Pater (Electron + LangGraph POC)

Proof-of-concept Electron app using `@langchain/langgraph` to run a minimal agent that triggers a native Windows toast via `electron-windows-notifications`.

Requirements
- Node.js 18+
- Windows 10/11 for native toasts (on non-Windows, toast calls are no-ops)

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
- On non-Windows platforms or if notifications are disabled, `electron-windows-notifications` exports no-ops.
- AppUserModelID is set to `com.pater.app` and required for Windows toasts.

Tests
Basic agent unit test can be added with Vitest (placeholder script configured).

