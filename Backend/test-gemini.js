import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyCMKUJD-UjmrznVcAJy0_KiG-09MwnILrg" });

async function main() {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "how are you",
    });
    console.log(response.text);
}

main();