-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "batchReach" TEXT[],
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "stipendReward" TEXT NOT NULL,
    "deadlineApp" TIMESTAMP(3),
    "deadlineEvent" TIMESTAMP(3),
    "difficulty" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "requirements" JSONB NOT NULL,
    "intelligence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);
