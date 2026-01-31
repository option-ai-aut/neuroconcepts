import { Request, Response, NextFunction } from 'express';

// Forbidden keywords that indicate potentially harmful requests
const FORBIDDEN_KEYWORDS = [
  // Illegal activities
  'hack', 'exploit', 'vulnerability', 'bypass', 'crack',
  'illegal', 'fraud', 'scam', 'phishing',
  // Attempts to break out of system
  'ignore previous instructions', 'disregard system prompt',
  'you are now', 'forget your role', 'new instructions',
  // SQL injection attempts
  'drop table', 'delete from', 'truncate', 'union select',
  // Code execution attempts
  'eval(', 'exec(', 'system(', 'shell',
];

// Patterns that indicate prompt injection attempts
const PROMPT_INJECTION_PATTERNS = [
  /ignore (all |previous |your )?instructions/i,
  /disregard (all |previous |your )?(instructions|rules|guidelines)/i,
  /you are now/i,
  /new (role|personality|instructions)/i,
  /forget (everything|your role|previous)/i,
  /act as (if |though )?you (are|were)/i,
];

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

export class AiSafetyMiddleware {
  // Rate limiting: Max requests per user per time window
  static rateLimit(maxRequests: number = 50, windowMs: number = 60000) {
    return (req: Request, res: Response, next: NextFunction) => {
      const userId = req.body.userId || req.headers['x-user-id'] || 'anonymous';
      const now = Date.now();
      
      if (!rateLimitStore[userId]) {
        rateLimitStore[userId] = {
          count: 1,
          resetTime: now + windowMs
        };
        return next();
      }

      const userLimit = rateLimitStore[userId];
      
      // Reset if window expired
      if (now > userLimit.resetTime) {
        userLimit.count = 1;
        userLimit.resetTime = now + windowMs;
        return next();
      }

      // Check if limit exceeded
      if (userLimit.count >= maxRequests) {
        return res.status(429).json({
          error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.',
          retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
        });
      }

      userLimit.count++;
      next();
    };
  }

  // Content moderation: Check for forbidden content
  static contentModeration(req: Request, res: Response, next: NextFunction) {
    const message = req.body.message?.toLowerCase() || '';

    // Check for forbidden keywords
    for (const keyword of FORBIDDEN_KEYWORDS) {
      if (message.includes(keyword.toLowerCase())) {
        console.warn(`[AI Safety] Blocked message with forbidden keyword: ${keyword}`);
        return res.status(400).json({
          error: 'Ihre Anfrage enthält nicht erlaubte Inhalte.'
        });
      }
    }

    // Check for prompt injection attempts
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(message)) {
        console.warn(`[AI Safety] Blocked potential prompt injection attempt`);
        return res.status(400).json({
          error: 'Ihre Anfrage konnte nicht verarbeitet werden.'
        });
      }
    }

    next();
  }

  // Tenant isolation: Ensure user can only access their tenant's data
  static tenantIsolation(req: Request, res: Response, next: NextFunction) {
    const { tenantId, userId } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant ID fehlt.'
      });
    }

    // TODO: Verify that userId belongs to tenantId
    // This should check against the database
    // For now, we trust the frontend to send the correct tenantId

    next();
  }

  // Audit logging: Log all AI interactions
  static auditLog(req: Request, res: Response, next: NextFunction) {
    const { message, userId, tenantId } = req.body;
    const timestamp = new Date().toISOString();

    console.log(`[AI Audit] ${timestamp} | User: ${userId} | Tenant: ${tenantId} | Message: ${message?.substring(0, 100)}...`);

    // TODO: Store in database for compliance
    // await prisma.aiAuditLog.create({
    //   data: { userId, tenantId, message, timestamp }
    // });

    next();
  }

  // Response sanitization: Clean AI responses before sending
  static sanitizeResponse(text: string): string {
    // Remove any potential system information leaks
    const sanitized = text
      .replace(/process\.env/gi, '[REDACTED]')
      .replace(/api[_-]?key/gi, '[REDACTED]')
      .replace(/password/gi, '[REDACTED]')
      .replace(/secret/gi, '[REDACTED]');

    return sanitized;
  }
}

// Safety wrapper for AI responses
export function wrapAiResponse(response: string): string {
  return AiSafetyMiddleware.sanitizeResponse(response);
}
