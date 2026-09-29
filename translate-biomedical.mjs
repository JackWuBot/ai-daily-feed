// Translate public titles/excerpts; source records and unchanged translations are preserved.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export const METHOD='google-public-en-zh-v1';
export const sourceText=item=>[item.originalTitle||item.title,item.originalSummary||item.summary];
const chinese=text=>typeof text==='string'&&/[\u4e00-\u9fff]/.test(text);
let nextRequestAt=0;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function normalizeDates(text){return text.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\.?\s*(\d{1,2}),?\s+(\d{4})\b/gi,(_,month,day,year)=>`${year}-${String(['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(month.slice(0,3).toLowerCase())+1).padStart(2,'0')}-${day.padStart(2,'0')}`);}
export function needsTranslation(item){
 if(!item.biomedicalTopics?.length)return false;
 const [title,summary]=sourceText(item),t=item.biomedicalTranslation;
 return !(t&&t.sourceTitle===title&&t.sourceSummary===summary&&chinese(t.title)&&chinese(t.summary)&&[METHOD,'reviewed-zh'].includes(t.method)&&(t.dateFormatVersion===1||t.method==='reviewed-zh'||normalizeDates(title+summary)===title+summary));
}
export function applyTranslation(item,title,summary){
 if(!chinese(title)||!chinese(summary)||title.length>700||summary.length>2000)throw new Error('Invalid Chinese translation');
 const [sourceTitle,sourceSummary]=sourceText(item);
 return {...item,biomedicalTranslation:{title:title.trim(),summary:summary.trim(),sourceTitle,sourceSummary,method:METHOD,dateFormatVersion:1}};
}
export async function translate(text,fetcher=fetch){
 if(chinese(text))return text;
 text=normalizeDates(text);
 const url=new URL('https://translate.googleapis.com/translate_a/single');
 url.search=new URLSearchParams({client:'gtx',sl:'en',tl:'zh-CN',dt:'t',q:text}).toString();
 // Public translation endpoint: no availability guarantee. Cache successes and retry failures next run.
 for(let attempt=0;attempt<3;attempt++){
  try{
   if(fetcher===fetch){await pause(Math.max(0,nextRequestAt-Date.now()));nextRequestAt=Date.now()+2000;}
   const response=await fetcher(url,{signal:AbortSignal.timeout(20000)});
   if(!response.ok){const error=new Error('Translation HTTP '+response.status);error.status=response.status;const retry=response.headers?.get('retry-after');error.retryAfterMs=retry?(Number.isFinite(Number(retry))?Number(retry)*1000:Date.parse(retry)-Date.now()):0;throw error;}
   const payload=await response.json();
   const result=payload[0].filter(part=>part&&typeof part[0]==='string').map(part=>part[0]).join('');
   if(!chinese(result))throw new Error('Translation did not contain Chinese');
   return result;
  }catch(error){if(attempt===2)throw error;const delay=error.status===429?Math.max(30000*2**attempt,error.retryAfterMs||0):1000*2**attempt;if(delay>120000)throw error;await pause(delay);}
 }
}
export async function main(path='data/feed.json'){
 const feed=JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''));
 const queue=feed.items.map((item,index)=>needsTranslation(item)?index:-1).filter(index=>index>=0);
 // Retired translations contained medical terminology errors; never display them as a fallback.
 for(const index of queue)delete feed.items[index].biomedicalTranslation;
 let next=0,translated=0,failed=0;
 async function worker(){
  while(next<queue.length){const index=queue[next++],item=feed.items[index];
   try{feed.items[index]=applyTranslation(item,await translate(item.title),await translate(item.summary));translated++;}
   catch(error){failed++;console.warn(`::warning::Biomedical translation pending: ${item.id} (${error.message})`);if(error.status===429){console.warn('::warning::Translation service is rate limited; keep remaining originals and resume on the next recovery run.');next=queue.length;}}
   if((translated+failed)%25===0)console.log(`Biomedical translations: ${translated+failed}/${queue.length}`);
  }
 }
 await worker();
 const pending=feed.items.filter(needsTranslation).length;
 feed.biomedicalTranslationStatus={translated,pending,failed,method:METHOD};
 await writeFile(path+'.biomedical.tmp',JSON.stringify(feed,null,2)+'\n');await rename(path+'.biomedical.tmp',path);
 console.log(JSON.stringify(feed.biomedicalTranslationStatus));
 if(pending)throw new Error(`${pending} biomedical items remain untranslated; retained original text for retry.`);
 return feed;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main(process.argv[2]);
