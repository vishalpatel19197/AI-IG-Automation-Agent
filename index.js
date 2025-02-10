const schedule = require("node-schedule");
const { freshHeadLine } = require("./freshHeadLine");
const { opticVibes } = require("./opticVibes");

// async function main() {
//   await Promise.all([opticVibes(), freshHeadLine()]);
// }

// async function main() {
//   await Promise.all([opticVibes()]);
// }

async function main() {
  await Promise.all([freshHeadLine(), opticVibes()]);
}

schedule.scheduleJob("*/5 * * * *", main);

// opticVibes().catch(console.log);

console.log("Scheduler started. First run in 15 minutes...");
