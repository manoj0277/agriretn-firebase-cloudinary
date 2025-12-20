import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'] });

const apiKey = process.env.VITE_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;

async function run() {
    console.log("Running test with gemini-1.5-flash and production-like config...");
    console.log("API KEY Present:", !!apiKey);
    if (!apiKey) {
        console.error("NO API KEY FOUND in .env");
        // Try to read from backend/.env if needed, but simple test first
        return;
    }
    const ai = new GoogleGenAI({ apiKey });

    // Replicate SupplierView Prompt with Telugu
    const languageName = "Telugu";
    const prompt = `
        As a market analysis expert for an agricultural equipment rental platform called AgriRent, suggest a competitive hourly price for a supplier.
        - Item Category: Tractors
        - Work Purpose: Ploughing
        - Supplier's Location: Punjab
        - Recent booking prices: 1200, 1400
        
        Based on this data, provide a suggested price range and a very brief justification.
        IMPORTANT: Respond with the suggested range and justification in ${languageName} language only.
        Respond with ONLY the suggested range and justification.
    `;

    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    const config = {
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
    };

    try {
        console.log("Sending Request to gemini-2.5-flash...");
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
            config,
        });

        console.log("Response Received!");
        // console.log("Response Object:", JSON.stringify(response, null, 2));

        if (response) {
            const text = typeof response.text === 'function' ? response.text() : response.text;
            console.log("Extracted Text:", text);
        } else {
            console.log("Response is null/undefined");
        }

    } catch (e) {
        console.error("TEST FAILED WITH ERROR:");
        if (e instanceof Error) {
            console.error(e.message);
            console.error("Stack:", e.stack);
        } else {
            console.error(JSON.stringify(e, null, 2));
        }
    }
}

run();
