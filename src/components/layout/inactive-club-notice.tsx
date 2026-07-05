import { SignOutButton } from "@/components/auth/sign-out-button";

export function InactiveClubNotice({
  clubName,
  logoutLabel,
}: {
  clubName: string;
  logoutLabel: string;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <span className="text-amber-700 text-xl font-bold">!</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Club désactivé</h1>
        <p className="text-sm text-gray-500">
          L&apos;accès au club <strong>{clubName}</strong> a été suspendu.
          Contactez l&apos;administrateur de la plateforme pour plus d&apos;informations.
        </p>
        <SignOutButton label={logoutLabel} />
      </div>
    </div>
  );
}