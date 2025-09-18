export default async function handler(req, res) {
  try {
    const response = await fetch("https://rotakip.onrender.com/api/health");
    const data = await response.json();
    res.status(200).json({ ok: true, backend: data });
  } catch (err) {
    res.status(500).json({ error: "Backend not reachable" });
  }
}
