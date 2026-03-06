import express from "express";
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// Database connection
const sql = neon(process.env.DATABASE_URL || "postgresql://neondb_owner:npg_CO7pbVSm1YBG@ep-spring-paper-a1czhinz-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require");

app.use(cors());
app.use(express.json());

// Initialize database
async function initDb() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        sku TEXT NOT NULL,
        name TEXT NOT NULL,
        quantity INTEGER DEFAULT 0,
        unit TEXT,
        category TEXT,
        attribute TEXT,
        h INTEGER,
        w INTEGER,
        d INTEGER,
        weight NUMERIC,
        volume NUMERIC
      );
    `;
    console.log("Database initialized");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}

initDb();

// API Routes
app.get("/api/inventory", async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM inventory ORDER BY name ASC`;
    const inventory = rows.map(row => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      category: row.category,
      attribute: row.attribute,
      dimensions: { h: row.h, w: row.w, d: row.d },
      weight: Number(row.weight),
      volume: Number(row.volume)
    }));
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

app.post("/api/inventory/sync", async (req, res) => {
  const { items } = req.body;
  try {
    for (const item of items) {
      await sql`
        INSERT INTO inventory (id, sku, name, quantity, unit, category, attribute, h, w, d, weight, volume)
        VALUES (${item.id}, ${item.sku}, ${item.name}, ${item.quantity}, ${item.unit}, ${item.category}, ${item.attribute}, ${item.dimensions.h}, ${item.dimensions.w}, ${item.dimensions.d}, ${item.weight}, ${item.volume})
        ON CONFLICT (id) DO UPDATE SET
          quantity = EXCLUDED.quantity,
          attribute = EXCLUDED.attribute,
          category = EXCLUDED.category;
      `;
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: "Failed to sync inventory" });
  }
});

app.post("/api/inventory/update-stock", async (req, res) => {
  const { inventoryId, quantityChange } = req.body;
  try {
    await sql`
      UPDATE inventory 
      SET quantity = quantity + ${quantityChange}
      WHERE id = ${inventoryId}
    `;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update stock" });
  }
});

app.delete("/api/inventory/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await sql`DELETE FROM inventory WHERE id = ${id}`;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete item" });
  }
});

export default app;
