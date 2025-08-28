/*
  Warnings:
  - You are about to drop the column `playerFromId` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `playerToId` on the `Trade` table. All the data in the column will be lost.
*/

-- CreateEnum
CREATE TYPE "TradeDirection" AS ENUM ('FROM', 'TO');

-- DropForeignKey
ALTER TABLE "Trade" DROP CONSTRAINT "Trade_playerFromId_fkey";

-- DropForeignKey
ALTER TABLE "Trade" DROP CONSTRAINT "Trade_playerToId_fkey";

-- AlterTable
ALTER TABLE "Trade" DROP COLUMN "playerFromId",
DROP COLUMN "playerToId";

-- CreateTable
CREATE TABLE "TradePlayer" (
    "id" SERIAL NOT NULL,
    "tradeId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "direction" "TradeDirection" NOT NULL,

    CONSTRAINT "TradePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradePlayer_tradeId_playerId_key" ON "TradePlayer"("tradeId", "playerId");

-- AddForeignKey
ALTER TABLE "TradePlayer" ADD CONSTRAINT "TradePlayer_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradePlayer" ADD CONSTRAINT "TradePlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;