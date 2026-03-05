
import { GoogleGenAI, Type } from "@google/genai";
import { Order, Trip, InventoryItem } from "../types";

export const getLogisticsAdvice = async (
  inventory: InventoryItem[],
  trips: Trip[],
  orders: Order[]
) => {
  try {
    // Correct way to initialize GoogleGenAI as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Analyze the following warehouse and logistics data:
        Inventory: ${JSON.stringify(inventory.map(i => ({ name: i.name, qty: i.quantity })))}
        Trips: ${JSON.stringify(trips.map(t => ({ id: t.tripNumber, status: t.status })))}
        Orders: ${JSON.stringify(orders.map(o => ({ id: o.orderNumber, status: o.status })))}

        Provide 3 concise actionable insights for the warehouse manager. 
        Focus on:
        1. Low stock warnings.
        2. Trip efficiency (e.g. unassigned orders).
        3. Delivery bottlenecks.
        Return in JSON format.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ["high", "medium", "low"] }
                },
                required: ["title", "description", "priority"]
              }
            }
          },
          required: ["insights"]
        }
      }
    });

    return JSON.parse(response.text || '{"insights": []}');
  } catch (error) {
    console.error("AI Insight Error:", error);
    return { insights: [] };
  }
};
