import {InferenceClient} from "@huggingface/inference";
import {PROVIDERS} from "../utils/providers.js";

const ipAddresses = new Map();

const MODEL_ID = "deepseek-ai/DeepSeek-V3-0324";
const MAX_REQUESTS_PER_IP = 2;


export default async function handler(req, res) {
    const {prompt, html, previousPrompt, provider} = req.body;
    if (!prompt) {
        return res.status(400).send({
            ok: false,
            message: "Missing required fields",
        });
    }

    let {hf_token} = req.cookies;
    let token = hf_token;

    if (process.env.HF_TOKEN && process.env.HF_TOKEN !== "") {
        token = process.env.HF_TOKEN;
    }

    const ip =
        req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
        req.headers["x-real-ip"] ||
        req.socket.remoteAddress ||
        req.ip ||
        "0.0.0.0";

    if (!token) {
        ipAddresses.set(ip, (ipAddresses.get(ip) || 0) + 1);
        if (ipAddresses.get(ip) > MAX_REQUESTS_PER_IP) {
            return res.status(429).send({
                ok: false,
                openLogin: true,
                message: "Log In to continue using the service",
            });
        }

        token = process.env.DEFAULT_HF_TOKEN;
    }

    // Set up response headers for streaming
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const client = new InferenceClient(token);
    let completeResponse = "";

    let TOKENS_USED = prompt?.length;
    if (previousPrompt) TOKENS_USED += previousPrompt.length;
    if (html) TOKENS_USED += html.length;

    const DEFAULT_PROVIDER = PROVIDERS.novita;
    const selectedProvider =
        provider === "auto"
            ? DEFAULT_PROVIDER
            : PROVIDERS[provider] ?? DEFAULT_PROVIDER;

    if (provider !== "auto" && TOKENS_USED >= selectedProvider.max_tokens) {
        return res.status(400).send({
            ok: false,
            openSelectProvider: true,
            message: `Context is too long. ${selectedProvider.name} allow ${selectedProvider.max_tokens} max tokens.`,
        });
    }

    try {
        const chatCompletion = client.chatCompletionStream({
            model: MODEL_ID,
            provider: selectedProvider.id,
            messages: [
                {
                    role: "system",
                    content: `ONLY USE HTML, CSS AND JAVASCRIPT. If you want to use ICON make sure to import the library first. Try to create the best UI possible by using only HTML, CSS and JAVASCRIPT. Use as much as you can TailwindCSS for the CSS, if you can't do something with TailwindCSS, then use custom CSS (make sure to import <script src="https://cdn.tailwindcss.com"></script> in the head). Also, try to ellaborate as much as you can, to create something unique. ALWAYS GIVE THE RESPONSE INTO A SINGLE HTML FILE`,
                },
                ...(previousPrompt
                    ? [
                        {
                            role: "user",
                            content: previousPrompt,
                        },
                    ]
                    : []),
                ...(html
                    ? [
                        {
                            role: "assistant",
                            content: `The current code is: ${html}.`,
                        },
                    ]
                    : []),
                {
                    role: "user",
                    content: prompt,
                },
            ],
            ...(selectedProvider.id !== "sambanova"
                ? {
                    max_tokens: selectedProvider.max_tokens,
                }
                : {}),
        });

        while (true) {
            const {done, value} = await chatCompletion.next();
            if (done) {
                break;
            }
            const chunk = value.choices[0]?.delta?.content;
            if (chunk) {
                if (provider !== "sambanova") {
                    res.write(chunk);
                    completeResponse += chunk;

                    if (completeResponse.includes("</html>")) {
                        break;
                    }
                } else {
                    let newChunk = chunk;
                    if (chunk.includes("</html>")) {
                        // Replace everything after the last </html> tag with an empty string
                        newChunk = newChunk.replace(/<\/html>[\s\S]*/, "</html>");
                    }
                    completeResponse += newChunk;
                    res.write(newChunk);
                    if (newChunk.includes("</html>")) {
                        break;
                    }
                }
            }
        }
        // End the response stream
        res.end();
    } catch (error) {
        if (error.message.includes("exceeded your monthly included credits")) {
            return res.status(402).send({
                ok: false,
                openProModal: true,
                message: error.message,
            });
        }
        if (!res.headersSent) {
            res.status(500).send({
                ok: false,
                message:
                    error.message || "An error occurred while processing your request.",
            });
        } else {
            // Otherwise end the stream
            res.end();
        }
    }
}