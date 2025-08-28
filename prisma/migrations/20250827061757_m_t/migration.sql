-- CreateTable
CREATE TABLE "public"."_PlayerTo" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_PlayerTo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PlayerTo_B_index" ON "public"."_PlayerTo"("B");

-- AddForeignKey
ALTER TABLE "public"."_PlayerTo" ADD CONSTRAINT "_PlayerTo_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PlayerTo" ADD CONSTRAINT "_PlayerTo_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."TradePlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
