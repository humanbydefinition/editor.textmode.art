-- Remove the deprecated Strudel code column from sketch submissions
ALTER TABLE "SketchRequest"
DROP COLUMN "strudelCode";
