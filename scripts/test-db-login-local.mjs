import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

const email = "superadmin@rotaryminutes.app";
const password = "RotaryAdmin2026!";

async function main() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":***@"));

  const { PrismaClient } = await import("../src/generated/prisma/client.ts");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("DB: connexion OK");

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, isSuperAdmin: true },
    });

    if (!user) {
      console.log("Utilisateur seed introuvable — lancer: npm run db:seed");
      process.exit(1);
    }

    const valid = user.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    console.log("Super admin:", user.isSuperAdmin ? "oui" : "non");
    console.log("Mot de passe seed:", valid ? "OK" : "INVALIDE");
  } catch (error) {
    console.error("DB: ECHEC —", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();