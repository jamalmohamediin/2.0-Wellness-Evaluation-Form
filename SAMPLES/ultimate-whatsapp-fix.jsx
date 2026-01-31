// ============================================
// ULTIMATE WHATSAPP FIX - GUARANTEED SOLUTION
// ============================================

/* 
THE PROBLEM:
html2canvas is capturing the element with extra whitespace at the top,
pushing content to the bottom of the page.

ROOT CAUSES:
1. The element might have inherited height/positioning from parent containers
2. html2canvas might be capturing the Y-offset position as whitespace
3. Shadow/margins might be adding to the bounding box
4. The element might have flex/grid layouts causing height issues

THE SOLUTION:
We'll create a completely isolated, clean copy of the content
in a fixed-position container at 0,0 with explicit dimensions.
*/

// REPLACE your handleWhatsAppShareClean function with THIS:

const handleWhatsAppShareClean = async () => {
  if (sharePdfLoading) return;

  const sourceEl = document.getElementById("wellness-pdf-source");
  if (!sourceEl) {
    showSaveNotice("Content not found.");
    return;
  }

  setSharePdfLoading(true);
  document.body.classList.add("pdf-mode");

  // Create isolated rendering container
  const renderContainer = document.createElement("div");
  renderContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: auto;
    margin: 0;
    padding: 0;
    z-index: 9999;
    background: white;
    overflow: visible;
    pointer-events: none;
  `;
  
  document.body.appendChild(renderContainer);

  try {
    // Clone the content
    const clone = sourceEl.cloneNode(true);
    clone.id = "pdf-render-clone";
    
    // Strip ALL potentially problematic styles
    clone.style.cssText = `
      position: relative !important;
      top: 0 !important;
      left: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      transform: none !important;
      width: 100% !important;
      max-width: none !important;
    `;

    // Remove shadows from all child elements
    const allElements = clone.querySelectorAll("*");
    allElements.forEach((el) => {
      el.style.boxShadow = "none";
    });

    renderContainer.appendChild(clone);

    // Wait for images and rendering
    const imgs = clone.querySelectorAll("img");
    await Promise.all(
      Array.from(imgs).map((img) => {
        if (img.decode) return img.decode();
        return new Promise((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = resolve;
            img.onerror = resolve;
          }
        });
      })
    );
    
    // Extra wait for layout to stabilize
    await new Promise((r) => setTimeout(r, 600));

    // Get actual dimensions after rendering
    const rect = clone.getBoundingClientRect();

    console.log("Element dimensions:", {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left
    });

    // PDF options with ABSOLUTE zero positioning
    const opts = {
      margin: 0,
      filename: "",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: true,
        scrollY: 0,
        scrollX: 0,
        windowWidth: rect.width,
        windowHeight: rect.height,
        backgroundColor: "#ffffff",
        x: 0,
        y: 0,
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
        after: ".print-break"
      }
    };

    // Generate PDF from the isolated clone
    const blob = await html2pdf().set(opts).from(clone).outputPdf("blob");

    // Clean up the render container
    document.body.removeChild(renderContainer);

    if (!blob || blob.size < 500) {
      showSaveNotice("Failed to generate PDF.");
      return;
    }

    const title = buildPdfTitle();
    const filename = `${title || "Personal Wellness Pass"}.pdf`.replace(/[\\/:*?"<>|]+/g, " ");
    const file = new File([blob], filename, { type: "application/pdf" });

    // Try to share
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: title || "Personal Wellness Pass"
      });
      showSaveNotice("Shared successfully!");
    } else {
      // Fallback: download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Open WhatsApp
      const whatsappUrl = "https://api.whatsapp.com/send?text=Personal%20Wellness%20Pass";
      window.open(whatsappUrl, "_blank");

      showSaveNotice("PDF downloaded. Attach to WhatsApp manually.");
    }

  } catch (e) {
    console.error("WhatsApp Share Error:", e);
    console.error("Error stack:", e.stack);
    showSaveNotice("Error: " + e.message);
    
    // Try to clean up on error
    if (document.body.contains(renderContainer)) {
      document.body.removeChild(renderContainer);
    }
  } finally {
    document.body.classList.remove("pdf-mode");
    setSharePdfLoading(false);
  }
};


// ============================================
// DIAGNOSTIC VERSION - USE THIS TO DEBUG
// ============================================
// If you want to SEE what's being captured, use this version
// It will show you the render container before generating PDF

const handleWhatsAppShareDiagnostic = async () => {
  if (sharePdfLoading) return;

  const sourceEl = document.getElementById("wellness-pdf-source");
  if (!sourceEl) {
    showSaveNotice("Content not found.");
    return;
  }

  setSharePdfLoading(true);
  document.body.classList.add("pdf-mode");

  // Create VISIBLE rendering container for diagnosis
  const renderContainer = document.createElement("div");
  renderContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 20px;
    z-index: 9999;
    background: red;
    overflow: auto;
    border: 5px solid blue;
  `;
  
  document.body.appendChild(renderContainer);

  // Clone and show
  const clone = sourceEl.cloneNode(true);
  clone.style.cssText = `
    position: relative !important;
    background: white !important;
    border: 3px solid green !important;
  `;
  
  renderContainer.appendChild(clone);

  // Wait to see it
  await new Promise((r) => setTimeout(r, 3000));

  // Remove and continue
  document.body.removeChild(renderContainer);
  document.body.classList.remove("pdf-mode");
  setSharePdfLoading(false);
  
  showSaveNotice("Diagnostic complete. Check what you saw.");
};


// ============================================
// WHAT TO TELL YOUR ASSISTANT
// ============================================
/*
"Please replace the handleWhatsAppShareClean function with the new version I'm providing.

This new version:
1. Creates a completely isolated rendering container at position 0,0
2. Clones the content into this clean container
3. Removes ALL shadows and problematic styling
4. Forces explicit positioning and dimensions
5. Captures from this isolated element with zero offsets
6. Cleans up completely after generation

Key changes:
- Uses position: fixed at 0,0 for the render container
- Strips all margin/padding/shadow from clone
- Forces width: 100% and removes max-width constraints
- Uses the clone's actual rendered dimensions for html2canvas
- Has better error handling and cleanup
- Includes console.log for debugging

If this still doesn't work, use the handleWhatsAppShareDiagnostic function
to VISUALLY see what's being captured. This will help identify the issue.

The diagnostic version shows the render container with colored borders
for 3 seconds so you can see exactly what html2canvas will capture.
"
*/
