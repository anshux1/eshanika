import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { externalRouter } from "./external-router";

const generator = new OpenAPIGenerator({
  converters: [new ZodToJsonSchemaConverter()],
});
const handler = new OpenAPIHandler(externalRouter);

export async function handleOpenApi(request: Request): Promise<Response> {
  if (new URL(request.url).pathname === "/api/v1/spec.json") {
    const spec = await generator.generate(externalRouter, {
      base: {
        info: { title: "Eshanika External API", version: "1.0.0" },
        servers: [{ url: "/api/v1" }],
      },
    });

    return Response.json(spec);
  }

  const { matched, response } = await handler.handle(request, {
    prefix: "/api/v1",
    context: {},
  });

  return matched ? response : new Response("Not found", { status: 404 });
}
