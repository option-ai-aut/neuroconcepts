/**
 * EmailResponseHandler - Processes incoming email responses from leads
 * Handles: Intent analysis, lead matching, automated responses
 */

import { PrismaClient, LeadStatus } from '@prisma/client';
import JarvisActionService from './JarvisActionService';
import NotificationService from './NotificationService';
import OpenAI from 'openai';

const prisma = new PrismaClient();

// Lazy-init to avoid crash before secrets are loaded
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  }
  return _openai;
}

// Intent types for email responses
export type EmailIntent = 'INTERESTED' | 'QUESTION' | 'NOT_INTERESTED' | 'UNCLEAR';

export interface EmailAnalysisResult {
  intent: EmailIntent;
  confidence: number;
  summary: string;
  suggestedAction?: string;
  extractedQuestion?: string;
  proposedTimes?: string[];
}

export interface IncomingEmail {
  from: string;
  fromName?: string;
  subject: string;
  body: string;
  receivedAt: Date;
}

/**
 * Fuzzy match two strings (for name matching)
 */
function fuzzyMatch(str1: string | null | undefined, str2: string | null | undefined): boolean {
  if (!str1 || !str2) return false;
  
  const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-zäöüß]/g, '');
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  // Exact match
  if (s1 === s2) return true;
  
  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return true;
  
  // Levenshtein distance for typos (allow 2 character difference for short names)
  const maxDistance = Math.min(2, Math.floor(Math.min(s1.length, s2.length) / 3));
  return levenshteinDistance(s1, s2) <= maxDistance;
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Find a lead by email address or sender name
 */
export async function findLeadByEmailOrName(
  email: string,
  senderName: string | undefined,
  tenantId: string
) {
  // 1. Direct email match
  let lead = await prisma.lead.findFirst({
    where: { email, tenantId },
    include: { property: true, assignedTo: true }
  });
  if (lead) {
    console.log(`📧 Lead found by email: ${lead.id}`);
    return lead;
  }

  // 2. Check alternateEmails (JSON array) - fetch all leads and filter in memory
  const allLeads = await prisma.lead.findMany({
    where: { tenantId },
    include: { property: true, assignedTo: true }
  });

  for (const l of allLeads) {
    const alternates = l.alternateEmails as string[] | null;
    if (alternates?.includes(email)) {
      console.log(`📧 Lead found by alternate email: ${l.id}`);
      return l;
    }
  }

  // 3. Name matching (fuzzy)
  if (senderName) {
    const nameParts = senderName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    const candidates = await prisma.lead.findMany({
      where: { 
        tenantId,
        status: { not: 'LOST' }
      },
      include: { property: true, assignedTo: true }
    });

    for (const candidate of candidates) {
      const firstNameMatch = fuzzyMatch(candidate.firstName, firstName);
      const lastNameMatch = lastName ? fuzzyMatch(candidate.lastName, lastName) : true;

      if (firstNameMatch && lastNameMatch) {
        console.log(`📧 Lead found by name match: ${candidate.id} (${candidate.firstName} ${candidate.lastName})`);
        
        // Save alternate email for future matching
        const existingAlternates = (candidate.alternateEmails as string[] | null) || [];
        if (!existingAlternates.includes(email)) {
          await prisma.lead.update({
            where: { id: candidate.id },
            data: { alternateEmails: [...existingAlternates, email] }
          });
          console.log(`📧 Saved alternate email ${email} for lead ${candidate.id}`);
        }
        
        return candidate;
      }
    }
  }

  console.log(`📧 No lead found for email ${email} / name ${senderName}`);
  return null;
}

/**
 * Analyze email content using AI to determine intent
 */
export async function analyzeEmailIntent(
  emailBody: string,
  emailSubject: string,
  propertyTitle?: string
): Promise<EmailAnalysisResult> {
  const prompt = `Du bist ein Assistent für Immobilienmakler. Analysiere diese E-Mail-Antwort eines Interessenten.

${propertyTitle ? `Objekt: ${propertyTitle}` : ''}

Betreff: ${emailSubject}

E-Mail-Inhalt:
${emailBody}

Klassifiziere den Intent der E-Mail:
- INTERESTED: Der Interessent möchte eine Besichtigung, mehr Informationen, oder zeigt klares Kaufinteresse
- QUESTION: Der Interessent hat eine spezifische Frage zum Objekt (Preis, Lage, Ausstattung, etc.)
- NOT_INTERESTED: Der Interessent hat kein Interesse mehr (zu teuer, anderes gefunden, etc.)
- UNCLEAR: Die Absicht ist nicht eindeutig erkennbar

WICHTIG: Bei Unklarheit IMMER "UNCLEAR" wählen. Halluziniere KEINE Informationen.

Antworte im folgenden JSON-Format:
{
  "intent": "INTERESTED" | "QUESTION" | "NOT_INTERESTED" | "UNCLEAR",
  "confidence": 0.0-1.0,
  "summary": "Kurze Zusammenfassung der E-Mail in einem Satz",
  "suggestedAction": "Empfohlene nächste Aktion",
  "extractedQuestion": "Falls QUESTION: Die extrahierte Frage",
  "proposedTimes": ["Falls der Interessent Zeiten vorschlägt"]
}`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Du bist ein präziser E-Mail-Analyse-Assistent. Antworte nur mit validem JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    });

    const response = completion.choices[0]?.message?.content || '';

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]) as EmailAnalysisResult;
    console.log(`📧 Email intent analysis: ${result.intent} (confidence: ${result.confidence})`);
    return result;
  } catch (error: any) {
    console.error('Email intent analysis failed:', error.message);
    return {
      intent: 'UNCLEAR',
      confidence: 0,
      summary: 'Analyse fehlgeschlagen',
      suggestedAction: 'Manuell prüfen'
    };
  }
}

/**
 * Process an incoming email response
 */
export async function processEmailResponse(
  tenantId: string,
  email: IncomingEmail
): Promise<{
  lead: any | null;
  analysis: EmailAnalysisResult;
  actionTaken: string;
}> {
  // 1. Find the lead
  const lead = await findLeadByEmailOrName(email.from, email.fromName, tenantId);

  if (!lead) {
    // No lead found - escalate to admin
    const admins = await prisma.user.findMany({
      where: { tenantId, role: { in: ['ADMIN', 'SUPER_ADMIN'] } }
    });

    if (admins.length > 0) {
      await JarvisActionService.createPendingAction({
        tenantId,
        userId: admins[0].id,
        type: 'ESCALATION',
        question: `Eingehende E-Mail von ${email.from} (${email.fromName || 'Unbekannt'}) konnte keinem Lead zugeordnet werden. Bitte manuell prüfen.`,
        context: { email }
      });
    }

    return {
      lead: null,
      analysis: { intent: 'UNCLEAR', confidence: 0, summary: 'Kein Lead gefunden' },
      actionTaken: 'Eskaliert an Admin - kein Lead gefunden'
    };
  }

  // Get property info
  const property = lead.propertyId ? await prisma.property.findUnique({ where: { id: lead.propertyId } }) : null;

  // 2. Analyze the email
  const analysis = await analyzeEmailIntent(
    email.body,
    email.subject,
    property?.title
  );

  // 3. Create activity log
  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      type: 'EMAIL_RECEIVED',
      description: analysis.summary,
      metadata: {
        from: email.from,
        subject: email.subject,
        intent: analysis.intent,
        confidence: analysis.confidence
      }
    }
  });

  // 4. Notify assigned agent
  if (lead.assignedToId) {
    const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email;
    await NotificationService.notifyLeadResponse({
      tenantId,
      userId: lead.assignedToId,
      leadId: lead.id,
      leadName,
      preview: analysis.summary
    });
  }

  // 5. Take action based on intent
  let actionTaken = '';
  const assignedUserId = lead.assignedToId || (await getDefaultAgent(tenantId));

  switch (analysis.intent) {
    case 'INTERESTED':
      // Update lead status
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'CONVERSATION' }
      });

      // Create action for scheduling viewing
      if (assignedUserId) {
        await JarvisActionService.createPendingAction({
          tenantId,
          userId: assignedUserId,
          leadId: lead.id,
          type: 'SCHEDULE_VIEWING',
          question: `${lead.firstName || 'Interessent'} möchte eine Besichtigung für "${property?.title || 'Objekt'}". Soll ich Terminvorschläge senden?`,
          context: { analysis, proposedTimes: analysis.proposedTimes }
        });
      }
      actionTaken = 'Status auf CONVERSATION gesetzt, Besichtigungsanfrage erstellt';
      break;

    case 'QUESTION':
      // Update lead status
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'CONVERSATION' }
      });

      // Create action for answering question
      if (assignedUserId) {
        await JarvisActionService.createPendingAction({
          tenantId,
          userId: assignedUserId,
          leadId: lead.id,
          type: 'ANSWER_QUESTION',
          question: `${lead.firstName || 'Interessent'} hat eine Frage: "${analysis.extractedQuestion || analysis.summary}"`,
          context: { analysis, originalEmail: email }
        });
      }
      actionTaken = 'Status auf CONVERSATION gesetzt, Frage an Makler weitergeleitet';
      break;

    case 'NOT_INTERESTED':
      // Update lead status
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'LOST' }
      });

      // Log the reason
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'STATUS_CHANGED',
          description: `Lead als LOST markiert: ${analysis.summary}`
        }
      });
      actionTaken = 'Status auf LOST gesetzt';
      break;

    case 'UNCLEAR':
    default:
      // Escalate to agent
      if (assignedUserId) {
        await JarvisActionService.createPendingAction({
          tenantId,
          userId: assignedUserId,
          leadId: lead.id,
          type: 'ESCALATION',
          question: `E-Mail von ${lead.firstName || lead.email} konnte nicht eindeutig klassifiziert werden. Bitte manuell prüfen.`,
          context: { analysis, originalEmail: email }
        });
      }
      actionTaken = 'An Makler eskaliert - Intent unklar';
      break;
  }

  console.log(`📧 Email processed for lead ${lead.id}: ${actionTaken}`);

  return { lead, analysis, actionTaken };
}

/**
 * Get default agent for a tenant (first admin or agent)
 */
async function getDefaultAgent(tenantId: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { tenantId },
    orderBy: { role: 'asc' } // ADMIN comes before AGENT
  });
  return user?.id || null;
}

export default {
  findLeadByEmailOrName,
  analyzeEmailIntent,
  processEmailResponse
};
