-- DropForeignKey
ALTER TABLE "Feedback" DROP CONSTRAINT "Feedback_ideaId_fkey";

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
