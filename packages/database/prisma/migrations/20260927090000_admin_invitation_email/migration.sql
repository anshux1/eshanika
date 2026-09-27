ALTER TABLE "AdminInvitation" RENAME COLUMN "phoneNumber" TO "email";

CREATE INDEX "AdminInvitation_email_idx" ON "AdminInvitation"("email");
CREATE INDEX "AdminInvitation_invitedByUserId_idx" ON "AdminInvitation"("invitedByUserId");
CREATE INDEX "AdminInvitation_acceptedByUserId_idx" ON "AdminInvitation"("acceptedByUserId");
CREATE INDEX "AdminInvitation_createdAt_idx" ON "AdminInvitation"("createdAt");

ALTER TABLE "AdminInvitation"
ADD CONSTRAINT "AdminInvitation_invitedByUserId_fkey"
FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "AdminInvitation"
ADD CONSTRAINT "AdminInvitation_acceptedByUserId_fkey"
FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
