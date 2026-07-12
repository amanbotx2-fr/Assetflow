CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "avatar_url" TEXT,
    "display_name" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'SYSTEM',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "language" TEXT NOT NULL DEFAULT 'en',
    "notification_preferences" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "system_settings_category_idx" ON "system_settings"("category");
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");
CREATE INDEX "user_preferences_theme_idx" ON "user_preferences"("theme");

ALTER TABLE "user_preferences"
ADD CONSTRAINT "user_preferences_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
