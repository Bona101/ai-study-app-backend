import express from "express";
const app = express();
const PORT = 5000; 



app.listen(PORT, () => {
    console.log(`Server is listening at http://localhost:${PORT}`);
});












import {GoogleGenAI} from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const myfile = await ai.files.upload({
  file: path.join(media, "Cajun_instruments.jpg"),
  config: { mimeType: "image/jpeg" },
});
console.log("Uploaded file:", myfile);

const result = await ai.models.generateContent({
  model: "gemini-2.0-flash",
  contents: createUserContent([
    createPartFromUri(myfile.uri, myfile.mimeType),
    "\n\n",
    "Can you tell me about the instruments in this photo?",
  ]),
});
console.log("result.text=", result.text);




import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";

const ai = new GoogleGenAI({});

async function main() {
  const myfile = await ai.files.upload({
    file: "path/to/sample.mp3",
    config: { mimeType: "audio/mpeg" },
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: createUserContent([
      createPartFromUri(myfile.uri, myfile.mimeType),
      "Describe this audio clip",
    ]),
  });
  console.log(response.text);
}

await main();






