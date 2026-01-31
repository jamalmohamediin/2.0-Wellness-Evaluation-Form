# Mobile PDF Filename Fix - Implementation Guide

## Problem Summary
Mobile browsers (iOS Safari, Chrome Mobile, Android browsers) **ignore `document.title`** when generating PDF filenames through `window.print()`. This caused inconsistent filenames:
- **Desktop**: "Siya Kolisi 22 January 2026 Coach BT.pdf" ✅
- **Mobile**: "Personal Wellness Pass.pdf" ❌

## Solution: Hybrid Approach

The updated code now **detects the device type** and uses the optimal PDF generation method for each platform:

### Desktop (Print Dialog)
- Uses native `window.print()`
- Respects `document.title` for filename
- Gives users full printer control
- Maintains familiar UX

### Mobile (Direct Download)
- Uses `html2pdf.js` library
- Forces download with correct filename
- Bypasses unreliable print dialog
- Better mobile UX (no confusing print options)

## Code Changes

### New Functions Added

#### 1. `isMobileDevice()`
Detects mobile devices including edge cases like iPad Pro:

```javascript
const isMobileDevice = () => {
  const mobileRegex = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i;
  const isMobileUA = mobileRegex.test(navigator.userAgent);
  const isIPadPro = navigator.maxTouchPoints > 1 && /MacIntel/.test(navigator.platform);
  return isMobileUA || isIPadPro;
};
```

#### 2. `exportViaPrint()`
Extracted the original print logic for desktop:

```javascript
const exportViaPrint = () => {
  const originalTitle = document.title;
  applyPrintTitle();

  const handleAfterPrint = () => {
    document.title = originalTitle;
    const titleEl = document.querySelector("title");
    if (titleEl) titleEl.textContent = originalTitle;
    window.removeEventListener("afterprint", handleAfterPrint);
  };

  window.addEventListener("afterprint", handleAfterPrint);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
      setTimeout(handleAfterPrint, 2000);
    });
  });
};
```

#### 3. `exportViaDownload()`
New function for mobile PDF generation with proper filename:

```javascript
const exportViaDownload = async () => {
  const el = document.getElementById("wellness-pdf-source");
  if (!el) {
    showSaveNotice("Unable to generate PDF. Please try again.");
    return;
  }

  document.body.classList.add("pdf-mode");
  
  try {
    // Wait for images to load
    const imgs = el.querySelectorAll("img");
    await Promise.all(
      Array.from(imgs).map((img) => (img.decode ? img.decode() : Promise.resolve()))
    );
    await new Promise((r) => setTimeout(r, 200));
  } catch {
    /* ignore decode errors */
  }

  try {
    showSaveNotice("Generating PDF...");
    
    const title = buildPdfTitle();
    const filename = `${title || "Personal Wellness Pass"}.pdf`.replace(/[\\/:*?"<>|]+/g, " ");

    const opts = {
      margin: [10, 8, 8, 8],
      filename: filename,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.offsetHeight
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"], after: ".print-break" }
    };

    await html2pdf().set(opts).from(el).save();
    
    showSaveNotice("PDF downloaded successfully!");
  } catch (error) {
    console.error("PDF generation error:", error);
    showSaveNotice("PDF generation failed. Please try again.");
  } finally {
    document.body.classList.remove("pdf-mode");
  }
};
```

#### 4. Updated `exportToPDF()`
Now routes to the appropriate method:

```javascript
const exportToPDF = () => {
  void autosaveNow("export");
  
  if (isMobileDevice()) {
    // Mobile: Use html2pdf for direct download with correct filename
    exportViaDownload();
  } else {
    // Desktop: Use native print dialog (respects document.title)
    exportViaPrint();
  }
};
```

## Benefits

✅ **Consistent Filenames**: All devices now generate the correct filename format
✅ **Optimal UX**: Each platform uses its best method
✅ **Backward Compatible**: Desktop experience unchanged
✅ **Better Mobile UX**: Direct download instead of confusing print dialog
✅ **Fallback Handling**: Graceful error messages if PDF generation fails

## Testing Checklist

### Desktop Testing
- [ ] Windows Chrome - Print dialog opens, filename correct
- [ ] Windows Edge - Print dialog opens, filename correct
- [ ] macOS Safari - Print dialog opens, filename correct
- [ ] macOS Chrome - Print dialog opens, filename correct

### Mobile Testing
- [ ] iOS Safari - Direct download, filename correct
- [ ] iOS Chrome - Direct download, filename correct
- [ ] Android Chrome - Direct download, filename correct
- [ ] Android Firefox - Direct download, filename correct
- [ ] iPad (regular) - Direct download, filename correct
- [ ] iPad Pro - Direct download, filename correct

### Filename Format Testing
Test with these data combinations:

| Name | Date | Coach | Expected Filename |
|------|------|-------|-------------------|
| Siya Kolisi | 22-January-2026 | BT | Siya Kolisi 22 January 2026 Coach BT.pdf |
| John Smith | 15-March-2026 | Mike | John Smith 15 March 2026 Coach Mike.pdf |
| (empty) | (empty) | (empty) | Personal Wellness Pass.pdf |
| Jane Doe | 01-April-2026 | (empty) | Jane Doe 01 April 2026.pdf |

## Technical Notes

### Why This Approach?
1. **Print dialog title setting is unreliable on mobile** - No browser-agnostic solution exists
2. **html2pdf works consistently** - But adds library overhead and loses native features
3. **Hybrid gives best of both worlds** - Native experience on desktop, reliable download on mobile

### Dependencies
The app already imports `html2pdf.js`:
```javascript
import html2pdf from "html2pdf.js";
```

No additional dependencies needed.

### Edge Cases Handled
- **iPad Pro detection**: Uses touch points + platform check
- **Image loading**: Waits for images to decode before PDF generation
- **Error handling**: Shows user-friendly messages on failure
- **PDF mode styling**: Applies `.pdf-mode` class for proper rendering

## Alternative Approaches Considered

### Option 1: Always use html2pdf ❌
**Rejected**: Removes native print features on desktop, larger bundle

### Option 2: Print + Auto-download ❌
**Rejected**: Creates two PDFs, confusing UX

### Option 3: Accept limitation ❌
**Rejected**: Poor mobile experience

### Option 4: Hybrid approach ✅
**Selected**: Best UX on both platforms

## Future Improvements

1. **Optional user preference**: Let users choose print vs download on desktop
2. **Progressive enhancement**: Detect Web Share API support for better mobile sharing
3. **Offline support**: Cache PDF generation for offline use
4. **Quality settings**: Let users choose PDF quality/size

## Support

If issues arise:
1. Check browser console for errors
2. Verify `wellness-pdf-source` element exists
3. Confirm html2pdf.js is properly loaded
4. Test device detection logic

For questions or issues, refer to the original implementation in `wellness-pass.jsx` lines 643-750.
