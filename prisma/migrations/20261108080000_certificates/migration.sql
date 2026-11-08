-- Issued volunteer certificates with a public verification code (QR code on the certificate).
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hours" DECIMAL(8,2) NOT NULL,
    "activities" INTEGER NOT NULL,
    "projects" INTEGER NOT NULL DEFAULT 0,
    "peopleReached" INTEGER NOT NULL DEFAULT 0,
    "goals" JSONB NOT NULL,
    "periodStart" DATE,
    "periodEnd" DATE,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Certificate_code_key" ON "Certificate"("code");
CREATE INDEX "Certificate_userId_issuedAt_idx" ON "Certificate"("userId", "issuedAt");

ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
