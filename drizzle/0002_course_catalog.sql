CREATE TABLE IF NOT EXISTS "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"landing_description" text,
	"price" integer NOT NULL,
	"sale_price" integer,
	"features" text[] DEFAULT '{}' NOT NULL,
	"badge" text,
	"icon" text,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL REFERENCES "public"."courses"("id") ON DELETE cascade,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL REFERENCES "public"."modules"("id") ON DELETE cascade,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"duration" text,
	"youtube_id" text,
	"notes_path" text,
	"free" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "public"."users"("id"),
	"type" text NOT NULL,
	"description" text,
	"path" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
