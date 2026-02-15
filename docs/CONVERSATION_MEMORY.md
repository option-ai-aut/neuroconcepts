# Conversation Memory System

## Current Architecture (Chat Completions API)

### Overview

The primary chat flow uses the **Chat Completions API** with routed tool subsets. The OpenAI Assistants API was deprecated (sunset Aug 2026); we migrated to Chat Completions. The Responses API is OpenAI's recommended successor for potential future migration. Conversation history is managed per user within our system.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                 Chat Completions API + Routed Tools           │
│                                                              │
│  User 1  ──►  Conversation A  ──►  History managed per user │
│  User 2  ──►  Conversation B  ──►  History managed per user  │
│  User 3  ──►  Conversation C  ──►  History managed per user  │
│                                                              │
│  AgentRouter (gpt-5-mini) filters tools before each request   │
└─────────────────────────────────────────────────────────────┘
```

### Benefits

- **Routed tool subsets**: Intent classification (gpt-5-mini) routes to optimal tool set; main responses use gpt-5.2
- **Cost optimization**: Smalltalk and parsing use gpt-5-mini; complex tasks use gpt-5.2
- **No deprecated APIs**: Avoids Assistants API (sunset Aug 2026)
- **Migration path**: Responses API available for future migration

### Data Flow

1. **Active chat**: Messages are processed via Chat Completions with appropriate tool subsets
2. **Persistence**: Messages are saved to the `UserChat` table for search and archival
3. **New chat ("Neuer Chat")**: Conversation is reset and previous messages are archived

---

## ConversationMemory Class — Legacy Fallback & Search

The `ConversationMemory` class is kept for:

| Method | Purpose |
|--------|---------|
| `searchChatHistory()` | Memory Jarvis tool — semantic search over past conversations |
| `getLastArchivedConversation()` | Past conversation recall |
| `getContextAroundTopic()` | Topic-based context retrieval |

**Not used in main chat flow anymore (with Chat Completions):**
- `getOptimizedHistory()` — replaced by Chat Completions flow
- `autoSummarizeIfNeeded()` — no longer needed for active chats

---

## UserChat Table — Search & Archive

Chat messages continue to be saved to the `UserChat` table for:
- **Search**: Powering the memory search tool
- **Archival**: When "Neuer Chat" is started, messages are archived for future recall
- **Analytics**: Conversation history for reporting and insights

---

## Legacy Implementation (Historical Context)

> The following describes the previous sliding-window approach, kept for reference and for any legacy fallback scenarios.

### Problem (Original)

Long conversations with Jarvis caused:
1. **Performance**: Each message slowed down as full history was sent
2. **Cost**: More input tokens = higher API costs
3. **Context limit**: Token limits eventually reached
4. **User experience**: Slower response times

### Previous Solution: Sliding Window + Conversation Summary

```
All messages (e.g. 50):
┌─────────────────────────────────────────────────────────┐
│ [1-40: Old messages]  │  [41-50: Last 10]               │
│                       │                                 │
│ ↓ Summary              │  ↓ Full details                 │
│                       │                                 │
│ "User asked about      │  USER: What's the status?      │
│  property in Berlin,   │  ASSISTANT: The property...    │
│  Jarvis showed 3       │  USER: Perfect, thanks!        │
│  options..."           │  ASSISTANT: You're welcome!    │
└─────────────────────────────────────────────────────────┘
         ↓                            ↓
    Sent to model as context
```

### Database Schema (Still Present)

```prisma
model ConversationSummary {
  id           String   @id @default(uuid())
  userId       String
  summary      String   @db.Text
  messageCount Int      // How many messages were summarized
  createdAt    DateTime @default(now())
}
```

### Previous Configuration

```typescript
// ConversationMemory.ts
private static RECENT_MESSAGES_COUNT = 10;  // Last 10 messages in full length
private static SUMMARY_THRESHOLD = 20;      // Summarize from 20 messages onward
```

---

## Best Practices

### 1. Store important information explicitly

For critical data (Lead IDs, Property IDs), don't rely on conversation context alone:

```typescript
await prisma.userContext.upsert({
  where: { userId },
  update: { currentPropertyId: 'prop-123' },
  create: { userId, currentPropertyId: 'prop-123' }
});
```

### 2. Memory search usage

When users ask about past conversations, use `searchChatHistory()` or `getContextAroundTopic()` to retrieve relevant context for the AI tools.
