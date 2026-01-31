// ============================================
// UPDATED WHATSAPP SHARE - FORCE ZERO POSITION
// ============================================

// REPLACE the existing handleWhatsAppShareClean function (lines 622-731) with THIS:

const handleWhatsAppShareClean = async () => {
  if (sharePdfLoading) return;

  const el = document.getElementById("wellness-pdf-source");
  if (!el) {
    showSaveNotice("Content not found.");
    return;
  }

  setSharePdfLoading(true);

  // Store original styles
  const originalShadow = el.style.boxShadow;
  const originalPosition = el.style.position;
  const originalTop = el.style.top;
  const originalLeft = el.style.left;
  
  try {
    // Remove shadow and force position
    el.style.boxShadow = "none";
    el.style.position = "absolute";
    el.style.top = "0";
    el.style.left = "0";
    
    document.body.classList.add("pdf-mode");

    // Wait for images
    const imgs = el.querySelectorAll("img");
    await Promise.all(
      Array.from(imgs).map((img) => (img.decode ? img.decode() : Promise.resolve()))
    );
    await new Promise((r) => setTimeout(r, 500));

    // Get the actual element dimensions
    const rect = el.getBoundingClientRect();

    // PDF generation with STRICT positioning
    const opts = {
      margin: 0, // ZERO margins
      filename: "",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: true, // Enable logging to debug
        scrollY: 0, // Force to 0
        scrollX: 0, // Force to 0
        windowWidth: rect.width,
        windowHeight: rect.height,
        backgroundColor: "#ffffff",
        removeContainer: false,
        imageTimeout: 0,
        x: 0, // Start capturing from X=0
        y: 0, // Start capturing from Y=0
        width: rect.width,
        height: rect.height
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
        compress: true
      },
      pagebreak: {
        mode: ["css", "legacy"],
        after: ".print-break",
        avoid: [".no-break"]
      }
    };

    const blob = await html2pdf().set(opts).from(el).outputPdf("blob");

    if (!blob || blob.size < 500) {
      showSaveNotice("Failed to generate PDF.");
      return;
    }

    const title = buildPdfTitle();
    const filename = `${title || "Personal Wellness Pass"}.pdf`.replace(/[\\/:*?"<>|]+/g, " ");
    const file = new File([blob], filename, { type: "application/pdf" });

    // Share or download
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: title || "Personal Wellness Pass"
      });
      showSaveNotice("Shared successfully!");
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      const whatsappUrl = "https://api.whatsapp.com/send?text=Personal%20Wellness%20Pass";
      window.open(whatsappUrl, "_blank");

      showSaveNotice("PDF downloaded. Attach to WhatsApp manually.");
    }
  } catch (e) {
    console.error("WhatsApp Share Error:", e);
    showSaveNotice("Error: " + e.message);
  } finally {
    // Restore original styles
    el.style.boxShadow = originalShadow;
    el.style.position = originalPosition;
    el.style.top = originalTop;
    el.style.left = originalLeft;
    
    document.body.classList.remove("pdf-mode");
    setSharePdfLoading(false);
  }
};

// ============================================
// ALTERNATIVE APPROACH - CANVAS-BASED
// ============================================
// If the above STILL doesn't work, use this completely different method
// This manually creates a canvas and converts to PDF without html2pdf

const handleWhatsAppShareCanvas = async () => {
  if (sharePdfLoading) return;

  const el = document.getElementById("wellness-pdf-source");
  if (!el) {
    showSaveNotice("Content not found.");
    return;
  }

  setSharePdfLoading(true);

  try {
    // Temporarily remove shadow
    const originalShadow = el.style.boxShadow;
    el.style.boxShadow = "none";
    document.body.classList.add("pdf-mode");

    // Wait for images
    const imgs = el.querySelectorAll("img");
    await Promise.all(
      Array.from(imgs).map((img) => (img.decode ? img.decode() : Promise.resolve()))
    );
    await new Promise((r) => setTimeout(r, 500));

    // Import html2canvas dynamically
    const html2canvas = (await import("html2canvas")).default;

    // Create canvas with strict options
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      scrollY: 0,
      scrollX: 0,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
      x: 0,
      y: 0,
      logging: true
    });

    // Create PDF from canvas
    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const { jsPDF } = window.jspdf || (await import("jspdf"));
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = 0;
    const imgY = 0;

    pdf.addImage(
      imgData,
      "JPEG",
      imgX,
      imgY,
      imgWidth * ratio * 0.264583, // Convert px to mm
      imgHeight * ratio * 0.264583,
      undefined,
      "FAST"
    );

    const blob = pdf.output("blob");
    const title = buildPdfTitle();
    const filename = `${title || "Personal Wellness Pass"}.pdf`.replace(/[\\/:*?"<>|]+/g, " ");
    const file = new File([blob], filename, { type: "application/pdf" });

    // Share or download
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: title || "Personal Wellness Pass" });
      showSaveNotice("Shared successfully!");
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      window.open("https://api.whatsapp.com/send?text=Personal%20Wellness%20Pass", "_blank");
      showSaveNotice("PDF downloaded. Attach to WhatsApp.");
    }

    // Restore
    el.style.boxShadow = originalShadow;
    document.body.classList.remove("pdf-mode");
  } catch (e) {
    console.error("Canvas Share Error:", e);
    showSaveNotice("Error: " + e.message);
  } finally {
    setSharePdfLoading(false);
  }
};


// ============================================
// INSTRUCTIONS FOR INTEGRATION
// ============================================
/*
STEP 1: Replace the current handleWhatsAppShareClean function with the FIRST version above

STEP 2: If that still shows whitespace, replace it with the handleWhatsAppShareCanvas version

STEP 3: Make sure the button is calling the correct function:

<button
  type="button"
  onClick={handleWhatsAppShareClean}  // or handleWhatsAppShareCanvas
  disabled={sharePdfLoading}
  className={`bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2 ${
    sharePdfLoading ? "opacity-70 cursor-not-allowed" : ""
  }`}
>
  <Share2 size={20} />
  {sharePdfLoading ? "Preparing…" : "Share to WhatsApp"}
</button>

DEBUGGING TIP:
After clicking the button, check the browser console for html2canvas logs.
Look for any errors or warnings about positioning, sizing, or element capture.
*/
