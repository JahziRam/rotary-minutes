"use client";

type MemberOption = { id: string; firstName: string; lastName: string };
type CommissionOption = { id: string; name: string };

export function AssigneePicker({
  members,
  commissions,
  selectedMemberIds,
  commissionId,
  onMembersChange,
  onCommissionChange,
  membersLabel,
  commissionLabel,
  noCommissionLabel,
  className,
}: {
  members: MemberOption[];
  commissions: CommissionOption[];
  selectedMemberIds: string[];
  commissionId: string;
  onMembersChange: (ids: string[]) => void;
  onCommissionChange: (id: string) => void;
  membersLabel: string;
  commissionLabel: string;
  noCommissionLabel: string;
  className?: string;
}) {
  function toggleMember(id: string) {
    if (selectedMemberIds.includes(id)) {
      onMembersChange(selectedMemberIds.filter((x) => x !== id));
    } else {
      onMembersChange([...selectedMemberIds, id]);
    }
  }

  return (
    <div className={className ?? "space-y-2"}>
      <label className="space-y-1 block">
        <span className="text-sm font-medium text-gray-700">{commissionLabel}</span>
        <select
          className="flex h-10 w-full rounded-lg border border-gray-200 px-3 text-sm bg-white"
          value={commissionId}
          onChange={(e) => onCommissionChange(e.target.value)}
        >
          <option value="">{noCommissionLabel}</option>
          {commissions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <div className="space-y-1">
        <span className="text-sm font-medium text-gray-700">{membersLabel}</span>
        <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 space-y-1">
          {members.length === 0 ? (
            <p className="text-xs text-gray-400 px-1">—</p>
          ) : (
            members.map((m) => {
              const checked = selectedMemberIds.includes(m.id);
              return (
                <label
                  key={m.id}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 rounded px-1 py-0.5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMember(m.id)}
                    className="rounded border-gray-300"
                  />
                  <span>
                    {m.firstName} {m.lastName}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function formatAssigneeLabel(
  assignees: Array<{ firstName: string; lastName: string }>,
  commissionName: string | null | undefined,
  fallback: string
): string {
  const names = assignees.map((a) => `${a.firstName} ${a.lastName}`);
  if (commissionName && names.length > 0) {
    return `${commissionName} · ${names.join(", ")}`;
  }
  if (commissionName) return commissionName;
  if (names.length > 0) return names.join(", ");
  return fallback;
}
