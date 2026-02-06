const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Logs a user activity to the unified timeline.
 * @param {string} userId - The ID of the user.
 * @param {string} module - The module name (Resume, Technical, Communication, MockInterview, Roadmap, Opportunities).
 * @param {string} action - The specific action type (UPLOAD, COMPLETE, GENERATE, SAVE, APPLY).
 * @param {string} summary - Human-readable summary for the dashboard.
 * @param {number} [score] - Optional numeric score.
 * @param {string} [status] - Status of the activity (COMPLETED, FAILED, IN_PROGRESS).
 * @param {object} [metadata] - Optional JSON metadata.
 */
async function logActivity(userId, module, action, summary, score = null, status = 'COMPLETED', metadata = {}) {
  try {
    if (!userId) {
      console.warn("Skipping activity log: No userId provided");
      return;
    }

    await prisma.activityLog.create({
      data: {
        userId,
        module,
        action,
        summary,
        score: score ? parseFloat(score) : null,
        status,
        metadata
      }
    });
    console.log(`[ActivityLog] ${module} - ${action}: ${summary}`);
  } catch (error) {
    console.error(`[ActivityLog] Failed to log activity for ${module}:`, error.message);
    // Non-blocking: Don't throw logic errors just because logging failed
  }
}

module.exports = { logActivity };
