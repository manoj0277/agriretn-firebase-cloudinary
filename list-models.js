
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.VITE_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;

async function run() {
    console.log("Listing Models with Key ending in:", apiKey ? apiKey.slice(-4) : "NONE");
    if (!apiKey) return;

    const ai = new GoogleGenAI({ apiKey });

    try {
        // The new SDK v0.1.x might differ. 
        // Using HTTP REST fallback if SDK method is obscure, but let's try strict model listing if possible.
        // Actually, let's use the SDK 'models.list()' if it exists, or just try a standard request to list models.
        // The @google/genai SDK is new. Let's try to infer from its structure.
        // If not, I will use fetch.

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("AVAILABLE MODELS:");
            data.models.forEach(m => {
                if (m.name.includes('gemini')) {
                    console.log(`- ${m.name}`);
                    console.log(`  Methods: ${m.supportedGenerationMethods.join(', ')}`);
                }
            });
        } else {
            console.log("No models found or error:", JSON.stringify(data));
        }

    } catch (e) {
        console.error("List Models Failed:", e);
    }
}

run();
