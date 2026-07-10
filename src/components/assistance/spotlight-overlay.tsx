"use client";

export function SpotlightOverlay({ rect }: { rect: DOMRect | null }) {
  if (!rect) {
    return (
      <div
        className="fixed inset-0 z-[199] bg-navy/65 motion-reduce:transition-none"
        aria-hidden
      />
    );
  }

  const pad = 6;
  const top = Math.max(0, rect.top - pad);
  const left = Math.max(0, rect.left - pad);
  const width = rect.width + pad * 2;
  const height = rect.height + pad * 2;

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[199] bg-navy/65" style={{ height: top }} aria-hidden />
      <div
        className="fixed left-0 z-[199] bg-navy/65"
        style={{ top, width: left, height }}
        aria-hidden
      />
      <div
        className="fixed z-[199] bg-navy/65"
        style={{ top, left: left + width, right: 0, height }}
        aria-hidden
      />
      <div
        className="fixed inset-x-0 bottom-0 z-[199] bg-navy/65"
        style={{ top: top + height }}
        aria-hidden
      />
      <div
        className="fixed z-[200] rounded-lg ring-4 ring-gold pointer-events-none motion-reduce:transition-none"
        style={{ top, left, width, height }}
        aria-hidden
      />
    </>
  );
}