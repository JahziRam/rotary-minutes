export function getMinuteStatusLabel(
  status: string,
  t: (key: string) => string
): string {
  switch (status) {
    case "FINALIZED":
      return t("minutes.finalized");
    case "ARCHIVED":
      return t("minutes.archived");
    case "IN_PROGRESS":
      return t("minutes.draft");
    case "REVIEW":
      return t("minutes.inReview");
    default:
      return t("minutes.draft");
  }
}

export function getMinuteStatusVariant(
  status: string
): "success" | "warning" | "muted" | "default" {
  switch (status) {
    case "FINALIZED":
      return "success";
    case "ARCHIVED":
      return "muted";
    case "IN_PROGRESS":
    case "REVIEW":
      return "default";
    default:
      return "warning";
  }
}