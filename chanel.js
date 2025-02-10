let tokens = [
  "UCYPvAwZP8pZhSMW8qs7cVCw",
  "UCZFMm1mMw0F81Z37aaEzTUA",
  "UC9CYT9gSNLevX5ey2_6CK0Q",
  "UCttspZesZIDEwwpVIgoZtWQ",
  "UCckHqySbfy5FcPP6MD_S-Yg",
  "UCuFFtHWoLl5fauMMD5Ww2jA",
  "UChLtXXpo4Ge1ReTEboVvTDg",
  "UC83jt4dlz1Gjl58fzQrrKZg",
  "UCBi2mrWuNuyYy4gbM6fU18Q",
  "UCXIJgqnII2ZOINSWNOGFThA",
  "UCJg9wBPyKMNA5sRDnvzmkdg",
];
const titles = [
  "beach",
  "ocean",
  "nature",
  "sea",
  "wallpaper",
  "water",
  "travel",
  "tropical",
  "surf",
  "summer",
  "view",
];

function getLink() {
  return tokens[genNumber(tokens.length)];
}

function getTitle() {
  return titles[genNumber(titles.length)];
}

const genNumber = (no) => Math.floor(Math.random() * no);

module.exports = {
  getLink,
  getTitle,
};
