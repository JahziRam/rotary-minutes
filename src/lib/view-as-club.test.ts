import { describe, expect, it } from "vitest";
import { VIEW_AS_CLUB_COOKIE, viewAsClubCookieOptions } from "./view-as-club";

describe("view-as-club", () => {
  it("exposes stable cookie name", () => {
    expect(VIEW_AS_CLUB_COOKIE).toBe("rm_view_as_club");
  });

  it("sets secure cookie defaults", () => {
    const opts = viewAsClubCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
    expect(opts.maxAge).toBeGreaterThan(0);
  });
});