import { notInArray } from "drizzle-orm";
import {
  uuid,  pgTable,
  varchar,  text,
  boolean,  timestamp,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {

  id: uuid("id").primaryKey().defaultRandom(),

  firstName: varchar("first_name", { length: 25 }),

  lastName: varchar("last_name", { length: 25 }),

  profileImageURL: text("profile_image_url"),

  email: varchar("email", { length: 322 }).notNull(),

  emailVerified: boolean("email_verified").default(false).notNull(),

  password: varchar("password", { length: 66 }),

  salt: text("salt"),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  updatedAt: timestamp("updated_at").$onUpdate(() => new Date())
})


// table to store registered applications(Client ID / Client Secret)

export const applicationsTable = pgTable("applications", {
    id:varchar('id',{ length: 50 }).primaryKey(),  //Client ID

    secret: text("secret").notNull(),              // Client Secret

    name: varchar('name', { length: 300}).notNull(),

    url: text("url"),

    redirectUri: text('redirect_uri').notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
})

//Table to store the 1 minute expiration Authorization codes
export const authorizationCodesTable = pgTable("authorization_codes", {
    id:uuid("id").primaryKey().defaultRandom(),

    code: varchar("code", { length: 300}).notNull().unique(),

    clientId:varchar("client_id", { length:50 }).notNull(),

    userId: uuid("user_id").notNull(),

    expiresAt: timestamp("expires_at").notNull()
})