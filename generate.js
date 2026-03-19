import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const mediaDir = "./media";
const output = "./data.json";

const files = fs.readdirSync(mediaDir);
const data = [];

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

files.forEach(file => {
  const ext = path.extname(file).toLowerCase();
  const name = path.basename(file, ext);
  const fullPath = path.join(mediaDir, file);

  // VIDEO MP4
  if (ext === ".mp4") {
    const thumb =
      files.find(f => {
        const thumbExt = path.extname(f).toLowerCase();
        const thumbName = path.basename(f, thumbExt);
        return (
          thumbName === name &&
          [".jpg", ".jpeg", ".png", ".webp"].includes(thumbExt)
        );
      }) ||
      "https://dummyimage.com/300x200/000/fff&text=No+Thumb";

    data.push({
      title: name,
      type: "mp4",
      kind: "video",
      src: `media/${file}`,
      thumb: typeof thumb === "string" && thumb.startsWith("http")
        ? thumb
        : `media/${thumb}`,
      duration: getVideoDuration(fullPath),
      size: getFileSize(fullPath)
    });
  }

  // M3U8 STREAM
  else if (ext === ".m3u8") {
    const thumb = files.find(f => {
      const thumbExt = path.extname(f).toLowerCase();
      const thumbName = path.basename(f, thumbExt);
      return (
        thumbName === name &&
        [".jpg", ".jpeg", ".png", ".webp"].includes(thumbExt)
      );
    });

    data.push({
      title: name,
      type: "m3u8",
      kind: "stream",
      src: `media/${file}`,
      thumb: thumb
        ? `media/${thumb}`
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
        title: name,
        type: "image",
        kind: "image",
        src: `media/${file}`,
        thumb: `media/${file}`,
        size: getFileSize(fullPath)
      });
    }
  }
});

fs.writeFileSync(output, JSON.stringify(data, null, 2));
console.log("data.json generated with metadata!");