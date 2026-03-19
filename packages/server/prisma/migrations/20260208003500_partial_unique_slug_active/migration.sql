-- Replace global slug uniqueness with active-status uniqueness
DROP INDEX "SketchRequest_slug_key";

CREATE UNIQUE INDEX "SketchRequest_slug_active_key"
ON "SketchRequest"("slug")
WHERE "status" IN ('PENDING', 'APPROVED');