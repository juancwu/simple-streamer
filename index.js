#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const util = require("util");
const path = require("path");

const PORT = process.env.PORT || 12345;
const VIDEO_PATH =
  process.argv && process.argv.length === 3
    ? path.join(process.cwd(), process.argv[2])
    : "";

if (!fs.existsSync(VIDEO_PATH)) {
  throw new Error("Video path does not exist.");
}

const stat = util.promisify(fs.stat);

const server = http.createServer(async (req, res) => {
  if (req.url === "/") {
    res.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Simple Streamer</title>
      </head>
      <body>
        <video src="/video" controls muted autoplay></video>
      </body>
    </html>
    `);
    res.end();
  } else if (req.url === "/video") {
    let { range } = req.headers;

    if (!range) {
      range = "0-" + 10 ** 6;
    }

    let videoSize = 0;
    try {
      videoSize = (await stat(VIDEO_PATH)).size;
    } catch (error) {
      res.statusCode = 500;
      res.write("Error getting video size.");
      res.end();
      return;
    }

    let chunk_size = 10 ** 6;
    let start = Number(range.split("-")[0].replace(/\D/g, ""));
    let reqEnd = Number(range.split("-")[1].replace(/\D/g, ""));
    let end = reqEnd > 0 ? reqEnd : Math.min(start + chunk_size, videoSize - 1);

    let headers = {
      "Content-Length": end - start + 1,
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${videoSize}`,
    };

    res.writeHead(206, headers);

    fs.createReadStream(VIDEO_PATH, { start, end }).pipe(res);
  }
});

server.listen(
  PORT,
  console.log.bind(null, "Stream server is listening on port: " + PORT)
);
