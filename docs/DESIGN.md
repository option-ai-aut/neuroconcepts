# NeuroConcepts AI - Design System

Dieses Dokument definiert die visuellen Richtlinien für die NeuroConcepts AI Plattform. Ziel ist ein modernes, cleanes und konsistentes "Borderless" Design.

## 1. Grundprinzipien

*   **Borderless (Linienlos):** Wir vermeiden sichtbare Trennlinien (`border`) wo immer möglich.
    *   Struktur entsteht durch **Whitespace** (Abstände) und dezente **Hintergrundfarben** (`bg-gray-50/30`).
    *   Keine `border-b` unter Headern.
    *   Keine `border-r` bei Sidebars (außer der Haupt-Navigation).
*   **Soft UI (Weiche Formen):** Alles ist abgerundet und freundlich.
*   **Typografie als Struktur:** Große, fette Überschriften (`text-4xl font-extrabold`) definieren Bereiche, nicht Boxen.
*   **Split-View:** Listenansichten (Posteingang, Exposés, Chat) nutzen ein vertikales Split-Layout (Liste links, Detail rechts).
*   **Direkte Navigation:** Bei "Neu anlegen" Aktionen (Lead, Objekt) wird direkt zur Detailseite navigiert, kein Drawer/Modal.

## 2. Farben

*   **Primär:** Indigo (`bg-indigo-600`, `text-indigo-600`)
*   **Hintergrund (App):** `bg-white` (Hauptbereiche)
*   **Hintergrund (Listen/Sidebar):** `bg-gray-50/30` (Subtile Abhebung)
*   **Text (Haupt):** `text-gray-900`
*   **Text (Sekundär):** `text-gray-500`

## 3. Typografie

*   **Schriftart:** Geist Sans (Modern, technisch, gut lesbar).
*   **Seiten-Titel:**
    *   Größe: `text-4xl`
    *   Gewicht: `font-extrabold`
    *   Tracking: `tracking-tight`
    *   Abstand: `pt-8 px-8 pb-4` (Großzügiger Header-Bereich)

## 4. Komponenten & Rundungen

Wir nutzen globale CSS-Variablen für konsistente Radien (`frontend/src/app/globals.css`).

*   **Buttons & Inputs:** `--radius-md` (**8px**)
    *   Wirkt professionell und nicht zu verspielt.
*   **Container & Elemente:** `--radius-lg` (**12px**)
    *   Für Listeneinträge, kleinere Boxen.
*   **Cards & Modals:** `--radius-xl` (**16px**)
    *   Für große Inhaltsblöcke, Schatten-Elemente.

## 5. Layout-Struktur (Standard-Seite)

Jede Hauptseite (`/dashboard/...`) folgt diesem Aufbau:

1.  **Header-Bereich:**
    *   Hintergrund: `bg-white`
    *   Keine Border unten.
    *   Titel links (`text-4xl`), Aktionen (Buttons) rechts unten ausgerichtet (`items-end`).
2.  **Content-Bereich:**
    *   Füllt den Rest (`flex-1`).
    *   Oft zweigeteilt (Split-View) oder einspaltig (Kalender, Dashboard).
    *   Listen (links) haben oft `bg-gray-50/30`, Details (rechts) `bg-white`.

## 6. Interaktionen

*   **Listen-Items:**
    *   **Normal:** Transparent oder weiß.
    *   **Hover:** `hover:bg-white` (wenn Hintergrund grau) oder `hover:bg-gray-50`.
    *   **Aktiv:** `border-l-4 border-indigo-600` (Farbiger Balken links) + `bg-white`.
    *   **Keine Schatten** bei Listen-Items, nur bei "echten" Cards.

## 7. Icons

*   **Set:** Lucide React
*   **Stil:** Schlicht, oft in Kombination mit einem farbigen Hintergrund-Kreis oder -Quadrat (`bg-indigo-50 text-indigo-600`).

## 8. Exposé-Editor

Der Exposé-Editor ist ein zentrales Feature mit eigenem Design-System:

### Layout
*   **A4-Seiten-Vorschau:** Blöcke werden auf virtuellen A4-Seiten dargestellt
*   **Drei-Spalten-Layout:** Block-Bibliothek (links) | Preview (mitte) | Block-Optionen (rechts)
*   **Collapsible Sidebars:** Icons bleiben sichtbar, nur Text verschwindet

### Block-Auswahl
*   **Glow-Effekt:** Ausgewählte Blöcke haben `ring-1 ring-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)]`
*   **Controls außerhalb:** Grip-Handle und Buttons erscheinen links vom Block (im grauen Bereich)
*   **Nur bei Auswahl:** Controls sind nur sichtbar wenn Block ausgewählt ist (nicht bei Hover)

### Template-Variablen
*   **@-Mentions:** Tippe `@` um Variablen einzufügen (Autocomplete)
*   **Drag & Drop:** Felder-Sidebar zum Ziehen von Variablen
*   **Live-Vorschau:** Beispiel-Objekt wählbar, Variablen werden durch echte Daten ersetzt

### Themes
*   **Schriftstil:** Standard, Modern, Elegant, Minimalist
*   **Farbpalette:** Getrennt wählbar (Indigo, Emerald, Amber, Rose, Slate)
*   **Block-Farben:** Individuelle Hintergrund-/Textfarben pro Block möglich

## 9. Lead-Formular

### Anrede & Ansprache
*   **Anrede-Dropdown:** Keine, Herr, Frau, Divers
*   **Du/Sie Toggle:** Button-Group mit "Per Sie" (default) und "Per Du"
*   **5-Spalten-Grid:** Anrede | Du/Sie | Vorname | Nachname (2 Spalten)
