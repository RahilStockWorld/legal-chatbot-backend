const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();
const upload = multer({ dest: "uploads/" });
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let extractedText = "";

app.post("/api/chat", upload.single("file"), async (req, res) => {
  const { message } = req.body;
  let extractedText = "";

  try {
    if (req.file) {
      if (!req.file.mimetype.includes("pdf")) {
        return res.status(400).json({ reply: "Only PDF files are supported." });
      }

      const fileData = fs.readFileSync(req.file.path);
      extractedText = (await pdfParse(fileData)).text;
      fs.unlinkSync(req.file.path);
    }

    const prompt = `
You are a legal assistant AI. Use this uploaded document to help answer the user's questions.

Document Content:
"""${extractedText || "No document uploaded."}"""

User Message: ${message}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
    });

    res.json({ reply: response.choices[0].message.content });
  } catch (err) {
    console.error("Error:", err.message || err);
    res.status(500).json({ reply: "Sorry, an error occurred while processing your request." });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
