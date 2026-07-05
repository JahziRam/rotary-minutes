import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      isSuperAdmin: boolean;
      language: string;
      memberships: Array<{
        clubId: string;
        clubName: string;
        clubSlug: string;
        role: string;
      }>;
    };
  }

  interface User {
    isSuperAdmin?: boolean;
    language?: string;
    memberships?: Array<{
      clubId: string;
      clubName: string;
      clubSlug: string;
      role: string;
    }>;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isSuperAdmin?: boolean;
    language?: string;
    memberships?: Array<{
      clubId: string;
      clubName: string;
      clubSlug: string;
      role: string;
    }>;
  }
}