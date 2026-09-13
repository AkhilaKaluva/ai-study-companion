import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";

export const SESSION_COOKIE_NAME = "study_session";
const SESSION_DURATION_DAYS = 7;

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  });

  return token;
}

export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      await prisma.session.deleteMany({
        where: { token },
      });
      cookieStore.delete(SESSION_COOKIE_NAME);
    }
  } catch (err) {
    console.error("Error destroying session:", err);
  }
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    if (new Date() > session.expiresAt) {
      await prisma.session.delete({ where: { id: session.id } });
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role as "student" | "admin",
    };
  } catch (err: any) {
    if (err?.digest === "DYNAMIC_SERVER_USAGE" || err?.message?.includes("Dynamic server usage")) {
      throw err;
    }
    console.error("Error verifying current user session:", err);
    return null;
  }
}

export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return user;
}
