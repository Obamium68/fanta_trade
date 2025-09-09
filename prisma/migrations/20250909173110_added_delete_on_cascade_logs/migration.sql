-- DropForeignKey
ALTER TABLE "public"."TradeLog" DROP CONSTRAINT "TradeLog_tradeId_fkey";

-- AddForeignKey
ALTER TABLE "public"."TradeLog" ADD CONSTRAINT "TradeLog_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "public"."Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
