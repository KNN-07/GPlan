// Browser-only QA instrumentation. No application or graphics code depends on this.
export async function installCanvasProof(page) {
  await page.addInitScript(() => {
    let queued = false;
    let sequence = 0;
    const prototype = WebGL2RenderingContext.prototype;
    for (const method of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
      const original = prototype[method];
      prototype[method] = function (...args) {
        const result = original.apply(this, args);
        const gl = this;
        if (!queued && gl.canvas instanceof HTMLCanvasElement && gl.canvas.closest(".exercise-viewer")) {
          queued = true;
          // End of the real renderer's task, before the drawing buffer is discarded.
          queueMicrotask(() => {
            queued = false;
            if (!gl.canvas.isConnected || gl.getParameter(gl.FRAMEBUFFER_BINDING) !== null) return;
            const width = gl.drawingBufferWidth;
            const height = gl.drawingBufferHeight;
            const pixels = new Uint8Array(width * height * 4);
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            let litPixels = 0;
            let highlightPixels = 0;
            let fingerprint = 0;
            for (let i = 0; i < pixels.length; i += 4) {
              const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
              if (r + g + b > 300 && pixels[i + 3] > 0) litPixels++;
              if (g > r * 1.07 && g > b * 1.2 && g > 80) highlightPixels++;
              if (i % 64 === 0) fingerprint = (Math.imul(fingerprint, 31) + r + g * 3 + b * 7) >>> 0;
            }
            const proof = { sequence: ++sequence, width, height, litPixels, highlightPixels, fingerprint };
            globalThis.gplanCanvasProof = proof;
            window.dispatchEvent(new CustomEvent("gplan-canvas-drawn", { detail: proof }));
          });
        }
        return result;
      };
    }
  });
}

export async function armCanvasProof(page) {
  await page.evaluate(() => {
    globalThis.gplanNextCanvasProof = new Promise((resolve, reject) => {
      const deadline = setTimeout(() => {
        window.removeEventListener("gplan-canvas-drawn", drawn);
        reject(new Error(`No nonempty rendered figure within deadline: ${JSON.stringify(globalThis.gplanCanvasProof)}`));
      }, 10000);
      function drawn(event) {
        const proof = event.detail;
        // Reject an empty dark framebuffer or only the stage/grid: require lit anatomy AND muscle color.
        if (proof.litPixels < 100 || proof.highlightPixels < 20) return;
        clearTimeout(deadline);
        window.removeEventListener("gplan-canvas-drawn", drawn);
        resolve(proof);
      }
      window.addEventListener("gplan-canvas-drawn", drawn);
    });
  });
}

export async function renderedCanvasProof(page) {
  return page.evaluate(() => globalThis.gplanNextCanvasProof);
}
