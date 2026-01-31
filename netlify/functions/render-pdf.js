import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const buildResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    ...headers
  },
  body
});

export const handler = async (event) => {
  if (event.httpMethod === "GET") {
    return buildResponse(200, "ok", {
      "Content-Type": "text/plain"
    });
  }
  if (event.httpMethod === "OPTIONS") {
    return buildResponse(204, "", {
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    });
  }

  if (event.httpMethod !== "POST") {
    return buildResponse(405, "Method Not Allowed");
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return buildResponse(400, "Invalid JSON");
  }

  const html = payload.html;
  if (!html || typeof html !== "string") {
    return buildResponse(400, "Missing HTML");
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

    return buildResponse(200, pdfBuffer.toString("base64"), {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=\"document.pdf\"",
      "Content-Transfer-Encoding": "base64"
    });
  } catch (err) {
    return buildResponse(500, `PDF generation failed: ${err.message || "unknown"}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
