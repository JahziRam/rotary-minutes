import { NextResponse } from "next/server";

export function apiJson<T>(data: T, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "X-API-Version": "1" },
  });
}

export function apiError(
  code: string,
  message: string,
  status: number
) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "X-API-Version": "1" } }
  );
}