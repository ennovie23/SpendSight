const { GoogleGenAI } = require('@google/genai');
const OpenAI = require('openai');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const fs = require('fs');
const path = require('path');

// Configure cloudinary for production
if (process.env.NODE_ENV === 'production') {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

exports.scanImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  const provider = req.headers['x-ai-provider'] || 'gemini';
  const apiKey = req.headers['x-ai-key'] || process.env.GEMINI_API_KEY;
  const modelId = req.headers['x-ai-model'] || 'gemini-2.5-flash';

  if (!apiKey) {
    return res.status(401).json({ error: 'API key is missing.' });
  }

  try {
    const base64Data = req.file.buffer.toString('base64');
    const promptText = 'Analyze this image. Return a JSON object with strictly these keys: "is_valid" (boolean, true if the image is a receipt, a bill, a product, food, or anything purchasable. false if it is completely irrelevant like a plain wall, a random person\'s face, a selfie, or a landscape), "error_message" (string, if is_valid is false, provide a short friendly reason why it cannot be logged as an expense), "is_receipt" (boolean, true if it is a receipt or bill, false if it is just a picture of an item/product), "amount" (number, total amount or estimated price in local currency, 0 if unknown), "merchant" (string, the name of the store or brand, or infer one if not explicit), "category" (string, strictly ONE of: Food, Transport, Utilities, Entertainment, Shopping, Healthcare, Others), "description" (string, a single-sentence summary of the item or purchase), "payment_method" (string, the name of the bank, card, wallet, or cash used to pay, leave empty if not explicitly stated), and "items" (an array of objects, each with "name" (string), "quantity" (number, merge duplicate items and sum their quantity), and "price" (number, total price for that quantity)). DO NOT wrap in markdown code blocks, just raw JSON.';
    
    let cleanedText = "";

    if (provider === 'openrouter') {
      const openai = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: apiKey });
      try {
        const response = await openai.chat.completions.create({
          model: modelId,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                { type: "image_url", image_url: { url: `data:${req.file.mimetype};base64,${base64Data}` } }
              ]
            }
          ]
        });
        cleanedText = response.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
      } catch (err) {
        if (err.status === 400 && err.message && err.message.toLowerCase().includes('image')) {
          return res.status(400).json({ error: `The selected AI model (${modelId}) does not support image scanning. Please select a Vision-capable model.` });
        }
        throw err;
      }
    } else {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const response = await ai.models.generateContent({
        model: modelId,
        contents: [
          promptText,
          { inlineData: { data: base64Data, mimeType: req.file.mimetype } }
        ],
        config: { responseMimeType: "application/json" }
      });
      let rawText = response.text;
      if (typeof rawText === 'function') rawText = rawText();
      cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    
    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw Output:", cleanedText);
      return res.status(500).json({ error: "Failed to parse receipt data from AI." });
    }
    
    if (parsed.is_valid === false) {
      return res.status(400).json({ error: parsed.error_message || "This image doesn't look like a receipt or a purchasable item." });
    }

    res.json({
      is_receipt: parsed.is_receipt,
      amount: parsed.amount,
      merchant: parsed.merchant,
      category: parsed.category,
      description: parsed.description,
      payment_method: parsed.payment_method || "",
      items: parsed.items || []
    });
  } catch (error) {
    console.error("AI API Error:", error);
    if (error.status === 429 || (error.message && error.message.includes("quota"))) {
      return res.status(429).json({ error: "You have exceeded your AI API quota. Please check your keys or wait a moment!" });
    }
    res.status(500).json({ error: 'Failed to analyze receipt.' });
  }
};

exports.parseVoiceLog = async (req, res) => {
  if (!req.body.transcript) {
    return res.status(400).json({ error: 'No transcript provided' });
  }

  const provider = req.headers['x-ai-provider'] || 'gemini';
  const apiKey = req.headers['x-ai-key'] || process.env.GEMINI_API_KEY;
  const modelId = req.headers['x-ai-model'] || 'gemini-2.5-flash';

  if (!apiKey) {
    return res.status(401).json({ error: 'API key is missing.' });
  }

  try {
    const promptText = `
      Analyze the following voice transcript of a user logging an expense.
      Extract the expense details and return a JSON object with strictly these keys:
      - "amount" (number, the cost of the expense)
      - "merchant" (string, the name of the store or person paid, leave empty if not mentioned)
      - "category" (string, choose from standard categories: Food, Transport, Utilities, Entertainment, or infer a logical custom one)
      - "description" (string, a brief 2-5 word summary of the expense)
      - "payment_method" (string, the name of the bank, card, wallet, or cash used, leave empty if not mentioned)
      
      Transcript: "${req.body.transcript}"
    `;

    let cleanedText = "";

    if (provider === 'openrouter') {
      const openai = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: apiKey });
      const response = await openai.chat.completions.create({
        model: modelId,
        messages: [{ role: "user", content: promptText }]
      });
      cleanedText = response.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
    } else {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const response = await ai.models.generateContent({
        model: modelId,
        contents: promptText,
        config: { responseMimeType: "application/json", temperature: 0.1 }
      });
      let rawText = response.text;
      if (typeof rawText === 'function') rawText = rawText();
      cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    
    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw Output:", cleanedText);
      return res.status(500).json({ error: "Failed to parse voice data from AI." });
    }

    res.json({
      amount: parsed.amount,
      merchant: parsed.merchant || "",
      category: parsed.category || "Food",
      description: parsed.description || "",
      payment_method: parsed.payment_method || ""
    });
  } catch (error) {
    console.error("AI API Error in Voice Log:", error);
    if (error.status === 429 || (error.message && error.message.includes("quota"))) {
      return res.status(429).json({ error: "You have exceeded your AI API quota. Please check your keys or wait a moment!" });
    }
    res.status(500).json({ error: 'Failed to analyze voice log.' });
  }
};
