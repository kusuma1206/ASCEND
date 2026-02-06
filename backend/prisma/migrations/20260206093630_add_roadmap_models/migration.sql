-- CreateTable
CREATE TABLE "RoadmapTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetBatch" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadmapTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapPhase" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "phaseNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "durationWeeks" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "opportunityUnlockId" TEXT,

    CONSTRAINT "RoadmapPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapTask" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "deliverable" TEXT NOT NULL,

    CONSTRAINT "RoadmapTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoadmapProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "currentPhase" INTEGER NOT NULL DEFAULT 1,
    "completedTasks" TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActive" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRoadmapProgress_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RoadmapPhase" ADD CONSTRAINT "RoadmapPhase_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RoadmapTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapTask" ADD CONSTRAINT "RoadmapTask_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "RoadmapPhase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
