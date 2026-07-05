import { apiJson } from "@/lib/api-response";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Rotary Minutes API",
    version: "1.0.0",
    description:
      "REST API for Enterprise clubs. Authenticate with Authorization: Bearer rm_live_...",
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/minutes": {
      get: {
        summary: "List minutes",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", default: "FINALIZED" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        security: [{ bearerAuth: [] }],
      },
    },
    "/minutes/{id}": {
      get: {
        summary: "Get minute detail with agenda items",
        security: [{ bearerAuth: [] }],
      },
    },
    "/meetings": {
      get: {
        summary: "List meetings",
        security: [{ bearerAuth: [] }],
      },
    },
    "/members": {
      get: {
        summary: "List members",
        security: [{ bearerAuth: [] }],
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "Club API key (rm_live_...)",
      },
    },
  },
};

export async function GET() {
  return apiJson(spec);
}