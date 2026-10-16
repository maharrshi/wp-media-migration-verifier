# Media Verifier using Playwright

An automated QA tool, built with Playwright and Node.js, that checks whether large numbers of media files (images and videos) are reachable and usable after a content migration. It reads lists of relative media paths, builds the public URL for each one, and then checks each file: an HTTP HEAD request first, then rendering in a real browser for formats browsers can display, or a download check for formats they cannot (TIFF, MOV, HEIC and others). Tests run in parallel. Results are written to NDJSON and to an HTML summary grouped by source archive, so you can quickly see which files are missing or broken and why.

**Tech:** Playwright, Node.js, JavaScript

## Results

Used on a WordPress VIP media migration to verify about 78,000 media files across 327 archives. Tests ran in parallel, and failures were grouped by type and by source archive in the report.

## Features

- **Smart media verification:** detects whether a file can be shown in the browser or must be downloaded, and checks it the right way
- **Parallel execution:** uses multiple workers (by default, 75% of available CPU cores) and supports sharding across machines
- **Full coverage or sampling:** tests every file, or a random sample per file type for quick smoke runs (see [Coverage mode](#coverage-mode))
- **Wide format support:** images (JPG, PNG, GIF, WEBP, SVG, BMP, TIFF, HEIC, JFIF) and videos (MP4, MOV, WEBM, MKV, M4V)
- **Detailed reporting:** NDJSON results plus an HTML summary with pass/fail status, HTTP status and failure notes
- **Retry logic:** retries each failed test once to rule out network flakiness
- **Grouped results:** results are grouped by source archive, which makes failures easy to triage

## How It Works

### 1. Input preparation
Put text files of media paths in `data/text_files/`, one relative path per line:

```
uploads/2024/01/sample-image.jpg
uploads/2024/01/sample-logo.png
uploads/2024/02/sample-video.mp4
```

If the media comes as ZIP archives, `server-scripts/process_all_zips.sh` can create these lists for you (see [Generating input lists from archives](#generating-input-lists-from-archives)).

### 2. Test set generation
`src/groupByExtension.js` reads every `.txt` file in `data/text_files/` and groups the paths by extension. It writes the test set to `data/samples.json`, either every supported file or a random sample per extension, depending on `SAMPLE_SIZE`.

### 3. Test execution
Each media file is checked in up to three steps:

**HEAD check (no navigation)**
- Sends an HTTP HEAD request and checks the status
- Reads the `Content-Type` and `Content-Disposition` headers to decide whether the browser can render the file

**Renderable media (browser navigation)**
- Images: there is an `<img>` element and its natural width is greater than 0
- SVG: there is an `<svg>` element
- Video: there is a `<video>` element

**Non-renderable media (download verification)**
- Triggers a download for formats such as TIFF, MOV and HEIC
- Checks that the download finishes and the file is larger than 0 bytes

### 4. Report generation
`generate-html-report.js` turns `results.ndjson` into `summary.html`.

## Installation

### Prerequisites
- Node.js 18 or higher
- npm

### Setup

```bash
git clone <repository-url>
cd media-verifier-using-playwright
npm install
npx playwright install chromium
cp .env.example .env   # then set MEDIA_BASE_URL
```

## Configuration

Settings come from environment variables. You can also put them in a `.env` file in the project root. The project reads this file itself, with no extra dependency, and variables already set in your shell take precedence.

| Variable | Default | Description |
|----------|---------|-------------|
| `MEDIA_BASE_URL` | `https://example.com/wp-content` | Base URL that each relative media path is appended to |
| `SAMPLE_SIZE` | `50` | Files to test per extension, per input file. `all` or `0` tests every file |

With `MEDIA_BASE_URL=https://example.com/wp-content`, the path `uploads/2024/01/sample-image.jpg` is tested as:

```
https://example.com/wp-content/uploads/2024/01/sample-image.jpg
```

### Coverage mode

- **Full coverage:** `npm run verify:full` (or `SAMPLE_SIZE=all npm run verify`) tests every supported file in the input lists. Use this for migration sign-off.
- **Sampled:** `npm run verify` tests up to `SAMPLE_SIZE` random files per extension (default 50) for each input file. This is useful as a quick smoke check. Extensions with fewer files than the sample size are always tested in full.

### Playwright configuration
You can change these settings in `playwright.config.js`:

- **Workers:** 75% of CPU cores by default (2 on CI)
- **Timeout:** 30 seconds per test
- **Retries:** 1 retry for failed tests
- **Headless mode:** on by default

### Supported media types

**Images**
- Browser-renderable: JPG, JPEG, PNG, GIF, WEBP, BMP, SVG
- Download-only: TIFF, HEIC, JFIF

**Videos**
- Browser-renderable: MP4, WEBM
- Download-only: MOV, MKV, M4V

## Usage

```bash
# Quick sampled run (up to 50 files per extension)
npm run verify

# Full run: every file
npm run verify:full

# HTML summary of the last run
npm run report
```

### Available scripts

| Command | Description |
|---------|-------------|
| `npm run group` | Generate `data/samples.json` only |
| `npm test` | Run Playwright tests against the existing `data/samples.json` |
| `npm run verify` | Generate a sampled test set and run the tests |
| `npm run verify:full` | Generate a test set of every file and run the tests |
| `npm run verify:workers N` | Generate a test set and run it with N workers |
| `npm run test:shard` | Run tests with sharding for distributed execution |
| `npm run report` | Generate the HTML summary report |

### Performance tips

```bash
# Tune the worker count
npm run verify:workers 8

# Split a full run across machines
SAMPLE_SIZE=all npm run group
npx playwright test --shard=1/3   # machine 1
npx playwright test --shard=2/3   # machine 2
npx playwright test --shard=3/3   # machine 3

# Only test certain types
npx playwright test --grep="jpg|png"
```

## Generating input lists from archives

`server-scripts/process_all_zips.sh` extracts each media archive one at a time, records every file path inside it to `text_file_for_<archive>.txt`, and then deletes the extracted files. This keeps disk usage low even when there are many large archives.

```bash
ZIPS_DIR=/path/to/media-archives bash server-scripts/process_all_zips.sh
# then copy the generated text_file_for_*.txt files into data/text_files/
```

You can override `ZIP_PATTERN` (default `uploads_chunk_*.zip`) and `MEDIA_ROOT` (default `uploads`) if your archives use different names.

## Output and Reports

### NDJSON results (`results.ndjson`)
Each line holds one result:

```json
{
  "zip": "example_chunk_001",
  "file": "uploads/2024/01/sample-image.jpg",
  "url": "https://example.com/wp-content/uploads/2024/01/sample-image.jpg",
  "isRenderable": true,
  "status": 200,
  "result": "PASS",
  "notes": ""
}
```

### HTML summary (`summary.html`)
- Overall pass/fail totals
- Results grouped by source archive, with per-archive counts
- A link to each media URL
- Colour-coded status and failure notes (for example `HTTP 404`, `Image width = 0`, `No download triggered`)

### Playwright reports
- HTML: `playwright-report/` (open it with `npx playwright show-report`)
- JSON: `test-results.json`

## Project Structure

```
media-verifier-using-playwright/
├── src/
│   ├── verifyMedia.spec.js      # Main test file
│   ├── groupByExtension.js      # Test set generation (sampling / full coverage)
│   ├── utils.js                 # Helpers, env config, URL builder
│   └── global-setup.js          # Initializes the results file before workers start
├── data/
│   └── text_files/              # Input: text files with media paths
│       └── example_chunk_001.txt
├── server-scripts/
│   └── process_all_zips.sh      # Builds input lists from media archives
├── generate-html-report.js      # HTML summary generator
├── playwright.config.js         # Playwright configuration
├── .env.example                 # Example configuration
└── package.json
```

The following files are created when you run the tool and are listed in `.gitignore`: `data/samples.json`, `results.ndjson`, `summary.html`, `test-results.json`, `playwright-report/` and `test-results/`.
