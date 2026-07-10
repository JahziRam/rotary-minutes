import { describe, expect, it } from "vitest";
import {
  buildPaginatedResult,
  buildListQueryString,
  parseListParams,
} from "./server-list";

describe("parseListParams", () => {
  it("parses page and search query", () => {
    const params = parseListParams({ q: "dupont", page: "2", pageSize: "10" });
    expect(params.q).toBe("dupont");
    expect(params.page).toBe(2);
    expect(params.pageSize).toBe(10);
    expect(params.skip).toBe(10);
    expect(params.take).toBe(10);
  });

  it("clamps invalid values", () => {
    const params = parseListParams({ page: "-3", pageSize: "999" });
    expect(params.page).toBe(1);
    expect(params.pageSize).toBe(100);
  });
});

describe("buildPaginatedResult", () => {
  it("computes range metadata", () => {
    const result = buildPaginatedResult(["a", "b"], 25, 2, 10);
    expect(result.totalPages).toBe(3);
    expect(result.start).toBe(11);
    expect(result.end).toBe(20);
    expect(result.items).toEqual(["a", "b"]);
  });
});

describe("buildListQueryString", () => {
  it("omits page 1 from query string", () => {
    expect(buildListQueryString({ q: "test", page: undefined })).toBe("?q=test");
    expect(buildListQueryString({ q: "test" }, { page: "2" })).toBe("?q=test&page=2");
  });
});