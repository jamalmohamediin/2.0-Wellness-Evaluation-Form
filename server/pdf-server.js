import express from "express";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const app = express();
app.use(express.json({ limit: "10mb" }));

app.post("/render-pdf", async (req, res) => {
  const html = req.body?.html;
  if (!html || typeof html !== "string") {
    res.status(400).send("Missing HTML");
    return;
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("print");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.status(200).send(pdfBuffer);
  } catch (err) {
    res.status(500).send(`PDF generation failed: ${err.message || "unknown"}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

const PORT = process.env.PDF_SERVER_PORT || 8787;
app.listen(PORT, () => {
  console.log(`PDF server listening on http://localhost:${PORT}`);
});
