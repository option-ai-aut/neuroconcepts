# Property Fields - Umfassende Recherche für Immobilienmakler

## Recherche-Quellen
- Exa.ai Web Search: Immobilien-CRM Standards, RESO Data Dictionary
- Deutsche Rechtslage: GEG §87 (Gebäudeenergiegesetz)
- Internationale CRM-Standards: Salesforce, HubSpot, Property Management CRMs

## 1. GRUNDDATEN (Basis-Informationen)

### Objekttyp & Vermarktungsart
- **Objekttyp** (Dropdown/Tabs)
  - Wohnung
  - Haus (Einfamilienhaus, Doppelhaushälfte, Reihenhaus)
  - Gewerbe (Büro, Laden, Lager, Gastronomie)
  - Grundstück (Bauland, Ackerland, Wald)
  - Sonstiges (Garage, Stellplatz, Ferienimmobilie)

- **Vermarktungsart** (Toggle/Slider) ⭐ WICHTIG
  - Kauf
  - Miete
  - Pacht (bei Gewerbe/Grundstück)

### Basis-Felder
- **Titel** (Intern) - Text
- **Adresse** - Text (Straße, Hausnummer)
- **PLZ** - Text
- **Stadt** - Text
- **Land** - Dropdown (Standard: Deutschland)
- **Stadtteil/Bezirk** - Text
- **Lage** - Dropdown
  - Zentral
  - Stadtrand
  - Ländlich
  - Ruhig
  - Verkehrsgünstig

## 2. PREIS & KOSTEN

### Bei KAUF
- **Kaufpreis** - Zahl (€)
- **Provisionspflichtig** - Toggle (Ja/Nein)
- **Provision** - Text/Zahl (z.B. "3,57% inkl. MwSt.")
- **Kaufpreis pro m²** - Auto-berechnet

### Bei MIETE
- **Kaltmiete** - Zahl (€/Monat)
- **Warmmiete** - Zahl (€/Monat)
- **Nebenkosten** - Zahl (€/Monat)
- **Heizkosten** - Dropdown
  - In Nebenkosten enthalten
  - Separat abgerechnet
  - Pauschal
- **Kaution** - Zahl (€) oder Text (z.B. "3 Monatsmieten")
- **Miete pro m²** - Auto-berechnet

### Zusatzkosten (beide)
- **Hausgeld/Wohngeld** - Zahl (€/Monat)
- **Grundsteuer** - Zahl (€/Jahr)
- **Sonstige Kosten** - Text

## 3. FLÄCHEN & RÄUME

- **Wohnfläche** - Zahl (m²) ⭐ PFLICHT
- **Nutzfläche** - Zahl (m²)
- **Grundstücksfläche** - Zahl (m²)
- **Anzahl Zimmer** - Zahl (z.B. 3,5) ⭐ PFLICHT
- **Anzahl Schlafzimmer** - Zahl
- **Anzahl Badezimmer** - Zahl
- **Anzahl Balkone** - Zahl
- **Balkon/Terrasse Fläche** - Zahl (m²)
- **Anzahl Stellplätze** - Zahl
- **Anzahl Garagen** - Zahl
- **Keller** - Toggle (Ja/Nein)
- **Kellerfläche** - Zahl (m²)

## 4. GEBÄUDE-INFORMATIONEN

### Baujahr & Zustand
- **Baujahr** - Zahl (JJJJ) ⭐ PFLICHT (GEG §87)
- **Letzte Modernisierung** - Zahl (JJJJ)
- **Zustand** - Dropdown
  - Erstbezug
  - Neuwertig
  - Renoviert
  - Saniert
  - Gepflegt
  - Modernisiert
  - Renovierungsbedürftig
  - Abbruchreif

### Gebäudetyp
- **Gebäudetyp** - Dropdown
  - Neubau
  - Altbau
  - Denkmalschutz
  - Baudenkmal
- **Bauweise** - Dropdown
  - Massiv
  - Fertighaus
  - Holzhaus
  - Fachwerkhaus
- **Anzahl Etagen (Gebäude)** - Zahl
- **Etage (Wohnung)** - Zahl
- **Anzahl Wohneinheiten** - Zahl

## 5. AUSSTATTUNG (Checkboxes/Multi-Select)

### Heizung & Energie
- **Heizungsart** - Multi-Select
  - Zentralheizung
  - Etagenheizung
  - Fernwärme
  - Fußbodenheizung
  - Gasheizung
  - Ölheizung
  - Wärmepumpe
  - Pelletheizung
  - Nachtspeicher
  - Kamin/Ofen
  - Solar
- **Energieträger** - Dropdown ⭐ PFLICHT (GEG §87)
  - Gas
  - Öl
  - Strom
  - Fernwärme
  - Holz/Pellets
  - Solar
  - Wärmepumpe
  - Erdwärme

### Ausstattungsmerkmale
- **Küche** - Dropdown
  - Keine
  - Einbauküche
  - Offene Küche
  - Pantryküche
- **Badezimmer** - Multi-Select
  - Badewanne
  - Dusche
  - Fenster
  - Gäste-WC
  - Bidet
- **Boden** - Multi-Select
  - Parkett
  - Laminat
  - Fliesen
  - Teppich
  - Vinyl
  - Estrich
  - Naturstein
  - Marmor
- **Fenster** - Multi-Select
  - Doppelverglasung
  - Dreifachverglasung
  - Rollläden
  - Jalousien
  - Bodentiefe Fenster

### Besondere Ausstattung
- **Aufzug** - Toggle
- **Barrierefrei** - Toggle
- **Einbauschränke** - Toggle
- **Klimaanlage** - Toggle
- **Alarmanlage** - Toggle
- **Videosprechanlage** - Toggle
- **Smart Home** - Toggle
- **Sauna** - Toggle
- **Schwimmbad/Pool** - Toggle
- **Kamin** - Toggle
- **Wintergarten** - Toggle

### Internet & Medien
- **Breitband-Internet** - Toggle
- **Kabel-TV** - Toggle
- **Glasfaser** - Toggle

### Außenbereich
- **Garten** - Toggle
- **Gartenfläche** - Zahl (m²)
- **Gartennutzung** - Dropdown
  - Allein
  - Gemeinschaftlich
- **Terrasse** - Toggle
- **Balkon** - Toggle
- **Balkonausrichtung** - Dropdown
  - Nord
  - Süd
  - Ost
  - West
  - Süd-West
  - etc.

### Parken
- **Stellplatz** - Multi-Select
  - Außenstellplatz
  - Tiefgarage
  - Garage
  - Carport
  - Duplex
- **Stellplatzmiete** - Zahl (€/Monat)

## 6. ENERGIEAUSWEIS ⭐ PFLICHT (GEG §87)

### Pflichtangaben für Inserate
- **Energieausweis vorhanden** - Toggle (Ja/Nein)
- **Art des Energieausweises** - Dropdown ⭐ PFLICHT
  - Energiebedarfsausweis
  - Energieverbrauchsausweis
- **Energieeffizienzklasse** - Dropdown ⭐ PFLICHT
  - A+ (sehr effizient)
  - A
  - B
  - C
  - D
  - E
  - F
  - G
  - H (wenig effizient)
- **Endenergiebedarf/-verbrauch** - Zahl (kWh/(m²·a)) ⭐ PFLICHT
- **Wesentlicher Energieträger** - siehe oben ⭐ PFLICHT
- **Baujahr Gebäude** - siehe oben ⭐ PFLICHT
- **Gültig bis** - Datum (Energieausweis 10 Jahre gültig)

### Zusätzliche Energiedaten
- **Baujahr Heizung** - Zahl (JJJJ)
- **Primärenergiebedarf** - Zahl (kWh/(m²·a))
- **CO2-Emissionen** - Zahl (kg/(m²·a))
- **Erneuerbare Energien** - Multi-Select
  - Solarthermie
  - Photovoltaik
  - Wärmepumpe
  - Biomasse

## 7. VERFÜGBARKEIT & FRISTEN

- **Verfügbar ab** - Datum oder Dropdown
  - Sofort
  - Nach Vereinbarung
  - Datum
- **Bezugsfrei ab** - Datum
- **Mindestmietdauer** - Zahl (Monate)
- **Befristet bis** - Datum (bei befristeten Mietverträgen)

## 8. RECHTLICHES & DOKUMENTE

### Eigentumsverhältnisse
- **Eigentumsart** - Dropdown
  - Volleigentum
  - Teileigentum
  - Wohnungseigentum
  - Erbbaurecht
  - Nießbrauch

### Genehmigungen & Auflagen
- **Denkmalschutz** - Toggle
- **Bebauungsplan** - Text/Upload
- **Baugenehmigung** - Toggle
- **Teilungserklärung** - Upload
- **Grundbuchauszug** - Upload
- **Flurkarte** - Upload

### Nutzung
- **Nutzungsart** - Dropdown
  - Wohnen
  - Gewerbe
  - Mischnutzung
- **WG-geeignet** - Toggle
- **Haustiere erlaubt** - Dropdown
  - Ja
  - Nein
  - Nach Vereinbarung
  - Nur Kleintiere
- **Rauchen erlaubt** - Toggle

## 9. OBJEKTBESCHREIBUNG (Text-Felder)

- **Objektbeschreibung** - Rich Text (für Exposé)
- **Lagebeschreibung** - Rich Text
- **Ausstattungsbeschreibung** - Rich Text
- **Sonstiges** - Rich Text

## 10. MEDIEN

- **Bilder** - Multi-Upload
  - Außenansicht
  - Wohnzimmer
  - Küche
  - Schlafzimmer
  - Badezimmer
  - Balkon/Terrasse
  - Garten
  - Sonstiges
- **Grundrisse** - Multi-Upload
- **360°-Tour** - URL
- **Video** - Upload/URL
- **Lageplan** - Upload
- **Luftbild** - Upload

## 11. KONTAKT & BESICHTIGUNG

- **Ansprechpartner** - Dropdown (Makler-Team)
- **Besichtigungstermine** - Kalender-Integration
- **Besichtigungsart** - Multi-Select
  - Einzelbesichtigung
  - Sammelbesichtigung
  - Virtuelle Besichtigung
  - Nach Vereinbarung

## 12. INTERNE FELDER (Nicht im Exposé)

- **Objekt-ID** - Auto-generiert
- **Akquise-Datum** - Datum
- **Quelle** - Dropdown
  - Eigentümer direkt
  - Empfehlung
  - Website
  - Portal
  - Kaltakquise
- **Provision (intern)** - Zahl (%)
- **Alleinauftrag** - Toggle
- **Vertragsende** - Datum
- **Status** - Dropdown
  - Akquise
  - Aktiv
  - Reserviert
  - Verkauft/Vermietet
  - Archiviert
- **Priorität** - Dropdown
  - Hoch
  - Mittel
  - Niedrig
- **Notizen (intern)** - Text
- **Tags** - Multi-Select (Custom)

## 13. MIVO-KONTEXT (AI-Fakten)

- **AI-Fakten** - Text (Freitext für Mivo)
  - Besonderheiten, die nicht in Standardfeldern passen
  - Verhandlungsspielraum
  - Besondere Vereinbarungen
  - Nachbarschaft
  - Infrastruktur
  - Verkehrsanbindung

## EMPFOHLENE IMPLEMENTIERUNG

### Phase 1: MVP (Minimum Viable Product)
- Objekttyp & Vermarktungsart (Kauf/Miete Toggle)
- Basis-Felder (Titel, Adresse, PLZ, Stadt)
- Preis (dynamisch: Kaufpreis ODER Miete)
- Flächen (Wohnfläche, Zimmer)
- Baujahr
- Beschreibung
- Bilder & Grundrisse

### Phase 2: Rechtliche Pflichtfelder
- Energieausweis (komplett nach GEG §87)
- Energieeffizienzklasse
- Energieträger

### Phase 3: Erweiterte Ausstattung
- Heizung & Energie
- Ausstattungsmerkmale (Küche, Bad, Boden)
- Besondere Ausstattung (Aufzug, Barrierefrei, etc.)

### Phase 4: Vollständig
- Alle Felder aus der Liste
- Custom Fields für Tenant-spezifische Anforderungen

## UI/UX EMPFEHLUNGEN

### Dynamische Felder
- **Kauf/Miete-Toggle** → Zeigt nur relevante Preisfelder
- **Objekttyp** → Blendet irrelevante Felder aus
  - Bei "Grundstück": Keine Zimmer, keine Ausstattung
  - Bei "Gewerbe": Andere Ausstattungsoptionen
- **Energieausweis Ja/Nein** → Zeigt/versteckt alle EA-Felder

### Gruppierung
- Sections mit Überschriften (wie aktuell)
- Collapsible Sections für weniger wichtige Felder
- "Erweiterte Optionen" ausklappbar

### Smart Defaults
- Land: Deutschland
- Währung: EUR
- Energieausweis: Ja (mit Hinweis auf Pflicht)

### Auto-Berechnungen
- Preis pro m² (bei Eingabe von Preis + Fläche)
- Warmmiete (Kaltmiete + Nebenkosten + Heizkosten)

### Validierung
- Pflichtfelder markieren (*)
- Warnungen bei fehlenden GEG-Pflichtangaben
- Plausibilitätschecks (z.B. Baujahr > 1800)

## RECHTLICHE HINWEISE

### GEG §87 - Pflichtangaben in Immobilienanzeigen
Seit 1. November 2020 müssen Makler in **kommerziellen Anzeigen** folgende Daten angeben:
1. Art des Energieausweises
2. Energieeffizienzklasse (bei Wohngebäuden)
3. Baujahr
4. Wesentlicher Energieträger
5. Endenergiebedarf/-verbrauch

**Verstöße** können als wettbewerbswidrige Irreführung abgemahnt werden (BGH-Urteil).

### Datenschutz (DSGVO)
- Adressen nur mit Einwilligung des Eigentümers veröffentlichen
- Interne Notizen: Zugriffsbeschränkung
- Löschfristen beachten (archivierte Objekte)

## QUELLEN
- RESO Data Dictionary (International Real Estate Standard)
- GEG §87 (Gebäudeenergiegesetz Deutschland)
- HubSpot, Salesforce, Propstack CRM Best Practices
- Immomio, Property Management CRM Standards
