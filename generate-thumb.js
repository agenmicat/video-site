import fs from "fs";
import { execSync } from "child_process";

const mediaDir = "./media";

const files = fs.readdirSync(mediaDir);
const videos = files.filter(f => f.endsWith(".mp4"));

videos.forEach(file => {
  const name = file.replace(".mp4", "");
  const input = `${mediaDir}/${file}`;
  const output = `${mediaDir}/${name}.jpg`;

  if (!fs.existsSync(output)) {
    try {
      // ambil durasi video
      const duration = execSync(
        `ffprobe -i "${input}" -show_entries format=duration -v quiet -of csv="p=0"`
      ).toString().trim();

      const middle = Math.floor(duration / 2);

      console.log(`Thumbnail ${file} at ${middle}s`);

      execSync(
        `ffmpeg -ss ${middle} -i "${input}" -vframes 1 -vf "scale=320:-1" "${output}"`
      );

    } catch (err) {
      console.log(`Error processing ${file}`);
    }
  }
});

console.log("Done!");