"use client";

import { formatPersonName } from "@/lib/format-person-name";

export type OfficerMemberOption = {
  id: string;
  firstName: string;
  lastName: string;
};

function memberLabel(m: OfficerMemberOption) {
  return formatPersonName(m.firstName, m.lastName);
}

/**
 * Select for meeting officers (presidedBy / secretary).
 * Keeps free-text values that are not in the member roster as an extra option.
 */
export function OfficerSelect({
  label,
  value,
  onChange,
  members,
  disabled,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  members: OfficerMemberOption[];
  disabled?: boolean;
  id?: string;
}) {
  const options = members.map((m) => memberLabel(m)).filter(Boolean);
  const uniqueOptions = [...new Set(options)];
  const trimmed = value.trim();
  const hasCurrent =
    !trimmed || uniqueOptions.some((o) => o.toLowerCase() === trimmed.toLowerCase());

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">—</option>
        {!hasCurrent && trimmed ? (
          <option value={value}>{value}</option>
        ) : null}
        {uniqueOptions.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      {!disabled ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={label}
          className="flex h-9 w-full rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 text-xs text-gray-700 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
          aria-label={`${label} (texte libre)`}
        />
      ) : null}
    </div>
  );
}
