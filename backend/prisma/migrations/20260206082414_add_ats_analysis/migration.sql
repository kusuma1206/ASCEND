-- CreateTable
CREATE TABLE "AtsAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "filename" TEXT NOT NULL,
    "parsedSections" JSONB NOT NULL,
    "targetRole" TEXT NOT NULL,
    "atsScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtsAnalysis_pkey" PRIMARY KEY ("id")
);
