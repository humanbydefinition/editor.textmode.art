-- CreateEnum
CREATE TYPE "SketchStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateTable
CREATE TABLE "SketchRequest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "SketchStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "authorName" TEXT,
    "socialLinks" JSONB,
    "textmodeCode" TEXT NOT NULL,
    "strudelCode" TEXT,
    "ogImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "denialReason" TEXT,

    CONSTRAINT "SketchRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SketchRequest_slug_key" ON "SketchRequest"("slug");
