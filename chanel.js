let tokens = [
    "UCYPvAwZP8pZhSMW8qs7cVCw",
    "UCZFMm1mMw0F81Z37aaEzTUA",
    "UC9CYT9gSNLevX5ey2_6CK0Q",
    "UCckHqySbfy5FcPP6MD_S-Yg",
    "UCuFFtHWoLl5fauMMD5Ww2jA",
    "UChLtXXpo4Ge1ReTEboVvTDg",
    "UC83jt4dlz1Gjl58fzQrrKZg",
    "UCBi2mrWuNuyYy4gbM6fU18Q",
    "UCXIJgqnII2ZOINSWNOGFThA",
    "UCJg9wBPyKMNA5sRDnvzmkdg"
]

function getLink(){
 // Get the length of the array
 const arrLength = tokens.length;

 // Generate a random index from 0 to (array length - 1)
 const randomIndex = Math.floor(Math.random() * arrLength);

 return tokens[randomIndex];
}

module.exports = {
    getLink
}