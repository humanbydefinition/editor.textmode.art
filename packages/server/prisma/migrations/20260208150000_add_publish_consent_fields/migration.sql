-- Add consent evidence fields for gallery publish submissions
ALTER TABLE "SketchRequest"
ADD COLUMN "publishConsentAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "publishConsentAcceptedAt" TIMESTAMP(3),
ADD COLUMN "publishConsentPolicyVersion" TEXT;
