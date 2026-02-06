-- CreateTable
CREATE TABLE "CommunicationTest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "resultLabel" TEXT,
    "overallFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationTaskResult" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "sentenceCount" INTEGER NOT NULL,
    "connectorCount" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationTaskResult_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CommunicationTaskResult" ADD CONSTRAINT "CommunicationTaskResult_testId_fkey" FOREIGN KEY ("testId") REFERENCES "CommunicationTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
