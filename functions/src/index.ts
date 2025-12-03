import * as functions from "firebase-functions";
import { Request, Response } from "express";

export const geminiChat = functions.https.onRequest(
  async (req: Request, res: Response): Promise<void> => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      const { message, history } = req.body;

      if (!message) {
        res.status(400).json({ text: "Mesaj eksik" });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ text: "API anahtarı bulunamadı" });
        return;
      }

      // Build conversation history
      const contents: any[] = [];
      
      // Add history if provided
      if (Array.isArray(history) && history.length > 0) {
        history.forEach((msg: any) => {
          if (msg.role === 'user' || msg.role === 'assistant') {
            contents.push({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content || msg.text || '' }]
            });
          }
        });
      }

      // Add current message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      // ⭐ ÜCRETSİZ, YENİ ve ÇALIŞAN GOOGLE MODELİ
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: contents,
        }),
      });

      const data = await response.json();

      console.log("🔥 RAW:", JSON.stringify(data, null, 2));

      if (data.error) {
        res.status(200).json({
          text: "API Error: " + JSON.stringify(data.error, null, 2),
        });
        return;
      }

      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Yanıt alınamadı.";

      res.status(200).json({ text });
    } catch (err) {
      console.error("❌ Hata:", err);
      res.status(500).json({ text: "Sunucu hatası" });
    }
  }
);
