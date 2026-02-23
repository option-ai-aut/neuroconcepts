import { CognitoJwtVerifier } from "aws-jwt-verify";
import { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        email: string;
        given_name?: string;
        family_name?: string;
        phone_number?: string;
        address?: string | { formatted?: string };
        'custom:company_name'?: string;
        'custom:employee_count'?: string;
        'custom:postal_code'?: string;
        'custom:city'?: string;
        'custom:country'?: string;
        'cognito:groups'?: string[];
      };
      isAdmin?: boolean;
    }
  }
}

let verifier: any;
let adminVerifier: any;

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];

    if (!verifier) {
      verifier = CognitoJwtVerifier.create({
        userPoolId: process.env.USER_POOL_ID!,
        tokenUse: "id",
        clientId: process.env.CLIENT_ID!,
      });
    }

    const payload = await verifier.verify(token);
    // Normalize email to lowercase to ensure case-insensitive auth
    if (payload.email) (payload as any).email = (payload.email as string).toLowerCase().trim();
    req.user = payload as any;
    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};

/**
 * Admin auth middleware - validates tokens against the Admin User Pool.
 * Used for /admin/* API routes that should only be accessible by platform admins.
 */
/**
 * Middleware for internal service-to-service calls (e.g. email-parser -> orchestrator).
 * Validates a shared secret passed via X-Internal-Secret header.
 */
export const verifyInternalSecret = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.headers['x-internal-secret'];
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) {
    console.error('INTERNAL_API_SECRET not configured');
    return res.status(500).json({ error: 'Internal auth not configured' });
  }
  const secretStr = Array.isArray(secret) ? secret[0] : String(secret ?? '');
  const secretBuf = Buffer.from(secretStr);
  const expectedBuf = Buffer.from(expected);
  if (!secret || secretBuf.length !== expectedBuf.length || !timingSafeEqual(secretBuf, expectedBuf)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export const adminAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];

    if (!adminVerifier) {
      const adminUserPoolId = process.env.ADMIN_USER_POOL_ID;
      const adminClientId = process.env.ADMIN_CLIENT_ID;

      if (!adminUserPoolId || !adminClientId) {
        console.error("ADMIN_USER_POOL_ID or ADMIN_CLIENT_ID not configured");
        return res.status(500).json({ error: "Admin auth not configured" });
      }

      adminVerifier = CognitoJwtVerifier.create({
        userPoolId: adminUserPoolId,
        tokenUse: "id",
        clientId: adminClientId,
      });
    }

    const payload = await adminVerifier.verify(token);
    req.user = payload as any;
    req.isAdmin = true;
    next();
  } catch (err) {
    console.error("Admin token verification failed:", err);
    return res.status(401).json({ error: "Invalid admin token" });
  }
};
