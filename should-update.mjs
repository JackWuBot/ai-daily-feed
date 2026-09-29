import {readFile,appendFile} from 'node:fs/promises';
import {needsScheduledUpdate} from './update-schedule.mjs';
let feed;try{feed=JSON.parse(await readFile('data/feed.json','utf8'));}catch{}
const needed=process.env.GITHUB_EVENT_NAME!=='schedule'||needsScheduledUpdate(feed);
if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`needed=${needed}\n`);
console.log(needed?'Update required: collect and translate public sources.':'Already updated for the current daily/weekly window; skip duplicate collection.');
