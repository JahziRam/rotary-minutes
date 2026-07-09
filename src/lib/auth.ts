import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export type SessionMembership = {
  clubId: string;
  clubName: string;
  clubSlug: string;
  role: string;
};

export type SessionPendingJoin = {
  clubId: string;
  clubName: string;
};

async function loadUserSessionData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: { isActive: true, approvalStatus: "APPROVED" },
        include: { club: { select: { name: true, slug: true } } },
      },
    },
  });

  if (!user) return null;

  const pendingMembership = await prisma.clubMembership.findFirst({
    where: { userId, approvalStatus: "PENDING" },
    include: { club: { select: { id: true, name: true } } },
    orderBy: { joinedAt: "desc" },
  });

  const memberships: SessionMembership[] = user.memberships.map((m) => ({
    clubId: m.clubId,
    clubName: m.club.name,
    clubSlug: m.club.slug,
    role: m.role,
  }));

  const pendingJoin: SessionPendingJoin | null = pendingMembership
    ? {
        clubId: pendingMembership.club.id,
        clubName: pendingMembership.club.name,
      }
    : null;

  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    image: user.image,
    isSuperAdmin: user.isSuperAdmin,
    language: user.language,
    memberships,
    pendingJoin,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: (credentials.email as string).trim().toLowerCase() },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        return loadUserSessionData(user.id);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isSuperAdmin = (user as { isSuperAdmin?: boolean }).isSuperAdmin;
        token.language = (user as { language?: string }).language;
        token.memberships = (
          user as { memberships?: SessionMembership[] }
        ).memberships;
        token.pendingJoin = (
          user as { pendingJoin?: SessionPendingJoin | null }
        ).pendingJoin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        const fresh = await loadUserSessionData(token.id as string);
        if (fresh) {
          session.user.id = fresh.id;
          session.user.isSuperAdmin = fresh.isSuperAdmin;
          session.user.language = fresh.language;
          session.user.memberships = fresh.memberships;
          session.user.pendingJoin = fresh.pendingJoin;
        } else {
          session.user.id = token.id as string;
          session.user.isSuperAdmin = token.isSuperAdmin as boolean;
          session.user.language = token.language as string;
          session.user.memberships = (token.memberships ?? []) as SessionMembership[];
          session.user.pendingJoin = (token.pendingJoin ?? null) as SessionPendingJoin | null;
        }
      }
      return session;
    },
  },
});