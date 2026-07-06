export function wrapBrandedEmail(
  bodyHtml: string,
  opts: { clubName: string; logoUrl?: string }
): string {
  const logoBlock = opts.logoUrl
    ? `<div style="margin-bottom:20px"><img src="${opts.logoUrl}" alt="${opts.clubName}" height="48" style="height:48px;width:auto;max-width:200px;object-fit:contain" /></div>`
    : "";

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;font-family:Inter,system-ui,sans-serif;font-size:15px;line-height:1.6;color:#0f172a">
    ${logoBlock}
    <div>${bodyHtml}</div>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 16px" />
    <p style="margin:0;font-size:12px;color:#94a3b8">${opts.clubName} · Rotary Minutes</p>
  </div>
</body>
</html>`;
}