-- First-run onboarding marker. Existing users are treated as already onboarded.
ALTER TABLE "UserProfile" ADD COLUMN "onboardedAt" TIMESTAMP(3);
UPDATE "UserProfile" SET "onboardedAt" = "createdAt";
