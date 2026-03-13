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
        volume NUMERIC,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
        is_synced_to_parts BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
        d INTEGER,
        sort_order INTEGER DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
        region TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
        vehicle_id TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Add updated_at columns if they don't exist
    const tables = ['inventory', 'process_items', 'door_frames', 'orders', 'trips'];
    for (const table of tables) {
      await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`);
    }

    console.log("Database initialized");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}

initDb();

// API Routes
app.get("/api/inventory", async (req, res) => {
  try {
    const rows = await sql`SELECT *, updated_at::text as updated_at_str FROM inventory ORDER BY name ASC, id ASC`;
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
      volume: Number(row.volume),
      updatedAt: row.updated_at_str
    }));
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

app.get("/api/process-items", async (req, res) => {
  try {
    const rows = await sql`SELECT *, updated_at::text as updated_at_str FROM process_items ORDER BY sort_order ASC, created_at ASC, id ASC`;
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
      isSyncedToParts: !!row.is_synced_to_parts,
      sortOrder: row.sort_order,
      updatedAt: row.updated_at_str
    }));
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch process items" });
  }
});

app.post("/api/process-items", async (req, res) => {
  const item = req.body;
  try {
    const updatedAt = item.updatedAt || new Date().toISOString();
    await sql`
      INSERT INTO process_items (id, inventory_id, name, quantity, section, note, formula, is_preparing, created_at, target_date, is_synced_to_parts, sort_order, updated_at)
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
        ${item.isSyncedToParts ? 1 : 0},
        ${item.sortOrder || 0},
        ${updatedAt}
      )
    `;
    res.json({ success: true });
    req.app.get("io")?.emit("process_items_updated");
  } catch (error) {
    console.error("Create error:", error);
    res.status(500).json({ error: "Failed to create process item" });
  }
});

app.post("/api/process-items/sync", async (req, res) => {
  const { items } = req.body;
  try {
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // Use a timestamp from the client if provided, otherwise use current_timestamp
        const updatedAt = item.updatedAt ? item.updatedAt : new Date().toISOString();
        
        await sql`
          INSERT INTO process_items (id, inventory_id, name, quantity, section, note, formula, is_preparing, created_at, target_date, is_synced_to_parts, sort_order, updated_at)
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
            ${item.isSyncedToParts ? 1 : 0},
            ${item.sortOrder || i},
            ${updatedAt}
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
            is_synced_to_parts = EXCLUDED.is_synced_to_parts,
            sort_order = EXCLUDED.sort_order,
            updated_at = EXCLUDED.updated_at
          WHERE EXCLUDED.updated_at >= process_items.updated_at;
        `;
      }
    }
    res.json({ success: true });
    req.app.get("io")?.emit("process_items_updated");
  } catch (error) {
    console.error("Sync error:", error);
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

app.patch("/api/process-items/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const updatedAt = new Date().toISOString();
    
    // 使用 CASE WHEN 模式來處理動態欄位更新，確保安全且符合 neon 的 template tag 語法
    await sql`
      UPDATE process_items 
      SET 
        inventory_id = CASE WHEN ${updates.inventoryId !== undefined} THEN ${updates.inventoryId} ELSE inventory_id END,
        name = CASE WHEN ${updates.name !== undefined} THEN ${updates.name} ELSE name END,
        quantity = CASE WHEN ${updates.quantity !== undefined} THEN ${updates.quantity} ELSE quantity END,
        section = CASE WHEN ${updates.section !== undefined} THEN ${updates.section} ELSE section END,
        note = CASE WHEN ${updates.note !== undefined} THEN ${updates.note} ELSE note END,
        formula = CASE WHEN ${updates.formula !== undefined} THEN ${updates.formula} ELSE formula END,
        is_preparing = CASE WHEN ${updates.isPreparing !== undefined} THEN ${updates.isPreparing} ELSE is_preparing END,
        created_at = CASE WHEN ${updates.createdAt !== undefined} THEN ${updates.createdAt} ELSE created_at END,
        target_date = CASE WHEN ${updates.targetDate !== undefined} THEN ${updates.targetDate} ELSE target_date END,
        is_synced_to_parts = CASE WHEN ${updates.isSyncedToParts !== undefined} THEN ${updates.isSyncedToParts} ELSE is_synced_to_parts END,
        sort_order = CASE WHEN ${updates.sortOrder !== undefined} THEN ${updates.sortOrder} ELSE sort_order END,
        updated_at = ${updatedAt}
      WHERE id = ${id}
    `;
    
    res.json({ success: true });
    req.app.get("io")?.emit("process_items_updated");
  } catch (error) {
    console.error("Patch error:", error);
    res.status(500).json({ error: "Failed to update process item" });
  }
});

app.get("/api/door-frames", async (req, res) => {
  try {
    const rows = await sql`SELECT *, updated_at::text as updated_at_str FROM door_frames ORDER BY sort_order ASC, created_at ASC, id ASC`;
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
      dimensions: { h: row.h, w: row.w, d: row.d },
      sortOrder: row.sort_order,
      updatedAt: row.updated_at_str
    }));
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch door frames" });
  }
});

app.post("/api/door-frames/sync", async (req, res) => {
  const { items } = req.body;
  try {
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const updatedAt = item.updatedAt ? item.updatedAt : new Date().toISOString();
        
        await sql`
          INSERT INTO door_frames (id, sku, name, category, section, material, direction, color, quantity, note, formula, is_preparing, created_at, target_date, source_process_item_id, h, w, d, sort_order, updated_at)
          VALUES (
            ${item.id}, ${item.sku}, ${item.name}, ${item.category}, ${item.section}, ${item.material}, ${item.direction}, ${item.color}, ${item.quantity}, ${item.note}, ${item.formula}, 
            ${item.isPreparing ? 1 : 0}, 
            ${item.createdAt}, ${item.targetDate}, ${item.sourceProcessItemId}, ${item.dimensions.h}, ${item.dimensions.w}, ${item.dimensions.d},
            ${item.sortOrder || i},
            ${updatedAt}
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
            d = EXCLUDED.d,
            sort_order = EXCLUDED.sort_order,
            updated_at = EXCLUDED.updated_at
          WHERE EXCLUDED.updated_at >= door_frames.updated_at;
        `;
      }
    }
    res.json({ success: true });
    req.app.get("io")?.emit("door_frames_updated");
  } catch (error) {
    console.error("Sync error:", error);
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
      const updatedAt = item.updatedAt ? item.updatedAt : new Date().toISOString();
      await sql`
        INSERT INTO inventory (id, sku, name, quantity, unit, category, attribute, h, w, d, weight, volume, updated_at)
        VALUES (${item.id}, ${item.sku}, ${item.name}, ${item.quantity}, ${item.unit}, ${item.category}, ${item.attribute}, ${item.dimensions.h}, ${item.dimensions.w}, ${item.dimensions.d}, ${item.weight}, ${item.volume}, ${updatedAt})
        ON CONFLICT (id) DO UPDATE SET
          quantity = EXCLUDED.quantity,
          attribute = EXCLUDED.attribute,
          category = EXCLUDED.category,
          updated_at = EXCLUDED.updated_at
        WHERE EXCLUDED.updated_at >= inventory.updated_at;
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
      SET quantity = quantity + ${quantityChange},
          updated_at = CURRENT_TIMESTAMP
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
    const rows = await sql`SELECT *, updated_at::text as updated_at_str FROM orders ORDER BY created_at ASC, id ASC`;
    const orders = rows.map(row => ({
      id: row.id,
      orderNumber: row.order_number,
      customerName: row.customer_name,
      status: row.status,
      items: row.items,
      tripId: row.trip_id,
      createdAt: row.created_at,
      region: row.region,
      updatedAt: row.updated_at_str
    }));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.post("/api/orders/sync", async (req, res) => {
  const { items } = req.body;
  try {
    if (items && items.length > 0) {
      for (const item of items) {
        const updatedAt = item.updatedAt ? item.updatedAt : new Date().toISOString();
        await sql`
          INSERT INTO orders (id, order_number, customer_name, status, items, trip_id, created_at, region, updated_at)
          VALUES (${item.id}, ${item.orderNumber}, ${item.customerName}, ${item.status}, ${JSON.stringify(item.items)}, ${item.tripId}, ${item.createdAt}, ${item.region}, ${updatedAt})
          ON CONFLICT (id) DO UPDATE SET
            order_number = EXCLUDED.order_number,
            customer_name = EXCLUDED.customer_name,
            status = EXCLUDED.status,
            items = EXCLUDED.items,
            trip_id = EXCLUDED.trip_id,
            region = EXCLUDED.region,
            updated_at = EXCLUDED.updated_at
          WHERE EXCLUDED.updated_at >= orders.updated_at;
        `;
      }
    }
    res.json({ success: true });
    req.app.get("io")?.emit("orders_updated");
  } catch (error) {
    res.status(500).json({ error: "Failed to sync orders" });
  }
});

app.delete("/api/orders/:id", async (req, res) => {
  try {
    await sql`DELETE FROM orders WHERE id = ${req.params.id}`;
    res.json({ success: true });
    req.app.get("io")?.emit("orders_updated");
  } catch (error) {
    res.status(500).json({ error: "Failed to delete order" });
  }
});

// Trips Routes
app.get("/api/trips", async (req, res) => {
  try {
    const rows = await sql`SELECT *, updated_at::text as updated_at_str FROM trips ORDER BY date ASC, id ASC`;
    const trips = rows.map(row => ({
      id: row.id,
      tripNumber: row.trip_number,
      driverName: row.driver_name,
      vehiclePlate: row.vehicle_plate,
      status: row.status,
      date: row.date,
      orderIds: row.order_ids,
      vehicleId: row.vehicle_id,
      updatedAt: row.updated_at_str
    }));
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch trips" });
  }
});

app.post("/api/trips/sync", async (req, res) => {
  const { items } = req.body;
  try {
    if (items && items.length > 0) {
      for (const item of items) {
        const updatedAt = item.updatedAt ? item.updatedAt : new Date().toISOString();
        await sql`
          INSERT INTO trips (id, trip_number, driver_name, vehicle_plate, status, date, order_ids, vehicle_id, updated_at)
          VALUES (${item.id}, ${item.tripNumber}, ${item.driverName}, ${item.vehiclePlate}, ${item.status}, ${item.date}, ${JSON.stringify(item.orderIds)}, ${item.vehicleId}, ${updatedAt})
          ON CONFLICT (id) DO UPDATE SET
            trip_number = EXCLUDED.trip_number,
            driver_name = EXCLUDED.driver_name,
            vehicle_plate = EXCLUDED.vehicle_plate,
            status = EXCLUDED.status,
            date = EXCLUDED.date,
            order_ids = EXCLUDED.order_ids,
            vehicle_id = EXCLUDED.vehicle_id,
            updated_at = EXCLUDED.updated_at
          WHERE EXCLUDED.updated_at >= trips.updated_at;
        `;
      }
    }
    res.json({ success: true });
    req.app.get("io")?.emit("trips_updated");
  } catch (error) {
    res.status(500).json({ error: "Failed to sync trips" });
  }
});

app.delete("/api/trips/:id", async (req, res) => {
  try {
    await sql`DELETE FROM trips WHERE id = ${req.params.id}`;
    res.json({ success: true });
    req.app.get("io")?.emit("trips_updated");
  } catch (error) {
    res.status(500).json({ error: "Failed to delete trip" });
  }
});

export default app;
