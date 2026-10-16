import { test, expect, request } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { buildFinalUrl } from './utils.js';

const samples = JSON.parse(fs.readFileSync(path.join('data', 'samples.json')));

// Results file is initialized by global-setup.js before workers start
// fs.appendFile is safe for concurrent writes from multiple workers

test.describe('Smart Media Verification', () => {

  for (const item of samples) {
    test(`Verify ${item.filePath}`, async ({ page }) => {
      const url = buildFinalUrl(item.filePath);

      let status = 0;
      let result = 'FAIL';
      let notes = '';
      let isRenderable = false;

      // -------------------------------------------------------------
      // 1. HEAD CHECK (NO NAVIGATION)
      // -------------------------------------------------------------
      const api = await request.newContext();
      const head = await api.head(url);
      status = head.status();

      if (status !== 200) {
        notes = `HTTP ${status}`;
      } else {
        const ctype = head.headers()['content-type'] || '';
        const cdisp = head.headers()['content-disposition'] || '';
        const isAttachment = cdisp.includes('attachment');

        // Browser-renderable image MIME types
        const renderableImages = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/bmp',
          'image/svg+xml',
        ];

        // Browser-renderable video MIME types ONLY (NOT .mov / quicktime etc.)
        const renderableVideos = ['video/mp4', 'video/webm', 'video/ogg'];

        const isBrowserImage = renderableImages.includes(ctype);
        const isBrowserVideo = renderableVideos.includes(ctype);

        // TIFF, MOV, HEIC, DV, QuickTime, etc. → NOT renderable
        if (!isAttachment && (isBrowserImage || isBrowserVideo)) {
          isRenderable = true;
        }
      }

      // -------------------------------------------------------------
      // 2. RENDERABLE → SAFE page.goto()
      // -------------------------------------------------------------
      if (isRenderable) {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
        status = response?.status() || 0;

        if (status !== 200) {
          notes = `HTTP ${status}`;
        } else {
          const ctype = head.headers()['content-type'];

          // -----------------------
          // NORMAL IMAGES (JPG/PNG/GIF/WEBP/BMP)
          // -----------------------
          if (ctype.startsWith('image/') && ctype !== 'image/svg+xml') {
            const img = page.locator('img');
            if (await img.count() > 0) {
              const width = await img.first().evaluate((x) => x.naturalWidth);
              if (width > 0) {
                result = 'PASS';
              } else {
                notes = 'Image width = 0';
              }
            } else {
              notes = 'No <img> tag';
            }
          }

          // -----------------------
          // SVG validation
          // -----------------------
          if (ctype === 'image/svg+xml') {
            const svg = page.locator('svg');
            if (await svg.count() > 0) {
              result = 'PASS';
            } else {
              notes = 'No <svg> tag';
            }
          }

          // -----------------------
          // VIDEO validation
          // -----------------------
          if (ctype.startsWith('video/')) {
            const video = page.locator('video');
            if (await video.count() > 0) {
              result = 'PASS';
            } else {
              notes = 'No <video> tag';
            }
          }
        }
      }

      // -------------------------------------------------------------
      // 3. NON-RENDERABLE → FORCE DOWNLOAD CHECK
      // -------------------------------------------------------------
      else {
        try {
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 5000 }),
            page.evaluate((u) => {
              window.location.href = u;
            }, url),
          ]);

          const tempFile = await download.path().catch(() => null);

          if (tempFile) {
            const size = (await fs.promises.stat(tempFile)).size;
            if (size > 0) {
              result = 'PASS';
              notes = 'Downloaded OK';
            } else {
              notes = 'Downloaded file size = 0';
            }
          } else {
            notes = 'Download triggered but no file returned';
          }
        } catch {
          notes = 'No download triggered';
        }
      }

      // -------------------------------------------------------------
      // 4. WRITE TO NDJSON FILE BEFORE ASSERTING
      // -------------------------------------------------------------
      await fs.promises.appendFile(
        'results.ndjson',
        JSON.stringify({
          zip: item.zipName,
          file: item.filePath,
          url,
          isRenderable,
          status,
          result,
          notes,
        }) + '\n',
      );

      // -------------------------------------------------------------
      // 5. ASSERT FAILURE AFTER WRITING REPORT
      // -------------------------------------------------------------
      if (result === 'FAIL') {
        expect(false, `ZIP: ${item.zipName} | FILE: ${item.filePath} | ${notes}`).toBe(true);
      }
    });

  }
});
