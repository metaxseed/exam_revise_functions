import * as jose from "https://deno.land/x/jose@v4.13.0/index.ts";

const JWT_SECRET = Deno.env.get("JWT_SECRET");

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET environment variable");
}

// Convert JWT_SECRET to Uint8Array as required by jose
const secretKeyUint8 = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  iss?: string;
  aud?: string;
  exp?: number;
}

export class AuthError extends Error {
  constructor(message: string, public status = 401) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function verifyJWT(req: Request): Promise<JWTPayload> {
  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      throw new AuthError("Missing Authorization header");
    }

    const [bearer, token] = authHeader.split(" ");

    if (bearer !== "Bearer" || !token) {
      throw new AuthError("Invalid Authorization header format");
    }

    const { payload } = await jose.jwtVerify(token, secretKeyUint8, {
      issuer: "https://bsmlzmutyifbnahapupl.supabase.co",  // Change this to match your Supabase project
      audience: "https://bsmlzmutyifbnahapupl.supabase.co/auth/v1", // Change this to match your Supabase project
    });

    return payload as JWTPayload;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    if (error instanceof Error && (error as any).code === 'ERR_JWT_EXPIRED') {
      throw new AuthError('JWT token has expired');
    }
    throw new AuthError('Invalid JWT token');
  }
}

// Helper function to create a JWT (useful for testing)
export async function createJWT(payload: Partial<JWTPayload>): Promise<string> {
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('https://bsmlzmutyifbnahapupl.supabase.co')
    .setAudience('https://bsmlzmutyifbnahapupl.supabase.co/auth/v1')
    .setExpirationTime('2h')
    .sign(secretKeyUint8);
  
  return jwt;
}
