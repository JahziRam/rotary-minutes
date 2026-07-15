"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { CompanyLegalFooter } from "@/components/legal/company-legal-footer";
import { AppBrandName } from "@/components/brand/app-brand-name";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  const locale = useLocale();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="h-1 bg-gold" />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href={`/${locale}`} className="font-display text-2xl font-bold text-navy">
              <AppBrandName />
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
      <CompanyLegalFooter />
    </div>
  );
}