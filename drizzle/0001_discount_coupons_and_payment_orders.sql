ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trial_course_id" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discount_coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"amount_off" integer NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"used_by" text,
	"used_at" timestamp,
	"reserved_by" uuid,
	"reserved_at" timestamp,
	"reserved_order_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discount_coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"razorpay_order_id" text NOT NULL,
	"razorpay_payment_id" text,
	"user_id" uuid NOT NULL,
	"course_id" text NOT NULL,
	"base_amount" integer NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"amount" integer NOT NULL,
	"coupon_id" uuid,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp,
	CONSTRAINT "payment_orders_razorpay_order_id_unique" UNIQUE("razorpay_order_id"),
	CONSTRAINT "payment_orders_razorpay_payment_id_unique" UNIQUE("razorpay_payment_id")
);
--> statement-breakpoint
ALTER TABLE "discount_coupons" ADD CONSTRAINT "discount_coupons_reserved_by_users_id_fk" FOREIGN KEY ("reserved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_coupon_id_discount_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."discount_coupons"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discount_coupons_status_idx" ON "discount_coupons" ("is_used", "is_revoked", "reserved_at");
