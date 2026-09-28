// Shared by the hosted app and the GitHub Actions collector. No runtime dependencies.
export const SOURCES = [
 { id:'openai', name:'OpenAI', url:'https://openai.com/news/rss.xml', home:'https://openai.com/news/', kind:'rss', category:'vendor' },
 { id:'deepmind', name:'Google DeepMind', url:'https://deepmind.google/blog/rss.xml', home:'https://deepmind.google/blog/', kind:'rss', category:'algorithm' },
 { id:'huggingface', name:'Hugging Face Blog', url:'https://huggingface.co/blog/feed.xml', home:'https://huggingface.co/blog', kind:'rss', category:'model' },
 { id:'microsoft', name:'Microsoft Research', url:'https://www.microsoft.com/en-us/research/feed/', home:'https://www.microsoft.com/en-us/research/blog/', kind:'rss', category:'algorithm' },
 { id:'ithome', name:'IT之家 · AI', url:'https://www.ithome.com/rss/', home:'https://www.ithome.com/', kind:'rss', category:'application', filterAI:true },
 { id:'papers', name:'Hugging Face Papers', url:'https://huggingface.co/api/daily_papers?limit=50', home:'https://huggingface.co/papers', kind:'papers', category:'paper' },
 { id:'vllm', name:'vLLM Releases', url:'https://github.com/vllm-project/vllm/releases.atom', home:'https://github.com/vllm-project/vllm/releases', kind:'rss', category:'algorithm' },
 { id:'ollama', name:'Ollama Releases', url:'https://github.com/ollama/ollama/releases.atom', home:'https://github.com/ollama/ollama/releases', kind:'rss', category:'application' },
 { id:'langchain', name:'LangChain Releases', url:'https://github.com/langchain-ai/langchain/releases.atom', home:'https://github.com/langchain-ai/langchain/releases', kind:'rss', category:'application' },
 { id:'qwen', name:'Qwen · 官方模型', url:'https://huggingface.co/api/models?author=Qwen&sort=createdAt&direction=-1&limit=12', home:'https://huggingface.co/Qwen', kind:'models', category:'model' },
 { id:'deepseek', name:'DeepSeek · 官方模型', url:'https://huggingface.co/api/models?author=deepseek-ai&sort=createdAt&direction=-1&limit=12', home:'https://huggingface.co/deepseek-ai', kind:'models', category:'model' }
];
const DAY=86400000;
export function plain(value='') {
 return String(value).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#x([a-f0-9]+);/gi,(_,n)=>codePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>codePoint(Number(n))).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[n]).replace(/\s+/g,' ').trim();
}
function codePoint(n){return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}
export function safeUrl(value,base){try{const u=new URL(value,base);return u.protocol==='https:'||u.protocol==='http:'?u.href:'';}catch{return '';}}
export function canonicalUrl(value){try{const u=new URL(value);u.hash='';for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_')||['ref','source'].includes(k))u.searchParams.delete(k);return u.href.replace(/\/$/,'');}catch{return '';}}
function textTag(xml,tag){const m=xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'));return m?plain(m[1]):'';}
function iso(value){const date=new Date(value);return !Number.isNaN(date.getTime())?date.toISOString():null;}
function tagsFor(text){const rules=[['Agent',/agent|智能体/i],['多模态',/multimodal|vision.language|多模态/i],['推理',/reasoning|inference|推理/i],['强化学习',/reinforcement|强化学习/i],['编程',/coding|code generation|编程|代码/i],['具身智能',/robot|tactile|embodied|机器人|具身/i],['图像生成',/diffusion|image generation|扩散|生图/i],['视频',/video|视频/i],['开源',/open.source|开放权重|开源/i]];return rules.filter(([,r])=>r.test(text)).map(([name])=>name).slice(0,3);}
function categoryFor(text,fallback){if(/合作|融资|投资|收购|创始人|首席|CEO|黄仁勋|供应链|partnership|acquisition/i.test(text))return 'vendor';if(/chatgpt|copilot|cursor|claude code|应用|工具|app\b/i.test(text))return 'application';if(/model|gemini|gpt-|qwen|deepseek|llama|模型/i.test(text))return 'model';if(/training|inference|algorithm|reinforcement|算法|训练|研究/i.test(text))return 'algorithm';return fallback;}
function excerpt(value,max=420){const t=plain(value);return t.length>max?t.slice(0,max).replace(/\s+\S*$/,'')+'…':t;}
export function parseFeed(xml,source,now=Date.now()) {
 const blocks=xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>|<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi)||[];
 if(!blocks.length&&!/<(?:rss|feed)\b/i.test(xml))throw new Error('来源未返回 RSS 或 Atom');
 return blocks.flatMap(block=>{
  const title=textTag(block,'title');let url=textTag(block,'link');
  if(!url){const links=[...block.matchAll(/<link\b([^>]+)\/?\s*>/gi)];const link=links.find(m=>/rel=["']alternate["']/i.test(m[1]))||links.find(m=>!/rel=["'](?:self|edit|enclosure)["']/i.test(m[1]));url=link?.[1].match(/href=["']([^"']+)["']/i)?.[1]||'';}
  url=safeUrl(url,source.home);
  const publishedAt=iso(textTag(block,'pubDate')||textTag(block,'published')||textTag(block,'dc:date'));
  const updatedAt=iso(textTag(block,'updated'));
  const date=publishedAt||updatedAt;
  const summary=excerpt(textTag(block,'description')||textTag(block,'summary')||textTag(block,'content:encoded')||textTag(block,'content'),280);
  if(!title||!url||!date||Date.parse(date)>now+3600000||Date.parse(date)<now-30*DAY)return [];
  if(source.filterAI&&!/\bAI\b|人工智能|大模型|智能体|机器学习|深度学习|ChatGPT|Claude|Gemini|DeepSeek|Qwen|通义|豆包|智谱|Kimi|Seedance|生成式|机器人/i.test(title))return [];
  const tags=tagsFor(title+' '+summary);
  return [{id:canonicalUrl(url),title,url,sourceId:source.id,source:source.name,category:categoryFor(title,source.category),publishedAt:date,updatedAt,discoveredAt:new Date(now).toISOString(),dateBasis:publishedAt?'published':'updated',summary:summary||'来源未提供摘要，请打开原文查看。',summaryKind:'source',tags,codeUrl:'',score:0,relatedSources:[]}];
 }).slice(0,30);
}
export function parsePapers(data,source,now=Date.now()) {
 if(!Array.isArray(data))throw new Error('论文数据格式不正确');
 return data.flatMap(entry=>{
  const p=entry.paper||entry;const publishedAt=iso(p.publishedAt||entry.publishedAt);if(!p.id||!p.title||!publishedAt||Date.parse(publishedAt)>now+3600000||Date.parse(publishedAt)<now-30*DAY)return [];
  const abstract=plain(p.summary||entry.summary||'');const tags=tagsFor(p.title+' '+abstract);
  return [{id:'arxiv:'+p.id.replace(/v\d+$/,''),title:plain(p.title),url:'https://arxiv.org/abs/'+encodeURIComponent(p.id),sourceId:source.id,source:'arXiv · Hugging Face',category:'paper',publishedAt,updatedAt:null,discoveredAt:new Date(now).toISOString(),dateBasis:'published',summary:excerpt(abstract),abstract:abstract.slice(0,6500),summaryKind:'abstract',tags:tags.length?tags:['机器学习'],codeUrl:safeUrl(p.githubRepo||''),paperId:p.id,authors:(p.authors||[]).slice(0,5).map(a=>a.name),upvotes:Number(p.upvotes)||0,score:0,relatedSources:[]}];
 });
}
export function parseModels(data,source,now=Date.now()) {
 if(!Array.isArray(data))throw new Error('模型数据格式不正确');
 return data.flatMap(m=>{const date=iso(m.createdAt);if(!m.id||!date||Date.parse(date)>now+3600000||Date.parse(date)<now-30*DAY)return [];return [{id:'hf:'+m.id,title:m.id.split('/').slice(1).join('/'),url:'https://huggingface.co/'+m.id,sourceId:source.id,source:source.name,category:'model',publishedAt:date,updatedAt:iso(m.lastModified),dateBasis:'published',discoveredAt:new Date(now).toISOString(),summary:`${source.name.split(' · ')[0]} 新增模型仓库。${m.pipeline_tag?'任务类型：'+m.pipeline_tag+'。':''}能力、权重与使用许可请以模型卡为准。`,summaryKind:'metadata',tags:['模型仓库'],codeUrl:'',score:0,relatedSources:[]}];});
}
export function rank(item,now=Date.now()) {const age=Math.max(0,(now-Date.parse(item.publishedAt))/DAY);return Math.round(Math.max(0,40-age*3)+Math.min(12,item.tags.length*4)+(item.codeUrl?12:0)+(item.category==='paper'?Math.min(8,Math.log2(1+(item.upvotes||0))*2):8));}
export function mergeItems(previous,incoming,now=Date.now()) {
 const byId=new Map();for(const item of [...previous,...incoming]){if(!item.publishedAt||Date.parse(item.publishedAt)<now-120*DAY)continue;const old=byId.get(item.id);byId.set(item.id,{...old,...item,...(old?.summaryKind==='translated'&&item.summaryKind!=='translated'?{title:old.title,originalTitle:old.originalTitle,summary:old.summary,summaryKind:old.summaryKind}:{}),score:rank(item,now)});}
 const byTitle=new Map();for(const item of byId.values()){const key=item.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');const other=byTitle.get(key);if(key.length>20&&other&&Math.abs(Date.parse(item.publishedAt)-Date.parse(other.publishedAt))<2*DAY){if(item.sourceId!==other.sourceId){other.relatedSources=[...(other.relatedSources||[]),{name:item.source,url:item.url}].filter((s,i,a)=>a.findIndex(v=>v.url===s.url)===i);}}else byTitle.set(key+'',item);}
 return [...byTitle.values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,2000);
}
export function weeklyWindow(now=Date.now()) {const local=new Date(now+8*3600000);const day=local.getUTCDay();let days=day===0?0:day;let end=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()-days,12);if(end>now)end-=7*DAY;return {start:new Date(end-7*DAY).toISOString(),end:new Date(end).toISOString(),id:new Date(end).toISOString().slice(0,10)};}
export function buildWeekly(items,now=Date.now()) {const w=weeklyWindow(now);const eligible=items.filter(x=>x.publishedAt>=w.start&&x.publishedAt<w.end).sort((a,b)=>rank(b,Date.parse(w.end))-rank(a,Date.parse(w.end)));const news=[];const used=new Map();for(const x of eligible.filter(x=>x.category!=='paper')){if((used.get(x.sourceId)||0)>=3)continue;news.push(x.id);used.set(x.sourceId,(used.get(x.sourceId)||0)+1);if(news.length===10)break;}const papers=eligible.filter(x=>x.category==='paper').slice(0,6).map(x=>x.id);return {...w,generatedAt:new Date(now).toISOString(),news,papers,total:eligible.length,selection:'按发布时间、主题相关性、来源多样性与代码可用性筛选；社区热度仅作辅助。'};}
export async function collect(previous=[],options={}) {
 const now=options.now||Date.now();const fetcher=options.fetcher||fetch;const statuses=[];const all=[];
 for(let i=0;i<SOURCES.length;i+=4){await Promise.all(SOURCES.slice(i,i+4).map(async source=>{try{const response=await fetcher(source.url,{headers:{'User-Agent':'AI-Daily-Radar/1.0 (public research and news reader)','Accept':source.kind==='rss'?'application/rss+xml, application/atom+xml, text/xml':'application/json'},signal:AbortSignal.timeout(14000)});if(!response.ok)throw new Error('HTTP '+response.status);const raw=await response.text();if(raw.length>4000000)throw new Error('来源响应过大');const items=source.kind==='rss'?parseFeed(raw,source,now):source.kind==='papers'?parsePapers(JSON.parse(raw),source,now):parseModels(JSON.parse(raw),source,now);all.push(...items);statuses.push({id:source.id,name:source.name,home:source.home,ok:true,count:items.length,checkedAt:new Date(now).toISOString()});}catch(e){statuses.push({id:source.id,name:source.name,home:source.home,ok:false,count:0,checkedAt:new Date(now).toISOString(),error:String(e?.message||'连接失败').slice(0,100)});}}));}
 const items=mergeItems(previous,all,now);return {schemaVersion:1,generatedAt:new Date(now).toISOString(),items,sources:statuses,weekly:buildWeekly(items,now)};
}

