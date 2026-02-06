-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "branch" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "skills" TEXT[],
    "weeklyHours" INTEGER NOT NULL,
    "goalMotivation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosisResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readinessScore" DOUBLE PRECISION NOT NULL,
    "criticalGaps" TEXT[],
    "riskFactors" TEXT[],
    "prescribedTemplateId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosisResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosisResult_userId_key" ON "DiagnosisResult"("userId");
