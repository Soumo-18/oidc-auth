CREATE TABLE "applications" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"name" varchar(300) NOT NULL,
	"url" text,
	"redirect_uri" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authorization_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(300) NOT NULL,
	"client_id" varchar(50) NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "authorization_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(25),
	"last_name" varchar(25),
	"profile_image_url" text,
	"email" varchar(322) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password" varchar(66),
	"salt" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
