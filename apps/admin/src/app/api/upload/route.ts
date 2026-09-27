import { RejectUpload, type Router, route } from "@better-upload/server";
import { toRouteHandler } from "@better-upload/server/adapters/next";
import { getActiveAdmin } from "@eshanika/auth/membership";
import { auth, trustedOrigins } from "@eshanika/auth/server";
import { getIdriveE2, getIdriveE2Bucket } from "@/lib/idrive-e2";
import { hasPermission } from "@/orpc/permissions";

const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];

async function handleUpload(request: Request) {
  const router: Router = {
    client: getIdriveE2(),
    bucketName: getIdriveE2Bucket(),
    routes: {
      images: route({
        multipleFiles: true,
        maxFiles: 10,
        maxFileSize: 10 * 1024 * 1024,
        fileTypes: imageTypes,
        onBeforeUpload: async ({ req }) => {
          const origin = req.headers.get("origin");
          if (!origin || !trustedOrigins.includes(origin)) {
            throw new RejectUpload("Upload origin is not allowed");
          }
          const session = await auth.api.getSession({ headers: req.headers });
          if (!session) throw new RejectUpload("Sign in to upload images");
          const admin = await getActiveAdmin(session.user.id);
          if (!admin || !hasPermission(admin.membershipRole, "catalog.write")) {
            throw new RejectUpload("You cannot upload images");
          }
          return {
            generateObjectInfo: ({ file }: { file: { type: string } }) => ({
              key: `media/${crypto.randomUUID()}.${file.type.split("/")[1]}`,
            }),
          };
        },
      }),
    },
  };
  return toRouteHandler(router).POST(request);
}

export const POST = handleUpload;
