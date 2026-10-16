#!/bin/bash
#
# process_all_zips.sh
#
# Builds the input lists for the media verifier from a folder of media
# archives. For each ZIP matching ZIP_PATTERN in ZIPS_DIR, it extracts the
# archive, writes every file path under the extracted MEDIA_ROOT folder to
# text_file_for_<archive-name>.txt, then removes the extracted files before
# moving on to the next archive.
#
# Copy the resulting .txt files into data/text_files/ in this project.
#
# Usage:
#   ZIPS_DIR=/path/to/archives bash process_all_zips.sh
#

# Directory containing the media ZIP archives (placeholder; override via env)
ZIPS_DIR="${ZIPS_DIR:-/path/to/media-archives}"

# Archive name pattern and top-level folder each archive extracts to
ZIP_PATTERN="${ZIP_PATTERN:-uploads_chunk_*.zip}"
MEDIA_ROOT="${MEDIA_ROOT:-uploads}"

# Navigate to the directory containing the zip files
cd "$ZIPS_DIR" || exit 1

echo "Starting ZIP processing in $ZIPS_DIR ..."

# Loop through all zip files in sorted order
for zipfile in $ZIP_PATTERN; do

    echo "Processing $zipfile ..."

    # Extract base name without extension
    base_name=$(basename "$zipfile" .zip)

    # Create text file name
    output_txt="text_file_for_${base_name}.txt"

    # Clear previous extracted folder if it exists (safety)
    rm -rf "$MEDIA_ROOT"

    # Unzip this ZIP (expected to contain $MEDIA_ROOT/)
    unzip -q "$zipfile"

    # Check if the extracted folder exists
    if [ ! -d "$MEDIA_ROOT" ]; then
        echo "ERROR: $MEDIA_ROOT folder not found after unzipping $zipfile"
        echo "" > "$output_txt"
        continue
    fi

    # Find all files and save to the text file
    find "$MEDIA_ROOT" -type f > "$output_txt"

    echo "Created $output_txt with file list."

    # Delete extracted folder for next iteration
    rm -rf "$MEDIA_ROOT"

    echo "Cleaned $MEDIA_ROOT folder."
    echo "----------------------------------------"

done

echo "All ZIP files processed successfully."
