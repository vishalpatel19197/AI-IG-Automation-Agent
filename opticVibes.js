require("dotenv").config();
const axios = require("axios");
const { IgApiClient } = require("instagram-private-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createWriteStream } = require("fs");
const { readFile, unlink } = require("fs").promises;
const fs = require("fs").promises;
const { join } = require("path");
const { getTitle } = require("./chanel");

// Configuration
const SESSION_FILE = join(__dirname, "optic_session.json");
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY;
const ig = new IgApiClient();
const DEEZER_API_URL = 'https://api.deezer.com/search/album?q=Moonbeam';

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

async function fetchUnsplashImage() {
  try {
    const response = await axios.get("https://api.unsplash.com/photos/random", {
      params: {
        query: getTitle(),
        // query:"nature",
        orientation: "portrait",
        per_page: 1,
      },
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    if (!response.data.urls) {
      throw new Error("No images found");
    }

    const randomImage = response.data;

    return {
      url: randomImage.urls.regular,
      description: randomImage.alt_description || "Nature scene",
      downloadLocation: randomImage.links.download_location,
    };
  } catch (error) {
    console.error("Unsplash API Error:", error.message);
    throw error;
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

/**************************
 * Updated Instagram Auth
 **************************/
async function initInstagram() {
  try {
    // Try to load existing session
    if (await fileExists(SESSION_FILE)) {
      const sessionData = JSON.parse(await fs.readFile(SESSION_FILE));
      await ig.state.deserialize(sessionData);
      ig.state.generateDevice(process.env.OPTIC_INSTA_USERNAME);
      console.log("Loaded existing session");
      return;
    }
  } catch (error) {
    console.log("No session found");
  }

  // New login flow without deprecated endpoints
  try {
    ig.state.generateDevice(process.env.OPTIC_INSTA_USERNAME);
    const auth = await ig.account.login(
      process.env.OPTIC_INSTA_USERNAME,
      process.env.OPTIC_INSTA_PASSWORD
    );
    console.log(`Logged in as ${auth.username}`);
    await saveSession();
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
}

async function saveSession() {
  const sessionData = await ig.state.serialize();
  await fs.writeFile(SESSION_FILE, JSON.stringify(sessionData));
}

async function generateContent(imageDescription) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Create an Instagram post for the '${getTitle()}'. 
      Description: ${imageDescription}
      Provide a creative caption and 5 relevant hashtags. 
      Format: JSON with "caption" and "hashtags" keys.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean response text and parse JSON
    const cleanText = text.replace(/```json|```/g, "");
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("AI Generation Error:", error);
    return {
      caption: "Check out this beautiful nature scene! 🌿",
      hashtags: "#nature #photography #landscape #beautiful #outdoors",
    };
  }
}

// async function uploadToInstagram(imageUrl, caption) {
//   try {
//     const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
//     const imageBuffer = Buffer.from(response.data, "binary");

//   } catch (error) {
//     console.error("Post failed:", error);
//     return false;
//   }
// }

async function opticVibes() {
  let imagePath;
  try {
    await initInstagram();

    // Fetch image from Unsplash
    const image = await fetchUnsplashImage();
    console.log("Fetched image:", image.url);

    // Generate content
    const content = await generateContent(image.description);
    console.log("Generated content:", content);

    // Download image
    imagePath = join(__dirname, "temp_image.jpg");
    const writer = createWriteStream(imagePath);
    const imageResponse = await axios({
      url: image.url,
      method: "GET",
      responseType: "stream",
    });

    // Pipe image to file
    imageResponse.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // Read image file into buffer
    const imageBuffer = await readFile(imagePath);

    // Upload to Instagram
    await ig.publish.photo({
      file: imageBuffer,
      caption: `${content.caption}\n\n${content.hashtags}`.substring(0, 2200),
    });

    console.log("Posted successfully to Instagram");
    return true;
  } catch (error) {
    console.error("Main Process Error:", error);
    throw error; // Re-throw for proper error handling
  } finally {
    // Cleanup temp file
    if (imagePath) {
      try {
        await unlink(imagePath);
        console.log("Temporary file cleaned up");
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }
    }
  }
}

module.exports = {
  opticVibes,
};
