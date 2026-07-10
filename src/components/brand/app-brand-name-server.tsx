import { getAppName, splitAppBrandName } from "@/lib/app-settings";

export async function AppBrandNameServer({
  className,
  accentClassName = "text-gold",
  variant = "split",
}: {
  className?: string;
  accentClassName?: string;
  variant?: "split" | "single";
}) {
  const name = await getAppName();

  if (variant === "single") {
    return <span className={className}>{name}</span>;
  }

  const { lead, accent } = splitAppBrandName(name);
  if (!accent) {
    return <span className={className}>{lead}</span>;
  }

  return (
    <span className={className}>
      {lead} <span className={accentClassName}>{accent}</span>
    </span>
  );
}