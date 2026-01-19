import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  planType: text("plan_type").notNull().default("free"), // free, pro, enterprise
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Recordings table
export const recordings = pgTable("recordings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  videoKey: text("video_key").notNull(), // Chave do arquivo no R2 (composite)
  cameraKey: text("camera_key"), // Chave do vídeo da câmera no R2
  screenKey: text("screen_key"), // Chave do vídeo da tela no R2
  thumbnailKey: text("thumbnail_key"), // Chave da thumbnail no R2
  thumbnailUrl: text("thumbnail_url"), // URL da miniatura no R2
  duration: integer("duration").notNull(), // Duração em segundos
  size: bigint("size", { mode: "number" }).notNull(), // Tamanho em bytes
  editConfig: text("edit_config").default('{"cuts":[]}'), // JSON string para configuração de edição não-destrutiva
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  recordings: many(recordings),
}));

export const recordingsRelations = relations(recordings, ({ one }) => ({
  user: one(users, {
    fields: [recordings.userId],
    references: [users.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Recording = typeof recordings.$inferSelect;
export type NewRecording = typeof recordings.$inferInsert;
