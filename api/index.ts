import express from "express";
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// Database connection
const dbUrl = process.env.DATABASE_URL!;
const dbHost = dbUrl.split('@')[1]?.split('/')[0] || 'unknown';
console.log(`[Database] Connecting to: ${dbHost}`);
const sql = neon(dbUrl);

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
    await sql`
      CREATE TABLE IF NOT EXISTS process_items (
        id TEXT PRIMARY KEY,
        inventory_id TEXT,
        name TEXT,
        quantity INTEGER,
        section TEXT,
        note TEXT,
        formula TEXT,
        is_preparing BOOLEAN,
        created_at TEXT,
        target_date TEXT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS door_frames (
        id TEXT PRIMARY KEY,
        sku TEXT,
        name TEXT,
        category TEXT,
        section TEXT,
        material TEXT,
        direction TEXT,
        color TEXT,
        quantity INTEGER,
        note TEXT,
        formula TEXT,
        is_preparing BOOLEAN,
        created_at TEXT,
        target_date TEXT,
        source_process_item_id TEXT,
        h INTEGER,
        w INTEGER,
        d INTEGER
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

app.get("/api/process-items", async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM process_items`;
    const items = rows.map(row => ({
      id: row.id,
      inventoryId: row.inventory_id,
      name: row.name,
      quantity: row.quantity,
      section: row.section,
      note: row.note,
      formula: row.formula,
      isPreparing: row.is_preparing,
      createdAt: row.created_at,
      targetDate: row.target_date
    }));
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch process items" });
  }
});

app.post("/api/process-items/sync", async (req, res) => {
  const { items } = req.body;
  try {
    // For simplicity, we'll clear and re-insert or use UPSERT
    // UPSERT is better
    for (const item of items) {
      await sql`
        INSERT INTO process_items (id, inventory_id, name, quantity, section, note, formula, is_preparing, created_at, target_date)
        VALUES (${item.id}, ${item.inventoryId}, ${item.name}, ${item.quantity}, ${item.section}, ${item.note}, ${item.formula}, ${item.isPreparing}, ${item.createdAt}, ${item.targetDate})
        ON CONFLICT (id) DO UPDATE SET
          inventory_id = EXCLUDED.inventory_id,
          name = EXCLUDED.name,
          quantity = EXCLUDED.quantity,
          section = EXCLUDED.section,
          note = EXCLUDED.note,
          formula = EXCLUDED.formula,
          is_preparing = EXCLUDED.is_preparing,
          created_at = EXCLUDED.created_at,
          target_date = EXCLUDED.target_date;
      `;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to sync process items" });
  }
});

app.delete("/api/process-items/:id", async (req, res) => {
  try {
    await sql`DELETE FROM process_items WHERE id = ${req.params.id}`;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete process item" });
  }
});

app.get("/api/door-frames", async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM door_frames`;
    const items = rows.map(row => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      category: row.category,
      section: row.section,
      material: row.material,
      direction: row.direction,
      color: row.color,
      quantity: row.quantity,
      note: row.note,
      formula: row.formula,
      isPreparing: row.is_preparing,
      createdAt: row.created_at,
      targetDate: row.target_date,
      sourceProcessItemId: row.source_process_item_id,
      dimensions: { h: row.h, w: row.w, d: row.d }
    }));
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch door frames" });
  }
});

app.post("/api/door-frames/sync", async (req, res) => {
  const { items } = req.body;
  try {
    for (const item of items) {
      await sql`
        INSERT INTO door_frames (id, sku, name, category, section, material, direction, color, quantity, note, formula, is_preparing, created_at, target_date, source_process_item_id, h, w, d)
        VALUES (${item.id}, ${item.sku}, ${item.name}, ${item.category}, ${item.section}, ${item.material}, ${item.direction}, ${item.color}, ${item.quantity}, ${item.note}, ${item.formula}, ${item.isPreparing}, ${item.createdAt}, ${item.targetDate}, ${item.sourceProcessItemId}, ${item.dimensions.h}, ${item.dimensions.w}, ${item.dimensions.d})
        ON CONFLICT (id) DO UPDATE SET
          sku = EXCLUDED.sku,
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          section = EXCLUDED.section,
          material = EXCLUDED.material,
          direction = EXCLUDED.direction,
          color = EXCLUDED.color,
          quantity = EXCLUDED.quantity,
          note = EXCLUDED.note,
          formula = EXCLUDED.formula,
          is_preparing = EXCLUDED.is_preparing,
          created_at = EXCLUDED.created_at,
          target_date = EXCLUDED.target_date,
          source_process_item_id = EXCLUDED.source_process_item_id,
          h = EXCLUDED.h,
          w = EXCLUDED.w,
          d = EXCLUDED.d;
      `;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to sync door frames" });
  }
});

app.delete("/api/door-frames/:id", async (req, res) => {
  try {
    await sql`DELETE FROM door_frames WHERE id = ${req.params.id}`;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete door frame" });
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
