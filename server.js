import express from "express";
import cors from 'cors';
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer'; // Import multer

// ES Module equivalent for __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
const PORT = 5000;

// Middleware for parsing JSON bodies (for the /prompt endpoint)
app.use(express.json());

// Configure Multer for file uploads
// storage: Defines where the file will be stored.
//          Here, we're storing it temporarily in memory or on disk.
//          For Gemini API, reading from disk (after Multer saves it) or
//          directly from buffer (if using memory storage) are options.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Specify a temporary directory for uploads.
    // Make sure this directory exists (e.g., create a 'uploads' folder in your project root)
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Use the original filename with a timestamp to avoid conflicts
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage }); // Configure multer with disk storage

// Initialize Google Gemini AI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Storage for uploaded Gemini File URIs (in a real app, use a DB or cache)
// This is a simple in-memory store for demonstration purposes.
// **WARNING**: This will reset every time your server restarts!
// For persistent storage, you'd save `geminiFile.uri` to a database
// associated with a user session or a unique ID.
const uploadedGeminiFiles = {};

app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// 1. Backend Endpoint for File Upload
app.post('/upload', upload.single('mediaFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const filePath = req.file.path; // Path where Multer saved the file
    const mimeType = req.file.mimetype;

    console.log(`Received file '${req.file.originalname}'. Uploading to Gemini...`);

    const geminiFile = await ai.files.upload({
      file: filePath, // Multer's temporary file path
      config: { mimeType: mimeType },
    });

    console.log("Uploaded to Gemini API. URI:", geminiFile.uri);

    // Store the Gemini file info (e.g., by some session ID or file ID)
    // For this example, let's just use the original filename as a key.
    // In production, use unique IDs for sessions or files.
    const fileId = req.file.filename; // Using Multer's generated filename as a key
    uploadedGeminiFiles[fileId] = { uri: geminiFile.uri, mimeType: geminiFile.mimeType };

    // Clean up the temporary file after successful upload to Gemini
    // You might want to do this in a 'finally' block or after response is sent
    // or use fs.unlink(filePath, (err) => { if (err) console.error(err); });
    // For simplicity, we'll assume a cleanup strategy.
    // fs.unlinkSync(filePath); // Be careful with sync methods in Express routes
    console.log(req.file.originalname, ": ", fileId)
    res.status(200).json({
      message: 'File uploaded to Gemini successfully!',
      fileId: fileId, // Send back a file ID so frontend can reference it
      geminiUri: geminiFile.uri, // Optionally send URI back directly for immediate use
      geminiMimeType: geminiFile.mimeType
    });


  } catch (error) {
    console.error("Error during file upload to Gemini:", error);
    res.status(500).json({
      error: 'Failed to upload file to Gemini API.',
      details: error.message
    });
  } finally {
    // Optional: Clean up the locally saved file immediately
    if (req.file && req.file.path) {
      try {
        // Use fs.promises for async unlink
        const fs = await import('fs/promises');
        await fs.unlink(req.file.path);
        console.log(`Cleaned up local file: ${req.file.path}`);
      } catch (unlinkErr) {
        console.error(`Error cleaning up local file ${req.file.path}:`, unlinkErr);
      }
    }
  }
});

// 2. Backend Endpoint for Prompting with an Uploaded File
app.post('/prompt', async (req, res) => {
  try {
    const { fileId, prompt } = req.body;

    if (!fileId || !prompt) {
      return res.status(400).json({ error: 'Missing fileId or prompt in request body.' });
    }

    const geminiFileInfo = uploadedGeminiFiles[fileId];

    if (!geminiFileInfo) {
      return res.status(404).json({ error: 'Gemini file not found. It might have expired or not been uploaded.' });
    }

    console.log(`Processing prompt for file URI: ${geminiFileInfo.uri}`);

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: createUserContent([
        createPartFromUri(geminiFileInfo.uri, geminiFileInfo.mimeType),
        prompt,
      ]),
    });

    // console.log('FULL RESPONSE:', JSON.stringify(response, null, 2));
    // console.log("END OF RESPONSE");
    const responseText = response.candidates[0].content.parts[0].text;

    res.status(200).json({
      success: true,
      generatedContent: responseText,
    });

  } catch (error) {
    console.error("Error during content generation with Gemini:", error);
    res.status(500).json({
      error: 'Failed to generate content from Gemini API.',
      details: error.message
    });
  }
});

// Start the server
app.listen(PORT, 'localhost', () => {
  console.log(`Backend server listening at http://localhost:${PORT}`);
  console.log("Remember to create an 'uploads/' directory in your project root.");
});