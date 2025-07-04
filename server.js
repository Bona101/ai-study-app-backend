import express from "express";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import 'dotenv/config';

const app = express();
const PORT = 5000; 

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const myFiles = [];
async function uploadFile(file, mimeType) {
  const myfile = await ai.files.upload({
    file: file,
    config: { mimeType: mimeType },
  });
  myFiles.push(myfile);
}

// mimeType = "image/jpeg"
// file = "play.jpg"


// prompt = "what is in this image"

async function promptAI(prompt, indexOfFile) {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: createUserContent([
      createPartFromUri(myFiles[indexOfFile].uri, myFiles[indexOfFile].mimeType),
      prompt,
    ]),
  });
  console.log("RESPONSE");
  console.log(response.text);
}

await sendFile();





app.listen(PORT, 'localhost', () => {
    console.log(`Server is listening at http://localhost:${PORT}`);
});







