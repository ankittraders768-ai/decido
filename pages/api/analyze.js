export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { system, user } = req.body;
  if (!system || !user) return res.status(400).json({ error: "Missing fields" });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          { role: "system", content: system },
          { role: "user",   content: user   },
        ],
        max_tokens: 1400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || "";
    return res.status(200).json({ text });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
