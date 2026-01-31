import { CognitoJwtVerifier } from "aws-jwt-verify";
import { Request, Response, NextFunction } from "express";

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
        address?: string;
        'custom:company_name'?: string;
        'custom:employee_count'?: string;
        'cognito:groups'?: string[];
      };
    }
  }
}

let verifier: any;

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
        tokenUse: "id", // or "access"
        clientId: process.env.CLIENT_ID!,
      });
    }

    const payload = await verifier.verify(token);
    req.user = payload as any;
    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};
