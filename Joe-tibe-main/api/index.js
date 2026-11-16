// Vercel Serverless entry point.
// The Express app is compiled (tsc, CommonJS) into ./_server by `npm run build:api`.
// Folders starting with "_" inside /api are NOT deployed as separate functions.
const mod = require("./_server/app");
module.exports = mod.default || mod.app;
