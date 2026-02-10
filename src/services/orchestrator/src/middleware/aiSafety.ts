import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

// ============================================
// FORBIDDEN KEYWORDS - expanded list
// ============================================
const FORBIDDEN_KEYWORDS = [
  // Illegal activities
  'hack', 'exploit', 'vulnerability', 'bypass security', 'crack password',
  'illegal', 'fraud', 'scam', 'phishing', 'malware', 'ransomware',
  // SQL injection attempts
  'drop table', 'delete from', 'truncate table', 'union select',
  'insert into', '1=1', "' or '", "'; --",
  // Code execution attempts
  'eval(', 'exec(', 'system(', '__import__', 'subprocess',
  'child_process', 'require("fs")', "require('fs')",
  // System access
  'etc/passwd', 'etc/shadow', '/proc/', '/dev/',
];

// ============================================
// PROMPT INJECTION PATTERNS - comprehensive
// ============================================
const PROMPT_INJECTION_PATTERNS = [
  // Direct instruction override
  /ignore\s+(all\s+|previous\s+|your\s+|the\s+)?(instructions|rules|guidelines|constraints|system\s*prompt)/i,
  /disregard\s+(all\s+|previous\s+|your\s+)?(instructions|rules|guidelines|constraints)/i,
  /override\s+(all\s+|previous\s+|your\s+)?(instructions|rules|settings)/i,
  // Role manipulation
  /you\s+are\s+now\s/i,
  /from\s+now\s+on\s+(you|act|behave|pretend)/i,
  /new\s+(role|personality|instructions|identity|persona)/i,
  /forget\s+(everything|your\s+role|previous|all|who\s+you)/i,
  /act\s+as\s+(if\s+|though\s+)?(you\s+)?(are|were|have)/i,
  /pretend\s+(to\s+be|you\s+are|you're)/i,
  /simulate\s+(being|a\s+)/i,
  /switch\s+to\s+(a\s+)?new\s+mode/i,
  // System prompt extraction
  /what\s+(is|are)\s+(your|the)\s+(system\s*prompt|instructions|rules|initial\s*prompt)/i,
  /show\s+me\s+(your|the)\s+(system\s*prompt|instructions|prompt|rules)/i,
  /repeat\s+(your|the)\s+(system\s*prompt|instructions|initial|full)\s*(prompt|instructions)?/i,
  /print\s+(your|the)\s+(system|initial)\s*(prompt|instructions)/i,
  /reveal\s+(your|the)\s+(system|hidden|secret)\s*(prompt|instructions)/i,
  /output\s+(your|the)\s+(system|initial)\s*prompt/i,
  // DAN / jailbreak patterns
  /\bDAN\b/,
  /do\s+anything\s+now/i,
  /jailbreak/i,
  /developer\s+mode/i,
  /unrestricted\s+mode/i,
  /no\s+(restrictions|limits|rules|boundaries)/i,
  // Delimiter injection
  /\[system\]/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /<\|im_start\|>/i,
  /### (system|instruction|human|assistant)/i,
];

// ============================================
// OUTPUT PATTERNS - things Jarvis should never say
// ============================================
const OUTPUT_BLOCK_PATTERNS = [
  // System/env info
  /process\.env\.\w+\s*=?\s*['"][^'"]+['"]/gi,
  /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
  /bearer\s+[a-zA-Z0-9._-]{20,}/gi,
  /sk-[a-zA-Z0-9]{20,}/gi, // OpenAI keys
  /AKIA[A-Z0-9]{16}/gi, // AWS keys
  // Database connection strings
  /postgres(ql)?:\/\/[^\s]+/gi,
  /mysql:\/\/[^\s]+/gi,
  /mongodb(\+srv)?:\/\/[^\s]+/gi,
  // Passwords/secrets in common formats
  /password\s*[:=]\s*['"][^'"]+['"]/gi,
  /secret\s*[:=]\s*['"][^'"]+['"]/gi,
  /token\s*[:=]\s*['"][^'"]{20,}['"]/gi,
];

// ============================================
// TOOL GUARDRAILS - dangerous operations
// ============================================
const DANGEROUS_TOOL_PATTERNS: Record<string, { maxPerMinute: number; requiresConfirmation: boolean }> = {
  'delete_lead': { maxPerMinute: 5, requiresConfirmation: true },
  'delete_property': { maxPerMinute: 3, requiresConfirmation: true },
  'delete_all_property_images': { maxPerMinute: 2, requiresConfirmation: true },
  'send_email': { maxPerMinute: 10, requiresConfirmation: false },
  'clear_expose_blocks': { maxPerMinute: 5, requiresConfirmation: false },
};

const toolCallStore: Record<string, { count: number; resetTime: number }> = {};

// ============================================
// RATE LIMIT STORE
// ============================================
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

// ============================================
// MAIN MIDDLEWARE CLASS
// ============================================
export class AiSafetyMiddleware {
  
  // Rate limiting: Max requests per user per time window
  static rateLimit(maxRequests: number = 50, windowMs: number = 60000) {
    return (req: Request, res: Response, next: NextFunction) => {
      const userId = (req as any).user?.sub || (req as any).user?.email || 'anonymous';
      const now = Date.now();
      
      if (!rateLimitStore[userId]) {
        rateLimitStore[userId] = { count: 1, resetTime: now + windowMs };
        return next();
      }

      const userLimit = rateLimitStore[userId];
      
      if (now > userLimit.resetTime) {
        userLimit.count = 1;
        userLimit.resetTime = now + windowMs;
        return next();
      }

      if (userLimit.count >= maxRequests) {
        return res.status(429).json({
          error: 'Zu viele Anfragen. Bitte warte einen Moment.',
          retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
        });
      }

      userLimit.count++;
      next();
    };
  }

  // Content moderation: Check for forbidden content + prompt injection
  static contentModeration(req: Request, res: Response, next: NextFunction) {
    const message = req.body.message || '';
    const messageLower = message.toLowerCase();

    // Check forbidden keywords
    for (const keyword of FORBIDDEN_KEYWORDS) {
      if (messageLower.includes(keyword.toLowerCase())) {
        console.warn(`[AI Safety] Blocked forbidden keyword: "${keyword}" from user ${(req as any).user?.email || 'unknown'}`);
        // Store flagged attempt (async, non-blocking)
        AiSafetyMiddleware.logFlaggedAttempt(req, 'forbidden_keyword', keyword);
        return res.status(400).json({
          error: 'Deine Anfrage enthält nicht erlaubte Inhalte.'
        });
      }
    }

    // Check prompt injection patterns
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(message)) {
        console.warn(`[AI Safety] Blocked prompt injection from user ${(req as any).user?.email || 'unknown'}: ${message.substring(0, 100)}`);
        AiSafetyMiddleware.logFlaggedAttempt(req, 'prompt_injection', pattern.source);
        return res.status(400).json({
          error: 'Deine Anfrage konnte nicht verarbeitet werden.'
        });
      }
    }

    next();
  }

  // Audit logging: Store all AI interactions in DB
  static auditLog(req: Request, res: Response, next: NextFunction) {
    const message = req.body.message || '';
    const userEmail = (req as any).user?.email || 'unknown';
    const endpoint = req.originalUrl || req.path;

    // Log to console immediately
    console.log(`[AI Audit] ${new Date().toISOString()} | User: ${userEmail} | ${endpoint} | ${message.substring(0, 100)}...`);

    // Store in DB (async, non-blocking - don't slow down the request)
    AiSafetyMiddleware.storeAuditLog(req, endpoint, message).catch(err => {
      console.error('[AI Audit] Failed to store audit log:', err.message);
    });

    next();
  }

  // Store audit log in DB
  private static async storeAuditLog(req: Request, endpoint: string, message: string) {
    try {
      const prisma = (req as any).prismaClient as PrismaClient | undefined;
      if (!prisma) return;

      const userEmail = (req as any).user?.email;
      if (!userEmail) return;

      const user = await prisma.user.findUnique({ where: { email: userEmail } });
      if (!user) return;

      await prisma.aiAuditLog.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          endpoint,
          message: message.substring(0, 5000), // Limit message length
          ipAddress: req.ip || req.socket.remoteAddress || null,
          userAgent: req.headers['user-agent']?.substring(0, 500) || null,
        }
      });
    } catch (error) {
      // Silently fail - audit logging should never break the app
    }
  }

  // Log flagged security attempts
  private static async logFlaggedAttempt(req: Request, reason: string, detail: string) {
    try {
      const prisma = (req as any).prismaClient as PrismaClient | undefined;
      if (!prisma) return;

      const userEmail = (req as any).user?.email;
      if (!userEmail) return;

      const user = await prisma.user.findUnique({ where: { email: userEmail } });
      if (!user) return;

      await prisma.aiAuditLog.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          endpoint: req.originalUrl || req.path,
          message: (req.body.message || '').substring(0, 5000),
          flagged: true,
          flagReason: `${reason}: ${detail}`,
          ipAddress: req.ip || req.socket.remoteAddress || null,
          userAgent: req.headers['user-agent']?.substring(0, 500) || null,
        }
      });
    } catch (error) {
      // Silently fail
    }
  }

  // Response sanitization: Clean AI responses
  static sanitizeResponse(text: string): string {
    let sanitized = text;
    
    // Block dangerous output patterns
    for (const pattern of OUTPUT_BLOCK_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    // Additional sanitization
    sanitized = sanitized
      .replace(/process\.env\b/gi, '[REDACTED]')
      .replace(/DATABASE_URL/gi, '[REDACTED]')
      .replace(/OPENAI_API_KEY/gi, '[REDACTED]')
      .replace(/AWS_SECRET/gi, '[REDACTED]')
      .replace(/COGNITO_/gi, '[REDACTED]');

    return sanitized;
  }

  // Tool call rate limiting - prevent mass operations
  static checkToolLimit(toolName: string, userId: string): { allowed: boolean; reason?: string } {
    const guard = DANGEROUS_TOOL_PATTERNS[toolName];
    if (!guard) return { allowed: true };

    const key = `${userId}:${toolName}`;
    const now = Date.now();

    if (!toolCallStore[key]) {
      toolCallStore[key] = { count: 1, resetTime: now + 60000 };
      return { allowed: true };
    }

    if (now > toolCallStore[key].resetTime) {
      toolCallStore[key] = { count: 1, resetTime: now + 60000 };
      return { allowed: true };
    }

    if (toolCallStore[key].count >= guard.maxPerMinute) {
      return { 
        allowed: false, 
        reason: `Tool "${toolName}" wurde zu oft aufgerufen (max ${guard.maxPerMinute}/min). Bitte warte.` 
      };
    }

    toolCallStore[key].count++;
    return { allowed: true };
  }
}

// Safety wrapper for AI responses
export function wrapAiResponse(response: string): string {
  return AiSafetyMiddleware.sanitizeResponse(response);
}
