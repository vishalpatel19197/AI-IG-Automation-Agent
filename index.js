require("dotenv").config();
const { IgApiClient } = require("instagram-private-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const schedule = require("node-schedule");
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

const { getLink } = require("./chanel");

// Configuration
const SESSION_FILE = path.join(__dirname, "session.json");
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/search";

// Initialize clients
const ig = new IgApiClient();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// State management
let postedVideos = new Set();

/**************************
 * Updated Instagram Auth
 **************************/
async function initInstagram() {
  try {
    // Try to load existing session
    if (await fileExists(SESSION_FILE)) {
      const sessionData = JSON.parse(await fs.readFile(SESSION_FILE));
      await ig.state.deserialize(sessionData);
      ig.state.generateDevice(process.env.INSTAGRAM_USERNAME);
      console.log("Loaded existing session");
      return;
    }
  } catch (error) {
    console.log("No session found");
  }

  // New login flow without deprecated endpoints
  try {
    ig.state.generateDevice(process.env.INSTAGRAM_USERNAME);
    const auth = await ig.account.login(
      process.env.INSTAGRAM_USERNAME,
      process.env.INSTAGRAM_PASSWORD
    );
    console.log(`Logged in as ${auth.username}`);
    await saveSession();
  } catch (error) {
    console.error("Login failed:", error.message);
    throw error;
  }
}

async function saveSession() {
  const sessionData = await ig.state.serialize();
  await fs.writeFile(SESSION_FILE, JSON.stringify(sessionData));
}

/**************************
 * YouTube Functions
 **************************/
async function fetchLatestVideos() {
  try {
    const params = {
      part: "snippet",
      channelId: getLink(),
      maxResults: 5,
      order: "date",
      type: "video",
      key: process.env.YOUTUBE_API_KEY,
    };

    const response = await axios.get(YOUTUBE_API_URL, { params });
    return response.data.items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high.url,
    }));
  } catch (error) {
    console.error("YouTube API error:", error.message);
    return [];
  }
}

/**************************
 * AI Content Generation
 **************************/
async function generateCaption(video) {
  try {
    const prompt = `Create Instagram post caption for "${video.title}". Max 2200 chars, 5 hashtags.`;
    const result = await model.generateContent(prompt);
    return (await result.response.text()).replace(/\n+/g, "\n").trim();
  } catch (error) {
    return `${video.title}\n\n#YouTube #${video.title.split(" ")[0]} #Video`;
  }
}

/**************************
 * Instagram Posting
 **************************/
async function postToInstagram(imageUrl, caption) {
  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const imageBuffer = Buffer.from(response.data, "binary");

    await ig.publish.photo({
      file: imageBuffer,
      caption: caption.substring(0, 2200),
    });

    console.log("Posted successfully");
    return true;
  } catch (error) {
    console.error("Post failed:", error.message);
    return false;
  }
}

/**************************
 * Main Logic
 **************************/
async function automationJob() {
  try {
    const videos = await fetchLatestVideos();
    const newVideo = videos.find((v) => !postedVideos.has(v.id));

    if (newVideo) {
      const caption = await generateCaption(newVideo);
      if (await postToInstagram(newVideo.thumbnail, caption)) {
        postedVideos.add(newVideo.id);
        await savePostedVideos();
      }
    }
  } catch (error) {
    console.error("Job failed:", error);
  }
}

/**************************
 * Helpers
 **************************/
async function fileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function savePostedVideos() {
  await fs.writeFile("posted-videos.json", JSON.stringify([...postedVideos]));
}

async function loadPostedVideos() {
  try {
    const data = await fs.readFile("posted-videos.json");
    postedVideos = new Set(JSON.parse(data));
  } catch {
    postedVideos = new Set();
  }
}

/**************************
 * Initialization
 **************************/
async function main() {
  await loadPostedVideos();
  await initInstagram();

  schedule.scheduleJob("*/5 * * * *", automationJob);
  console.log("Scheduler started. First run in 15 minutes...");

  // Initial test run
  // await automationJob();
}

main().catch(console.error);
