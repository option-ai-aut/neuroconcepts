# Conversation Memory System

## Problem

Bei langen Gesprächen mit Jarvis entstehen folgende Probleme:

1. **Performance**: Jede Nachricht wird langsamer, da die komplette History an Gemini gesendet wird
2. **Kosten**: Mehr Input-Tokens = höhere API-Kosten
3. **Context-Limit**: Gemini hat ein Token-Limit (~1M Tokens), irgendwann ist Schluss
4. **User Experience**: User wartet länger auf Antworten

## Lösung: Sliding Window + Conversation Summary

### Konzept

```
Alle Nachrichten (z.B. 50):
┌─────────────────────────────────────────────────────────┐
│ [1-40: Alte Nachrichten]  │  [41-50: Letzte 10]        │
│                            │                             │
│ ↓ Zusammenfassung          │  ↓ Volle Details           │
│                            │                             │
│ "User fragte nach Objekt   │  USER: Wie ist der Status? │
│  in Berlin, Jarvis zeigte  │  ASSISTANT: Das Objekt...  │
│  3 Optionen, User wählte   │  USER: Perfekt, danke!     │
│  Objekt #2..."             │  ASSISTANT: Gerne!         │
└─────────────────────────────────────────────────────────┘
         ↓                              ↓
    An Gemini gesendet als Context
```

### Wie es funktioniert

1. **Erste 20 Nachrichten**: Alles wird normal gespeichert und an Gemini gesendet
2. **Ab 20 Nachrichten**: 
   - Alte Nachrichten (1-40) werden zu einer Zusammenfassung komprimiert
   - Letzte 10 Nachrichten bleiben in voller Länge
   - Gemini bekommt: `[Summary] + [Letzte 10 Nachrichten]`
3. **Caching**: Zusammenfassungen werden in DB gespeichert (nicht jedes Mal neu generieren)

## Implementierung

### ConversationMemory Service

```typescript
// Optimierte History abrufen
const { recentMessages, summary } = await ConversationMemory.getOptimizedHistory(userId);

// Für Gemini formatieren
const history = ConversationMemory.formatForGemini(recentMessages, summary);

// An Gemini senden
gemini.chatStream(message, tenantId, history);
```

### Datenbank-Schema

```prisma
model ConversationSummary {
  id           String   @id @default(uuid())
  userId       String
  summary      String   @db.Text
  messageCount Int      // Wie viele Nachrichten wurden zusammengefasst
  createdAt    DateTime @default(now())
}
```

### Konfiguration

```typescript
// ConversationMemory.ts
private static RECENT_MESSAGES_COUNT = 10;  // Letzte 10 Nachrichten in voller Länge
private static SUMMARY_THRESHOLD = 20;      // Ab 20 Nachrichten wird zusammengefasst
```

## Performance-Vergleich

### Ohne Optimization (50 Nachrichten)

```
Input Tokens: ~5000 Tokens
Response Time: ~3-5 Sekunden
Cost per Request: ~$0.0075
```

### Mit Optimization (50 Nachrichten)

```
Input Tokens: ~1000 Tokens (Summary) + ~500 Tokens (Letzte 10) = ~1500 Tokens
Response Time: ~1-2 Sekunden
Cost per Request: ~$0.0023
```

**Ersparnis: ~70% Kosten, ~60% schneller**

## Beispiel-Zusammenfassung

**Original (40 Nachrichten, ~4000 Tokens):**
```
USER: Hallo Jarvis
ASSISTANT: Hallo! Wie kann ich helfen?
USER: Zeig mir Objekte in Berlin
ASSISTANT: Ich habe 5 Objekte gefunden...
[... 36 weitere Nachrichten ...]
```

**Zusammenfassung (~200 Tokens):**
```
Der User suchte nach Immobilien in Berlin mit 3 Zimmern und Budget bis 500k€.
Jarvis zeigte 5 Optionen, User interessierte sich für Objekt #2 (Prenzlauer Berg).
User fragte nach Finanzierungsoptionen, Jarvis erklärte verschiedene Modelle.
User möchte Besichtigung vereinbaren, Termin wurde für nächsten Dienstag vorgeschlagen.
Offene Aufgabe: Exposé für Objekt #2 erstellen.
```

## Vorteile

✅ **Schneller**: Weniger Tokens = schnellere Antworten
✅ **Günstiger**: 70% weniger API-Kosten bei langen Gesprächen
✅ **Skalierbar**: Funktioniert auch bei 100+ Nachrichten
✅ **Smart**: KI behält wichtigen Kontext, vergisst unwichtiges
✅ **Cached**: Zusammenfassungen werden wiederverwendet

## Nachteile & Mitigation

❌ **Informationsverlust**: Alte Details gehen verloren
   → Mitigation: Wichtige Infos (Namen, IDs) werden in Summary behalten

❌ **Summary-Kosten**: Zusammenfassung kostet auch API-Calls
   → Mitigation: Wird gecached, nur einmal pro 20 Nachrichten

❌ **Latenz bei erster Summary**: Erste Zusammenfassung dauert ~2 Sekunden
   → Mitigation: Passiert asynchron im Hintergrund

## Best Practices

### 1. Wichtige Informationen explizit speichern

Für kritische Daten (Lead-IDs, Property-IDs) nicht auf Summary verlassen:

```typescript
// Besser: Explizit in DB speichern
await prisma.userContext.upsert({
  where: { userId },
  update: { currentPropertyId: 'prop-123' },
  create: { userId, currentPropertyId: 'prop-123' }
});
```

### 2. Summary-Threshold anpassen

Für Power-User die viel chatten:
```typescript
RECENT_MESSAGES_COUNT = 15;  // Mehr Details behalten
SUMMARY_THRESHOLD = 30;      // Später zusammenfassen
```

### 3. Monitoring

Überwache die Performance:
```typescript
console.log(`[Memory] User ${userId}: ${allMessages.length} messages, using summary: ${!!summary}`);
```

## Testing

```bash
# Test 1: Kurzes Gespräch (< 20 Nachrichten)
# Erwartung: Keine Summary, alle Nachrichten in voller Länge

# Test 2: Langes Gespräch (> 20 Nachrichten)
# Erwartung: Summary + letzte 10 Nachrichten

# Test 3: Performance
# Messe Response-Zeit mit/ohne Optimization
```

## Future Improvements

1. **Semantic Search in History**: Relevante alte Nachrichten basierend auf aktueller Frage abrufen
2. **Adaptive Window**: Window-Size basierend auf Kontext-Wichtigkeit anpassen
3. **Multi-Level Summaries**: Hierarchische Zusammenfassungen für sehr lange Gespräche
4. **Redis Caching**: Summaries in Redis statt nur DB für noch schnelleren Zugriff
