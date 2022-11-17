set client_min_messages to warning;

-- DANGER: this is NOT how to do it in the real world.
-- `drop schema` INSTANTLY ERASES EVERYTHING.
drop schema "public" cascade;

create schema "public";

CREATE TABLE "public"."users" (
	"userId" serial NOT NULL,
	"username" TEXT NOT NULL UNIQUE,
	"hashedPassword" TEXT NOT NULL UNIQUE,
	CONSTRAINT "users_pk" PRIMARY KEY ("userId")
) WITH (
  OIDS=FALSE
);



CREATE TABLE "public"."games" (
	"challenger" int NOT NULL,
	"opponent" int NOT NULL,
	"state" json
) WITH (
  OIDS=FALSE
);




ALTER TABLE "games" ADD CONSTRAINT "games_fk0" FOREIGN KEY ("challenger") REFERENCES "users"("userId");
ALTER TABLE "games" ADD CONSTRAINT "games_fk1" FOREIGN KEY ("opponent") REFERENCES "users"("userId");
