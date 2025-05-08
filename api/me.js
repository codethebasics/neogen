export default async function handler(req, res) {
    let { hf_token } = req.cookies;

    if (process.env.HF_TOKEN && process.env.HF_TOKEN !== "") {
        return res.send({
            preferred_username: "local-use",
            isLocalUse: true,
        });
    }

    try {
        const request_user = await fetch("https://huggingface.co/oauth/userinfo", {
            headers: {
                Authorization: `Bearer ${hf_token}`,
            },
        });

        const user = await request_user.json();
        res.send(user);
    } catch (err) {
        res.clearCookie("hf_token", {
            httpOnly: false,
            secure: true,
            sameSite: "none",
        });
        res.status(401).send({
            ok: false,
            message: err.message,
        });
    }
}