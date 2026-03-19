import "dotenv/config";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const publicBase = process.env.R2_PUBLIC_BASE_URL || "";
const mediaDir = "./media";
const output = "./data.json";

const files = fs.readdirSync(mediaDir);
const data = [];

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\-+/g, "-");
}

function makeMediaUrl(fileName) {
  return publicBase ? `${publicBase}/${fileName}` : `media/${fileName}`;
}

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return null;
  }
}

function getVideoDuration(filePath) {
  try {
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    )
      .toString()
      .trim();

    return Math.round(Number(result));
  } catch {
    return null;
  }
}

function parseFileMeta(fileName) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);

  const parts = base.split("__");

  let category = "Uncategorized";
  let title = base;
  let tags = [];

  if (parts.length >= 2) {
    category = parts[0].trim() || "Uncategorized";
    title = parts[1].trim() || base;
  } else if (parts.length === 1) {
    title = base;
  }

  if (parts.length >= 3) {
    tags = parts[2]
      .split("-")
      .map(tag => tag.trim())
      .filter(Boolean);
  }

  return {
    category,
    categorySlug: slugify(category),
    title,
    slug: slugify(title),
    tags
  };
}

function findMatchingThumb(name) {
  return files.find(f => {
    const thumbExt = path.extname(f).toLowerCase();
    const thumbName = path.basename(f, thumbExt);

    return (
      thumbName === name &&
      [".jpg", ".jpeg", ".png", ".webp"].includes(thumbExt)
    );
  });
}

files.forEach(file => {
  const ext = path.extname(file).toLowerCase();
  const name = path.basename(file, ext);
  const fullPath = path.join(mediaDir, file);
  const meta = parseFileMeta(file);

  // MP4 VIDEO
  if (ext === ".mp4") {
    const thumb = findMatchingThumb(name);

    data.push({
      title: meta.title,
      category: meta.category,
      categorySlug: meta.categorySlug,
      tags: meta.tags,
      slug: meta.slug,
      type: "mp4",
      kind: "video",
      src: makeMediaUrl(file),
      thumb: thumb
        ? makeMediaUrl(thumb)
        : "https://dummyimage.com/300x200/000/fff&text=No+Thumb",
      duration: getVideoDuration(fullPath),
      size: getFileSize(fullPath)
    });
  }

  // HLS / M3U8 STREAM
  else if (ext === ".m3u8") {
    const thumb = findMatchingThumb(name);

    data.push({
      title: meta.title,
      category: meta.category,
      categorySlug: meta.categorySlug,
      tags: meta.tags,
      slug: meta.slug,
      type: "m3u8",
      kind: "stream",
      src: makeMediaUrl(file),
      thumb: thumb
        ? makeMediaUrl(thumb)
        : "https://dummyimage.com/300x200/000/fff&text=Stream",
      size: getFileSize(fullPath)
    });
  }

  // IMAGE
  else if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    const isUsedAsThumb = files.some(f => {
      const mediaExt = path.extname(f).toLowerCase();
      const mediaName = path.basename(f, mediaExt);

      return mediaName === name && [".mp4", ".m3u8"].includes(mediaExt);
    });

    if (!isUsedAsThumb) {
      data.push({
        title: meta.title,
        category: meta.category,
        categorySlug: meta.categorySlug,
        tags: meta.tags,
        slug: meta.slug,
        type: "image",
        kind: "image",
        src: makeMediaUrl(file),
        thumb: makeMediaUrl(file),
        size: getFileSize(fullPath)
      });
    }
  }
});

// optional: sort by title biar stabil
data.sort((a, b) => a.title.localeCompare(b.title));

fs.writeFileSync(output, JSON.stringify(data, null, 2));
console.log("data.json generated with full metadata!");