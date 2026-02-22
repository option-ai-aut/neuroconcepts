# Lead Fields - Recherche für Immobilien-CRM

## Recherche-Quellen
- Exa.ai Web Search: Immobilien-CRM Lead Management Standards
- Real Estate Lead Metadata Specification
- Best Practices von HubSpot, Salesforce, Pipedrive

## IMPLEMENTIERTE FELDER

### 1. Kontaktdaten (PFLICHT)
- ✅ **Vorname** - String
- ✅ **Nachname** - String
- ✅ **E-Mail** - String (REQUIRED)
- ✅ **Telefon** - String

### 2. Käufer-Präferenzen (für Matching)
- ✅ **Budget Min** - Decimal (€)
- ✅ **Budget Max** - Decimal (€)
- ✅ **Gewünschte Objektart** - Enum
  - Wohnung
  - Haus
  - Gewerbe
  - Grundstück
  - Garage/Stellplatz
  - Sonstiges
- ✅ **Gewünschte Lage** - String (PLZ oder Stadt)
- ✅ **Min. Zimmer** - Float
- ✅ **Min. Wohnfläche** - Float (m²)
- ✅ **Zeitrahmen** - Enum
  - Sofort
  - 1-3 Monate
  - 3-6 Monate
  - 6-12 Monate
  - >12 Monate

### 3. Finanzierung (für Qualifizierung)
- ✅ **Finanzierungsstatus** - Enum
  - Noch nicht geklärt
  - Vorqualifiziert
  - Genehmigt
  - Barzahler
- ✅ **Eigenkapital vorhanden** - Boolean

### 4. Lead-Quelle (für Marketing-ROI)
- ✅ **Quelle** - Enum
  - Eigene Website
  - Immobilienportal
  - Empfehlung
  - Social Media
  - Kaltakquise
  - Veranstaltung
  - Sonstiges
- ✅ **Details zur Quelle** - String (z.B. "ImmoScout24", "Google Ads")

### 5. Status & Workflow
- ✅ **Status** - Enum
  - Neu
  - Kontaktiert
  - Im Gespräch
  - Termin gebucht
  - Verloren
- ✅ **Notizen** - Text (intern)
- ✅ **Zugeordnetes Objekt** - Relation zu Property
- ✅ **Kommunikationshistorie** - Messages

## WARUM DIESE FELDER?

### Budget & Präferenzen → Automatisches Matching
```typescript
// Mivo kann jetzt automatisch passende Objekte finden:
"Zeige mir alle Objekte für Lead XYZ"
→ Budget: 300k-450k
→ Typ: Wohnung
→ Lage: Berlin
→ Min. 3 Zimmer, 80m²
```

### Zeitrahmen → Lead-Priorisierung
```typescript
// Leads mit "Sofort" haben höchste Priorität
IMMEDIATE > THREE_MONTHS > SIX_MONTHS > TWELVE_MONTHS > LONGTERM
```

### Finanzierung → Qualifizierung
```typescript
// Ernsthafte Käufer identifizieren:
CASH_BUYER (höchste Priorität)
APPROVED (hoch)
PRE_QUALIFIED (mittel)
NOT_CLARIFIED (niedrig)
```

### Lead-Quelle → Marketing-ROI
```typescript
// Welche Kanäle bringen die besten Leads?
PORTAL: 45% Conversion
REFERRAL: 60% Conversion
SOCIAL_MEDIA: 20% Conversion
→ Budget-Optimierung
```

## ZUKÜNFTIGE ERWEITERUNGEN (Optional)

### Erweiterte Präferenzen
- **Ausstattungswünsche** - Multi-Select
  - Balkon/Terrasse
  - Garten
  - Garage/Stellplatz
  - Aufzug
  - Barrierefrei
  - Einbauküche
- **Bevorzugte Etage** - String
- **Haustiere** - Boolean
- **WG-geeignet** - Boolean

### Erweiterte Finanzierung
- **Eigenkapital (Betrag)** - Decimal
- **Monatliche Rate (Max)** - Decimal
- **Bank/Kreditgeber** - String

### Erweiterte Kommunikation
- **Bevorzugter Kontaktweg** - Enum (E-Mail, Telefon, WhatsApp)
- **Beste Erreichbarkeit** - String (z.B. "Mo-Fr 18-20 Uhr")
- **Sprache** - Enum (Deutsch, Englisch, etc.)

### Lead Scoring (Automatisch)
- **Lead Score** - Integer (0-100)
  - Basierend auf: Budget, Zeitrahmen, Finanzierung, Aktivität
  - Automatisch berechnet von Mivo

### DSGVO & Compliance
- **Einwilligung Marketing** - Boolean + Datum
- **Einwilligung Datenspeicherung** - Boolean + Datum
- **Löschfrist** - Datum

## MIVO-INTEGRATION

### Automatische Lead-Qualifizierung
```typescript
// Mivo analysiert Lead automatisch:
"Dieser Lead hat:
- Budget: 400k-500k (hoch)
- Zeitrahmen: Sofort (sehr hoch)
- Finanzierung: Genehmigt (sehr hoch)
→ Lead Score: 95/100
→ Empfehlung: Sofort kontaktieren!"
```

### Intelligentes Matching
```typescript
// Mivo schlägt passende Objekte vor:
"Für Lead Max Mustermann habe ich 3 passende Objekte gefunden:
1. Wohnung Berlin-Mitte, 3.5 Zi, 85m², 450k
2. Wohnung Berlin-Prenzlauer Berg, 4 Zi, 90m², 480k
3. Wohnung Berlin-Kreuzberg, 3 Zi, 80m², 420k"
```

### Proaktive Benachrichtigungen
```typescript
// Mivo benachrichtigt bei neuem Match:
"Neues Objekt passt zu 3 Leads:
- Max Mustermann (Score: 95%)
- Anna Schmidt (Score: 88%)
- Peter Müller (Score: 82%)"
```

## UI/UX BEST PRACTICES

### Gruppierung
- **Kontaktdaten** (immer sichtbar)
- **Käufer-Präferenzen** (collapsible, aber wichtig)
- **Finanzierung** (collapsible)
- **Lead-Quelle** (collapsible)
- **Notizen** (immer sichtbar)
- **Kommunikation** (eigener Tab/Section)

### Smart Defaults
- Status: "Neu"
- Finanzierung: "Noch nicht geklärt"
- Quelle: "Website"

### Validierung
- E-Mail: Format-Check
- Budget: Min < Max
- Telefon: Format-Check (optional)

### Auto-Vervollständigung
- Lage: Vorschläge aus bestehenden Objekten
- Quelle Details: Häufige Portale vorschlagen

## DATENMODELL (Prisma)

```prisma
model Lead {
  // Kontakt
  email     String
  firstName String?
  lastName  String?
  phone     String?
  
  // Präferenzen
  budgetMin       Decimal?
  budgetMax       Decimal?
  preferredType   PropertyType?
  preferredLocation String?
  minRooms        Float?
  minArea         Float?
  timeFrame       LeadTimeFrame?
  
  // Finanzierung
  financingStatus FinancingStatus
  hasDownPayment  Boolean
  
  // Quelle
  source          LeadSource
  sourceDetails   String?
  
  // Status
  status    LeadStatus
  notes     String?
  
  // Relationen
  propertyId String?
  property   Property?
  messages   Message[]
}
```

## QUELLEN
- Real Estate Lead Metadata Specification
- HubSpot Real Estate CRM Best Practices
- Salesforce Real Estate CRM Guide
- Pipedrive Real Estate CRM
- LeadsBridge Real Estate Lead Management
- Nimble CRM Essential Buyer Questions
