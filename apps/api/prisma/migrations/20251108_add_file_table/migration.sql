-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimetype" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "channelId" TEXT,
    "serverId" TEXT,
    "isImage" BOOLEAN NOT NULL DEFAULT false,
    "isVideo" BOOLEAN NOT NULL DEFAULT false,
    "thumbnailUrl" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "files_uploaderId_idx" ON "files"("uploaderId");

-- CreateIndex
CREATE INDEX "files_channelId_idx" ON "files"("channelId");

-- CreateIndex
CREATE INDEX "files_serverId_idx" ON "files"("serverId");

-- CreateIndex
CREATE INDEX "files_createdAt_idx" ON "files"("createdAt");

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Message - Add fileId
ALTER TABLE "messages" ADD COLUMN "fileId" TEXT;

-- CreateIndex
CREATE INDEX "messages_fileId_idx" ON "messages"("fileId");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable DirectMessage - Add fileId
ALTER TABLE "direct_messages" ADD COLUMN "fileId" TEXT;

-- CreateIndex
CREATE INDEX "direct_messages_fileId_idx" ON "direct_messages"("fileId");

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

