# Quest Master — Backlog

Features deferred from the active Phase 2 spec. Revisit when higher-priority items are shipped.

---

### Global Explorer Component

**The problem**: Globals are the heart of IRIS data storage. After writing to globals in quests, players have no way to inspect what they actually created in the IRIS namespace — they're working blind.

**The solution**: Add a collapsible **Global Explorer** sidebar tab that queries the IRIS namespace and renders the global tree interactively.

**Implementation:**
- New IRIS endpoint: `GET /api/quest/globals?root=^Guild` → returns a JSON tree of subscripts and values
- ObjectScript implementation using `$ORDER` traversal (max depth 4, max 200 nodes to avoid runaway)
- New Angular component `GlobalExplorerComponent` with:
  - Root global name input (with autocomplete from `GET /api/quest/globals` listing root globals)
  - Expandable tree nodes — click to expand subscripts
  - Inline values shown in monospace
  - "Kill this node" button (with confirmation) for cleanup
  - "Copy path" copies `^Global("sub1","sub2")` to clipboard

**Why this matters for learning**: Seeing the actual global tree after writing to it makes the data model visceral. This is the same feedback loop that a good database GUI provides.

---

### SQL Explorer Component

**The problem**: The SQL branch teaches `&sql()` and `%ResultSet`, but there is no way to run ad-hoc SQL queries against the current namespace. Players must submit quests to verify their SQL works.

**The solution**: Add a **SQL Explorer** tab (peer to the Global Explorer):
- Simple textarea for SQL input
- `POST /api/quest/sql` → new IRIS endpoint that runs a `%SQL.Statement` query and returns rows as JSON
- Results rendered as an HTML table in the UI
- Auto-populated table/class picker: `GET /api/quest/sql-tables` lists all user-defined persistent classes
- Query history (localStorage, last 20 queries)

**New IRIS endpoint:**
```objectscript
ClassMethod RunSQL() As %Status {
  Set body = {}.%FromJSON(%request.Content)
  Set sql = body.%Get("sql")
  Set stmt = ##class(%SQL.Statement).%New()
  Set sc = stmt.%Prepare(sql)
  If $$$ISERR(sc) {
    Write {"success":0,"error":($System.Status.GetErrorText(sc))}.%ToJSON()
    Return $$$OK
  }
  Set rs = stmt.%Execute()
  Set rows = []
  Set meta = rs.%GetMetaData()
  While rs.%Next() {
    Set row = {}
    For i=1:1:meta.columnCount {
      Do row.%Set(meta.columns.GetAt(i).colName, rs.%GetData(i))
    }
    Do rows.%Push(row)
  }
  Write {"success":1,"rows":rows}.%ToJSON()
  Return $$$OK
}
```

---

### Real-Time Output Streaming

**The problem**: For long-running code (loops, large data writes), the output panel shows nothing until the full request completes. This feels unresponsive and hides execution progress.

**The solution**: Add a streaming execution endpoint to IRIS using Server-Sent Events (SSE).

**New IRIS endpoint `GET /api/quest/stream` (SSE):**
- The Angular client sends code via query parameter or initiates a session ID
- IRIS uses `%Net.ServerSocket` or streams output via chunked HTTP responses line by line
- Angular `EventSource` receives lines and appends them to the output panel in real time

**Note**: This is architecturally non-trivial in IRIS's CSP framework. A simpler alternative:
- Execute code in a background JOB (via `JOB ##class(QuestMaster.REST.Execute).RunAsync(code, jobId)`)
- Poll `GET /api/quest/job/{jobId}/output` every 500ms, appending new output lines
- Show a spinner until the job finishes
- This avoids SSE complexity while providing incremental feedback

**Frontend change**: Output panel gets a "streaming" mode — lines fade in as they arrive rather than replacing all at once.

---

### Interoperability Quest Track

**Why**: IRIS Interoperability (formerly Ensemble) is one of the platform's most distinctive and marketable features. Teaching Business Services, Business Processes, and Business Operations would make Quest Master useful to a much broader audience of real IRIS developers.

**New skill branch: `interop`**

| Quest ID | Title | Concept |
|---|---|---|
| `interop-01` | The Messenger's Contract | Business Service basics, adapters |
| `interop-02` | The Message Broker | Message classes, routing rules |
| `interop-03` | The Transformation Forge | Data transforms, DTL |
| `interop-04` | The Business Process | BPL, sequential process flows |
| `interop-05` | The Error Archive | Dead letter queue, error handling |

**Technical constraint**: Interoperability class deployment requires the namespace to have Interoperability enabled. Add a health-check that verifies: `##class(%Dictionary.ClassDefinition).%ExistsId("Ens.BusinessService")`.

If Interoperability is not enabled, show a setup guide inside the quest narrative explaining how to enable it in the Management Portal.

---

### Code History & Diff View

**The problem**: After submitting and failing a quest, players lose track of what changed between attempts. There's no way to compare the working solution to previous attempts.

**The solution**: Track submission history per quest in localStorage.

```typescript
interface QuestAttempt {
  questId: string;
  code: string;
  output: string;
  submittedAt: string;
  score: number;
  passed: boolean;
}
```

**UI**:
- "History" button in the output panel toolbar opens a modal
- List of previous attempts (date, score, pass/fail)
- Click any attempt to load its code back into the editor
- Side-by-side diff view between any two attempts (using Monaco's `createDiffEditor`)
- Attempts are capped at 20 per quest; oldest pruned automatically

---

### Lightweight Backend (Bun + IRIS)

**Why**: localStorage caps at ~5MB, has no cross-device sync, and prevents any social features. Adding a minimal backend unlocks all of the following.

**Proposed stack**: A Bun HTTP server deployed inside the same Docker network as IRIS.

```yaml
# docker-compose.yml addition
  quest-backend:
    image: oven/bun:latest
    ports:
      - "3001:3001"
    volumes:
      - ./backend:/app
    command: bun run /app/server.ts
```

**API surface (minimal):**

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/anonymous` | Create anonymous session, return session token |
| `POST` | `/auth/register` | Optional: name + email registration |
| `GET/PUT` | `/progress/{sessionId}` | Sync game state JSON blob |
| `GET` | `/leaderboard` | Top players by XP (opt-in) |
| `POST` | `/quest-bank` | Submit a community quest for review |
| `GET` | `/quest-bank/approved` | Get community-contributed quests |

**Game state sync**: The backend stores `GameState` as a JSON blob. The Angular app syncs to backend on every state mutation (debounced 2s). On load, it fetches from backend if a session token exists in localStorage, merging with local state (latest-wins by `updatedAt` timestamp).

---

### Instructor / Classroom Mode

**Use case**: A university course or workshop wants to assign specific quests to students and track completion.

**Implementation**:

**Instructor portal** (separate Angular route `/instructor`):
- Create a "class session" with a join code (e.g., `GUILD-4892`)
- Select which skill branches are active for the session
- View student progress table: name, XP, completed quests, last active
- Download CSV report

**Student flow**:
- Enter join code in Settings → links session to instructor's class
- Progress automatically syncs to instructor view
- Instructor can push a "featured quest" that appears highlighted at the top of a student's quest list

**Tech**: Instructor session data stored in IRIS globals on the backend IRIS instance — using the existing IRIS Docker as a lightweight persistence layer for classroom state.

```objectscript
// Classroom data structure in IRIS globals
SET ^QM("classes", classCode, "students", sessionId, "xp") = xp
SET ^QM("classes", classCode, "students", sessionId, "completedQuests") = $LISTBUILD(q1, q2, ...)
```
