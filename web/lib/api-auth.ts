import { NextResponse } from "next/server";
import { getCurrentUser, type TokenPayload } from "./auth";

type AuthResult =
  | { user: TokenPayload; error: null }
  | { user: null; error: NextResponse };

export async function requireAuth(request: Request): Promise<AuthResult> {
  const user = await getCurrentUser(request);
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "未登录" }, { status: 401 }),
    };
  }
  return { user, error: null };
}
