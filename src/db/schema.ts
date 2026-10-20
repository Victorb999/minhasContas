import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const txType = pgEnum("tx_type", ["income", "expense"]);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    type: txType("type").notNull(),
    color: text("color").notNull(),
    icon: text("icon").notNull().default("circle"),
    sortOrder: integer("sort_order").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
  },
  (t) => [uniqueIndex("categories_name_type_idx").on(t.name, t.type)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    type: txType("type").notNull(),
    amountCents: integer("amount_cents").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    // Preenchido em lançamentos importados (ex.: "planilha"), para poder reimportar.
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("transactions_date_idx").on(t.date),
    index("transactions_category_idx").on(t.categoryId),
  ],
);

export type TxType = (typeof txType.enumValues)[number];
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
