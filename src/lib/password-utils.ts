import { randomBytes } from "node:crypto";

export const PASSWORD_MIN_LENGTH = 8;

export function generateTempPassword(): string {
  return randomBytes(12).toString("base64url").slice(0, 16);
}

export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

export function isPasswordStrong(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH;
}