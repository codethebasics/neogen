import {createRepo, uploadFiles, whoAmI} from "@huggingface/hub";
import {COLORS} from "../utils/colors.js";

export default async function handler(req, res) {
    const { html, title, path, prompts } = req.body;
    if (!html || (!path && !title)) {
        return res.status(400).send({
            ok: false,
            message: "Missing required fields",
        });
    }

    let { hf_token } = req.cookies;
    if (process.env.HF_TOKEN && process.env.HF_TOKEN !== "") {
        hf_token = process.env.HF_TOKEN;
    }

    try {
        const repo = {
            type: "space",
            name: path ?? "",
        };

        let readme;
        let newHtml = html;

        if (!path || path === "") {
            const { name: username } = await whoAmI({ accessToken: hf_token });
            const newTitle = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .split("-")
                .filter(Boolean)
                .join("-")
                .slice(0, 96);

            const repoId = `${username}/${newTitle}`;
            repo.name = repoId;

            await createRepo({
                repo,
                accessToken: hf_token,
            });
            const colorFrom = COLORS[Math.floor(Math.random() * COLORS.length)];
            const colorTo = COLORS[Math.floor(Math.random() * COLORS.length)];
            readme = `---
title: ${newTitle}
emoji: 🐳
colorFrom: ${colorFrom}
colorTo: ${colorTo}
sdk: static
pinned: false
tags:
  - deepsite
---

Check out the configuration reference at https://huggingface.co/docs/hub/spaces-config-reference`;
        }

        newHtml = html.replace(/<\/body>/, `${getPTag(repo.name)}</body>`);
        const file = new Blob([newHtml], { type: "text/html" });
        file.name = "index.html"; // Add name property to the Blob

        // create prompt.txt file with all the prompts used, split by new line
        const newPrompts = ``.concat(prompts.map((prompt) => prompt).join("\n"));
        const promptFile = new Blob([newPrompts], { type: "text/plain" });
        promptFile.name = "prompts.txt"; // Add name property to the Blob

        const files = [file, promptFile];
        if (readme) {
            const readmeFile = new Blob([readme], { type: "text/markdown" });
            readmeFile.name = "README.md"; // Add name property to the Blob
            files.push(readmeFile);
        }
        await uploadFiles({
            repo,
            files,
            accessToken: hf_token,
        });
        return res.status(200).send({ ok: true, path: repo.name });
    } catch (err) {
        return res.status(500).send({
            ok: false,
            message: err.message,
        });
    }
}