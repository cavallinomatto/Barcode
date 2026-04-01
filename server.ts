import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy for barcode images to avoid CORS
  app.get("/api/barcode", async (req, res) => {
    const { data, code } = req.query;
    if (!data) return res.status(400).send("Missing data");
    
    // Force imagetype=png for jsPDF compatibility and set DPI to 300 for high quality
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${data}&code=${code || 'EAN13'}&translate-esc=on&imagetype=png&dpi=300`;
    
    try {
      const response = await fetch(barcodeUrl);
      const contentType = response.headers.get("content-type");
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("TEC-IT API Error:", errorText, "Status:", response.status);
        return res.status(response.status).send(`TEC-IT Error: ${errorText}`);
      }
      
      // If it's not an image, something is wrong (might be an error message with 200 OK)
      if (contentType && !contentType.startsWith("image/")) {
        const text = await response.text();
        console.error("TEC-IT returned non-image content:", text);
        return res.status(500).send("TEC-IT returned invalid content type");
      }

      const buffer = await response.arrayBuffer();
      
      // Forward the actual content type from TEC-IT
      res.setHeader("Content-Type", contentType || "image/png");
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).send("Error fetching barcode");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
