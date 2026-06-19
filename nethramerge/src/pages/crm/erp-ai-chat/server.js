
// =========================================
// E:\ERP\src\pages\crm\erp-ai-chat\server.js
// =========================================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();

app.use(cors());

app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.get("/", (req, res) => {
  res.send("Claude AI Server Running");
});

app.post("/api/chat", async (req, res) => {

  try {

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message required"
      });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system:
        "You are Shastika ERP AI Assistant. Help users with export orders, inventory, quotations, shipments, farmers and ERP operations.",
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    const reply =
      response?.content?.[0]?.text ||
      "No response from Claude";

    res.json({
      reply,
    });

  } catch (error) {

    console.error("Claude API Error:", error);

    res.status(500).json({
      error: error.message || "Unknown error",
    });

  }

});

app.listen(process.env.PORT || 3001, "0.0.0.0", () => {
  console.log("AI Server running on port 3001");
});

