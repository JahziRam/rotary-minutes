import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
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
          where: { email: credentials.email as string },
          include: {
            memberships: {
              where: { isActive: true },
              include: { club: true },
            },
          },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          image: user.image,
          isSuperAdmin: user.isSuperAdmin,
          language: user.language,
          memberships: user.memberships.map((m) => ({
            clubId: m.clubId,
            clubName: m.club.name,
            clubSlug: m.club.slug,
            role: m.role,
          })),
        };
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
          user as {
            memberships?: Array<{
              clubId: string;
              clubName: string;
              clubSlug: string;
              role: string;
            }>;
          }
        ).memberships;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isSuperAdmin = token.isSuperAdmin as boolean;
        session.user.language = token.language as string;
        session.user.memberships = token.memberships as Array<{
          clubId: string;
          clubName: string;
          clubSlug: string;
          role: string;
        }>;
      }
      return session;
    },
  },
});