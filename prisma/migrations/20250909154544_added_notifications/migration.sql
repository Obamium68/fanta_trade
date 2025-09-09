-- CreateTable
CREATE TABLE "public"."PushSubscription" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationPreference" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "tradeProposed" BOOLEAN NOT NULL DEFAULT true,
    "tradeAccepted" BOOLEAN NOT NULL DEFAULT true,
    "tradeRejected" BOOLEAN NOT NULL DEFAULT true,
    "tradeApproved" BOOLEAN NOT NULL DEFAULT true,
    "newTradeReceived" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_teamId_endpoint_key" ON "public"."PushSubscription"("teamId", "endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_teamId_key" ON "public"."NotificationPreference"("teamId");

-- AddForeignKey
ALTER TABLE "public"."PushSubscription" ADD CONSTRAINT "PushSubscription_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationPreference" ADD CONSTRAINT "NotificationPreference_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
