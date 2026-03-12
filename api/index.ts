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
        target_date TEXT,
        is_synced_to_parts BOOLEAN DEFAULT FALSE
      );
    `;
    await sql`
      ALTER TABLE process_items ADD COLUMN IF NOT EXISTS is_synced_to_parts BOOLEAN DEFAULT FALSE;
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
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT,
        customer_name TEXT,
        status TEXT,
        items JSONB,
        trip_id TEXT,
        created_at TEXT,
        region TEXT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        trip_number TEXT,
        driver_name TEXT,
        vehicle_plate TEXT,
        status TEXT,
        date TEXT,
        order_ids JSONB,
        vehicle_id TEXT
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
      isPreparing: !!row.is_preparing,
      createdAt: row.created_at,
      targetDate: row.target_date,
      isSyncedToParts: !!row.is_synced_to_parts
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
        INSERT INTO process_items (id, inventory_id, name, quantity, section, note, formula, is_preparing, created_at, target_date, is_synced_to_parts)
        VALUES (
          ${item.id}, 
          ${item.inventoryId}, 
          ${item.name}, 
          ${item.quantity}, 
          ${item.section}, 
          ${item.note}, 
          ${item.formula}, 
          ${item.isPreparing ? 1 : 0}, 
          ${item.createdAt}, 
          ${item.targetDate}, 
          ${item.isSyncedToParts ? 1 : 0}
        )
        ON CONFLICT (id) DO UPDATE SET
          inventory_id = EXCLUDED.inventory_id,
          name = EXCLUDED.name,
          quantity = EXCLUDED.quantity,
          section = EXCLUDED.section,
          note = EXCLUDED.note,
          formula = EXCLUDED.formula,
          is_preparing = EXCLUDED.is_preparing,
          created_at = EXCLUDED.created_at,
          target_date = EXCLUDED.target_date,
          is_synced_to_parts = EXCLUDED.is_synced_to_parts;
      `;
    }
    res.json({ success: true });
    req.app.get("io")?.emit("process_items_updated");
  } catch (error) {
    res.status(500).json({ error: "Failed to sync process items" });
  }
});

app.delete("/api/process-items/:id", async (req, res) => {
  try {
    await sql`DELETE FROM process_items WHERE id = ${req.params.id}`;
    res.json({ success: true });
    req.app.get("io")?.emit("process_items_updated");
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
        VALUES (
          ${item.id}, ${item.sku}, ${item.name}, ${item.category}, ${item.section}, ${item.material}, ${item.direction}, ${item.color}, ${item.quantity}, ${item.note}, ${item.formula}, 
          ${item.isPreparing ? 1 : 0}, 
          ${item.createdAt}, ${item.targetDate}, ${item.sourceProcessItemId}, ${item.dimensions.h}, ${item.dimensions.w}, ${item.dimensions.d}
        )
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
    req.app.get("io")?.emit("door_frames_updated");
  } catch (error) {
    res.status(500).json({ error: "Failed to sync door frames" });
  }
});

app.delete("/api/door-frames/:id", async (req, res) => {
  try {
    await sql`DELETE FROM door_frames WHERE id = ${req.params.id}`;
    res.json({ success: true });
    req.app.get("io")?.emit("door_frames_updated");
  } catch (error) {
    res.status(500).json({ error: "Failed to delete door frame" });
  }
});

app.delete("/api/door-frames/source/:sourceId", async (req, res) => {
  try {
    // 僅刪除處於 'prep' (預備組) 階段的零件
    await sql`DELETE FROM door_frames WHERE source_process_item_id = ${req.params.sourceId} AND section = 'prep'`;
    res.json({ success: true });
    req.app.get("io")?.emit("door_frames_updated");
  } catch (error) {
    res.status(500).json({ error: "Failed to delete door frames by source" });
  }
});

app.post("/api/door-frames/clear-prep", async (req, res) => {
  try {
    await sql`DELETE FROM door_frames WHERE section = 'prep'`;
    res.json({ success: true });
    req.app.get("io")?.emit("door_frames_updated");
  } catch (error) {
    res.status(500).json({ error: "Failed to clear prep frames" });
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
    req.app.get("io")?.emit("inventory_updated");
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
    req.app.get("io")?.emit("inventory_updated");
  } catch (error) {
    res.status(500).json({ error: "Failed to update stock" });
  }
});

app.delete("/api/inventory/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await sql`DELETE FROM inventory WHERE id = ${id}`;
    res.json({ success: true });
    req.app.get("io")?.emit("inventory_updated");
  } catch (error) {
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// Orders Routes
app.get("/api/orders", async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM orders`;
    const orders = rows.map(row => ({
      id: row.id,
      orderNumber: row.order_number,
      customerName: row.customer_name,
      status: row.status,
      items: row.items,
      tripId: row.trip_id,
      createdAt: row.created_at,
      region: row.region
    }));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.post("/api/orders/sync", async (req, res) => {
  const { items } = req.body;
  try {
    for (const item of items) {
      await sql`
        INSERT INTO orders (id, order_number, customer_name, status, items, trip_id, created_at, region)
        VALUES (${item.id}, ${item.orderNumber}, ${item.customerName}, ${item.status}, ${JSON.stringify(item.items)}, ${item.tripId}, ${item.createdAt}, ${item.region})
        ON CONFLICT (id) DO UPDATE SET
          order_number = EXCLUDED.order_number,
          customer_name = EXCLUDED.customer_name,
          status = EXCLUDED.status,
          items = EXCLUDED.items,
          trip_id = EXCLUDED.trip_id,
          region = EXCLUDED.region;
      `;
    }
    res.json({ success: true });
    req.app.get("io")?.emit("orders_updated");
  } catch (error) {
    res.status(500).json({ error: "Failed to sync orders" });
  }
});

// Trips Routes
app.get("/api/trips", async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM trips`;
    const trips = rows.map(row => ({
      id: row.id,
      tripNumber: row.trip_number,
      driverName: row.driver_name,
      vehiclePlate: row.vehicle_plate,
      status: row.status,
      date: row.date,
      orderIds: row.order_ids,
      vehicleId: row.vehicle_id
    }));
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch trips" });
  }
});

app.post("/api/trips/sync", async (req, res) => {
  const { items } = req.body;
  try {
    for (const item of items) {
      await sql`
        INSERT INTO trips (id, trip_number, driver_name, vehicle_plate, status, date, order_ids, vehicle_id)
        VALUES (${item.id}, ${item.tripNumber}, ${item.driverName}, ${item.vehiclePlate}, ${item.status}, ${item.date}, ${JSON.stringify(item.orderIds)}, ${item.vehicleId})
        ON CONFLICT (id) DO UPDATE SET
          trip_number = EXCLUDED.trip_number,
          driver_name = EXCLUDED.driver_name,
          vehicle_plate = EXCLUDED.vehicle_plate,
          status = EXCLUDED.status,
          date = EXCLUDED.date,
          order_ids = EXCLUDED.order_ids,
          vehicle_id = EXCLUDED.vehicle_id;
      `;
    }
    res.json({ success: true });
    req.app.get("io")?.emit("trips_updated");
  } catch (error) {
    res.status(500).json({ error: "Failed to sync trips" });
  }
});

export default app;
