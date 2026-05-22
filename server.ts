import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini Setup
  let ai: GoogleGenAI | null = null;
  function getAI() {
    if (!ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('GEMINI_API_KEY environment variable is not set. Gemini API calls will fail.');
      }
      ai = new GoogleGenAI({ apiKey: apiKey || '' });
    }
    return ai;
  }

  // API Routes
  app.post("/api/gemini/summary", async (req, res) => {
    try {
      const { data, language, systemPrompt } = req.body;
      const genAI = getAI();
      const defaultPrompt = `Analyze the following health data and provide a summary, 3 potential risks, and 3 recommendations.`;
      
      const model = genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${systemPrompt || defaultPrompt} Respond in ${language === 'vi' ? 'Vietnamese' : 'English'}.
        Data: ${JSON.stringify(data)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              risks: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["summary", "risks", "recommendations"]
          }
        }
      });
      const response = await model;
      let text = response.text || '{}';
      if (text.startsWith('```json')) {
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      } else if (text.startsWith('```')) {
        text = text.replace(/```/g, '').trim();
      }
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error('Summary Generation Error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, recentData, language } = req.body;
      const genAI = getAI();
      const model = genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are a personalized health assistant. Answer the user's question based on their recent health data.
        User Message: "${message}"
        Recent Data: ${JSON.stringify(recentData)}
        Language: ${language === 'vi' ? 'Vietnamese' : 'English'}`,
      });
      const response = await model;
      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Chat Error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  app.post("/api/gemini/admin-chat", async (req, res) => {
    try {
      const { history, message, language } = req.body;
      const genAI = getAI();
      // Use 2.5 flash in production as 3 is in preview and may cause 403
      const chatSession = genAI.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: language === 'en' 
            ? "You are an AI assistant for a global healthcare SaaS platform admin. You help them analyze data, manage tenants (hospitals/clinics), and provide technical advice. Keep answers professional and concise."
            : "Bạn là trợ lý AI cho quản trị viên hệ thống nền tảng SaaS y tế. Bạn giúp họ phân tích dữ liệu, quản lý tổ chức (phòng khám/bệnh viện), và cung cấp tư vấn kỹ thuật. Giữ câu trả lời chuyên nghiệp và ngắn gọn."
        }
      });
      
      // If we want to restore history properly with the new SDK we could pass it to history: ...
      // For simplicity here, we send the history manually in a single prompt or assume stateless
      // But let's restore history:
      let prompt = `Here is the conversation history:\n`;
      for (const msg of history) {
        prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}\n`;
      }
      prompt += `\nNow reply to the following user message: "${message}"`;
      
      const response = await chatSession.sendMessage({ message: prompt });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Admin Chat Error:', error);
      res.status(error?.status || 500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
