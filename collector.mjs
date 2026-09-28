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
 { id:'deepseek', name:'DeepSeek · 官方模型', url:'https://huggingface.co/api/models?author=deepseek-ai&sort=createdAt&direction=-1&limit=12', home:'https://huggingface.co/deepseek-ai', kind:'models', category:'model' },
 { id:'nvidia-health', name:'NVIDIA · 医疗与生命科学', url:'https://blogs.nvidia.com/blog/tag/healthcare-life-sciences/feed/', home:'https://blogs.nvidia.com/blog/tag/healthcare-life-sciences/', kind:'rss', category:'application', filterBiomedical:true },
 { id:'xtalpi', name:'晶泰科技 · 官方动态', url:'https://www.xtalpi.com/category/news/feed/', home:'https://www.xtalpi.com/category/news/', kind:'rss', category:'vendor', biomedicalVendor:true, filterBiomedical:true },
 { id:'insilico', name:'英矽智能 · 官方动态', url:'https://insilico.com/api/getfeed/?feeduid=535208427911&size=40&sort[date]=desc', home:'https://insilico.com/news', kind:'company', category:'vendor', biomedicalVendor:true, defaultTopics:['drug'], filterCorporate:true },
 { id:'absci', name:'Absci · 官方动态', url:'https://investors.absci.com/rss/news-releases.xml', home:'https://investors.absci.com/news-and-events/news-releases', kind:'rss', category:'vendor', biomedicalVendor:true, defaultTopics:['drug','protein'], filterCorporate:true },
 { id:'recursion', name:'Recursion · 官方动态', url:'https://ir.recursion.com/rss/news-releases.xml', home:'https://ir.recursion.com/news-events/press-releases', kind:'rss', category:'vendor', biomedicalVendor:true, defaultTopics:['drug'], filterCorporate:true },
 ...[
  ['drug','药物研发','"drug discovery" OR "drug design" OR "drug repurposing" OR "molecular generation" OR "binding affinity"'],
  ['protein','蛋白质与分子设计','"protein design" OR "protein structure" OR "protein folding" OR antibody OR AlphaFold'],
  ['imaging','医学影像','"medical imaging" OR radiology OR MRI OR "computed tomography" OR histopathology'],
  ['clinical','临床 AI','clinical OR patient OR "electronic health record" OR hospital'],
  ['omics','组学与生命科学','genomics OR transcriptomics OR "single cell" OR proteomics']
 ].map(([topic,label,query])=>({id:'epmc-'+topic,name:'Europe PMC · '+label,home:'https://europepmc.org/',kind:'europepmc',category:'paper',query}))
];
const DAY=86400000;
export const biomedicalTopics={drug:'药物研发',protein:'蛋白质与分子设计',imaging:'医学影像',clinical:'临床 AI',omics:'组学与生命科学'};
const aiTerms=/\b(?:AI|LLMs?|machine learning|deep learning|artificial intelligence|neural networks?|foundation models?|large language models?|diffusion models?|generative models?|AlphaFold|BioNeMo)\b|人工智能|机器学习|深度学习|大语言模型|大模型|生成式|神经网络|扩散模型/i;
/** @type {Array<[string, RegExp]>} */
const bioRules=[
 ['drug',/\b(?:drug|pharma\w*|therapeutic\w*|molecular (?:design|generation)|binding affinity|docking)\b|药物|制药|药研|药企|分子设计|分子生成|分子对接/i],
 ['protein',/\b(?:proteins?|antibod\w*|peptides?|enzymes?|AlphaFold|protein folding)\b|蛋白质|蛋白|抗体|多肽|酶设计/i],
 ['imaging',/\b(?:medical imag\w*|radiolog\w*|radiograph\w*|MRI|computed tomography|histopatholog\w*|patholog\w*|chromoendoscopy|ultrasound)\b|医学影像|医疗影像|放射|病理|磁共振|超声|内镜/i],
 ['clinical',/\b(?:clinical|patients?|hospitals?|healthcare|medical|clinicians?|physicians?|electronic health records?|EHR)\b|临床|患者|病历|医院|医疗|医学|诊疗/i],
 ['omics',/\b(?:genom\w*|transcriptom\w*|proteom\w*|single[ -]cell|bioinformatics|gene expression|life sciences?)\b|基因组|转录组|蛋白组|单细胞|生物信息|生命科学|基因表达/i]
];
export function biomedicalTopicsFor(item){
 const text=[item.title,item.originalTitle,item.abstract,item.summary].filter(Boolean).join(' ');
 // Only verified company news sources supply context when a headline omits "AI".
 const source=SOURCES.find(s=>s.id===item.sourceId&&s.biomedicalVendor);
 const company=source&&item.category!=='paper'&&safeUrl(item.url)&&new URL(item.url).origin===new URL(source.home).origin?source:null;
 if(!aiTerms.test(text)&&!company)return [];
 const topics=bioRules.filter(([,rule])=>rule.test(text)).map(([topic])=>topic);
 return topics.length?topics:company?.defaultTopics||[];
}
export function annotateBiomedical(item){const topics=biomedicalTopicsFor(item);return {...item,biomedicalTopics:topics,tags:[...topics.map(t=>biomedicalTopics[t]),...(item.tags||[]).filter(t=>!Object.values(biomedicalTopics).includes(t))].slice(0,5)};}
export function europePmcUrl(source,now=Date.now()){
 const start=new Date(now-30*DAY).toISOString().slice(0,10),end=new Date(now).toISOString().slice(0,10);
 const ai='"artificial intelligence" OR "machine learning" OR "deep learning" OR "large language model" OR "neural network" OR "foundation model" OR "diffusion model" OR AlphaFold';
 const query=`TITLE_ABS:(${ai}) AND TITLE_ABS:(${source.query}) AND FIRST_PDATE:[${start} TO ${end}] AND HAS_ABSTRACT:Y sort_date:y`;
 return 'https://www.ebi.ac.uk/europepmc/webservices/rest/search?'+new URLSearchParams({query,format:'json',resultType:'core',pageSize:'15'});
}
export function plain(value='') {
 return String(value).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<!--[^]*?-->|<\/?[A-Za-z][^>]*>/g,' ').replace(/&#x([a-f0-9]+);/gi,(_,n)=>codePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>codePoint(Number(n))).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[n]).replace(/\s+/g,' ').trim();
}
function codePoint(n){return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}
export function safeUrl(value,base){try{const u=new URL(value,base);return u.protocol==='https:'||u.protocol==='http:'?u.href:'';}catch{return '';}}
export function canonicalUrl(value){try{const u=new URL(value);u.hash='';for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_')||['ref','source'].includes(k))u.searchParams.delete(k);return u.href.replace(/\/$/,'');}catch{return '';}}
function textTag(xml,tag){const m=xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'));return m?plain(m[1]):'';}
function iso(value){const date=new Date(value);return !Number.isNaN(date.getTime())?date.toISOString():null;}
function tagsFor(text){const rules=[['Agent',/\bagentic\b|\b(?:AI|LLM|autonomous|multi)[ -]agents?\b|智能体/i],['多模态',/multimodal|vision.language|多模态/i],['推理',/reasoning|inference|推理/i],['强化学习',/reinforcement|强化学习/i],['编程',/coding|code generation|编程|代码/i],['具身智能',/robot|tactile|embodied|机器人|具身/i],['图像生成',/diffusion|image generation|扩散|生图/i],['视频',/video|视频/i],['开源',/open.source|开放权重|开源/i]];return rules.filter(([,r])=>r.test(text)).map(([name])=>name).slice(0,3);}
function administrativeNews(title){return /(?:to participate|to present|participation).*(?:investor|investment|healthcare) conferences?|inducement (?:awards|grants)|to report.*(?:financial|quarter)|to host.*earnings/i.test(title);}
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
  if(source.filterCorporate&&administrativeNews(title))return [];
  if(source.filterBiomedical&&!biomedicalTopicsFor({title,summary,url,sourceId:source.id,category:source.category}).length)return [];
  const tags=tagsFor(title+' '+summary);
  return [{id:canonicalUrl(url),title,url,sourceId:source.id,source:source.name,category:source.biomedicalVendor?'vendor':categoryFor(title,source.category),publishedAt:date,updatedAt,discoveredAt:new Date(now).toISOString(),dateBasis:publishedAt?'published':'updated',summary:summary||'来源未提供摘要，请打开原文查看。',summaryKind:'source',tags,codeUrl:'',score:0,relatedSources:[]}];
 }).slice(0,30);
}
export function companyDate(value,timeZone){
 if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/.test(value||'')||!timeZone)return null;
 const wall=Date.parse(value.replace(' ','T')+(value.length===16?':00':'')+'Z');if(!Number.isFinite(wall))return null;
 try{const format=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});let utc=wall;
  for(let i=0;i<2;i++){const p=Object.fromEntries(format.formatToParts(new Date(utc)).map(p=>[p.type,p.value]));const local=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);utc+=wall-local;}return new Date(utc).toISOString();
 }catch{return null;}
}
export function parseCompanyNews(data,source,now=Date.now()){
 if(!Array.isArray(data?.posts))throw new Error('厂商新闻数据格式不正确');
 return data.posts.flatMap(p=>{const title=plain(p.title),url=safeUrl(p.directlink||p.url,source.home),publishedAt=companyDate(p.published||p.date,data.feedtz);
  if(!title||!url||new URL(url).origin!==new URL(source.home).origin||!publishedAt||Date.parse(publishedAt)>now||Date.parse(publishedAt)<now-30*DAY||administrativeNews(title))return [];
  const summary=excerpt(p.descr||p.text,420);
  return [annotateBiomedical({id:canonicalUrl(url),title,url,sourceId:source.id,source:source.name,category:'vendor',publishedAt,discoveredAt:new Date(now).toISOString(),dateBasis:'published',summary:summary||'来源未提供摘要，请打开原文查看。',summaryKind:'source',tags:tagsFor(title+' '+summary),codeUrl:'',score:0,relatedSources:[]})];
 }).slice(0,40);
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
export function parseEuropePmc(data,source,now=Date.now()){
 const results=data?.resultList?.result;if(!Array.isArray(results))throw new Error('Europe PMC 数据格式不正确');
 return results.flatMap(p=>{
  const publishedAt=iso(p.firstPublicationDate),title=plain(p.title),abstract=plain(p.abstractText||'');
  const types=p.pubTypeList?.pubType||[];
  if(!p.id||!p.source||!title||!publishedAt||Date.parse(publishedAt)>now||Date.parse(publishedAt)<now-30*DAY||types.some(t=>/retract|withdrawal/i.test(t)))return [];
  if(!biomedicalTopicsFor({title,abstract}).length)return [];
  const arxiv=p.doi?.match(/^10\.48550\/arxiv\.(\d+\.\d+)(?:v\d+)?$/i)?.[1];
  const id=arxiv?'arxiv:'+arxiv:p.doi?'doi:'+p.doi.toLowerCase():`epmc:${p.source}:${p.id}`;
  const paperStatus=p.source==='PPR'||types.some(t=>/preprint/i.test(t))?'preprint':p.journalInfo?'journal':'publication';
  const sourceName=p.source==='MED'?'PubMed · Europe PMC':'Europe PMC';
  return [annotateBiomedical({id,title,url:`https://europepmc.org/article/${encodeURIComponent(p.source)}/${encodeURIComponent(p.id)}`,sourceId:source.id,source:sourceName,category:'paper',publishedAt,updatedAt:null,discoveredAt:new Date(now).toISOString(),dateBasis:'published',summary:excerpt(abstract),abstract:abstract.slice(0,6500),summaryKind:'abstract',tags:tagsFor(title+' '+abstract),codeUrl:'',paperId:p.source==='MED'?'PMID: '+p.id:p.id,paperStatus,journal:plain(p.journalInfo?.journal?.title||''),doi:p.doi||'',authors:(p.authorList?.author||[]).slice(0,5).map(a=>plain(a.fullName||a.collectiveName||'')).filter(Boolean),score:0,relatedSources:[]})];
 });
}
export function rank(item,now=Date.now()) {const age=Math.max(0,(now-Date.parse(item.publishedAt))/DAY);return Math.round(Math.max(0,40-age*3)+Math.min(12,item.tags.length*4)+(item.codeUrl?12:0)+(item.category==='paper'?Math.min(8,Math.log2(1+(item.upvotes||0))*2):8));}
export function mergeItems(previous,incoming,now=Date.now()) {
 const byId=new Map();for(const raw of [...previous,...incoming]){const item=annotateBiomedical(raw);if(!item.publishedAt||Date.parse(item.publishedAt)<now-120*DAY)continue;const old=byId.get(item.id);byId.set(item.id,{...old,...item,...(old?.summaryKind==='translated'&&item.summaryKind!=='translated'?{title:old.title,originalTitle:old.originalTitle,summary:old.summary,summaryKind:old.summaryKind}:{}),score:rank(item,now)});}
 const byTitle=new Map();for(const item of byId.values()){const key=item.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');const other=byTitle.get(key);if(key.length>20&&other&&Math.abs(Date.parse(item.publishedAt)-Date.parse(other.publishedAt))<2*DAY){if(item.sourceId!==other.sourceId){other.relatedSources=[...(other.relatedSources||[]),{name:item.source,url:item.url}].filter((s,i,a)=>a.findIndex(v=>v.url===s.url)===i);}}else byTitle.set(key+'',item);}
 return [...byTitle.values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,2000);
}
export function weeklyWindow(now=Date.now()) {const local=new Date(now+8*3600000);const day=local.getUTCDay();let days=day===0?0:day;let end=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()-days,12);if(end>now)end-=7*DAY;return {start:new Date(end-7*DAY).toISOString(),end:new Date(end).toISOString(),id:new Date(end).toISOString().slice(0,10)};}
export function buildWeekly(items,now=Date.now()) {
 const w=weeklyWindow(now);const eligible=items.filter(x=>x.publishedAt>=w.start&&x.publishedAt<w.end).sort((a,b)=>rank(b,Date.parse(w.end))-rank(a,Date.parse(w.end)));
 const news=[];const used=new Map();for(const x of eligible.filter(x=>x.category!=='paper')){if((used.get(x.sourceId)||0)>=3)continue;news.push(x.id);used.set(x.sourceId,(used.get(x.sourceId)||0)+1);if(news.length===10)break;}
 const papers=eligible.filter(x=>x.category==='paper').slice(0,6).map(x=>x.id);
 const bio=eligible.filter(x=>biomedicalTopicsFor(x).length),biomedical=[];
 // Reserve space for both company news and research, with source diversity.
 const bioUsed=new Map();for(const item of bio.filter(x=>x.category!=='paper')){if((bioUsed.get(item.sourceId)||0)>=2)continue;biomedical.push(item.id);bioUsed.set(item.sourceId,(bioUsed.get(item.sourceId)||0)+1);if(biomedical.length===3)break;}
 let selectedPapers=0;for(const topic of Object.keys(biomedicalTopics)){const item=bio.find(x=>x.category==='paper'&&!biomedical.includes(x.id)&&biomedicalTopicsFor(x).includes(topic));if(item){biomedical.push(item.id);selectedPapers++;}if(selectedPapers===3)break;}
 for(const item of bio.filter(x=>x.category==='paper')){if(selectedPapers>=3)break;if(!biomedical.includes(item.id)){biomedical.push(item.id);selectedPapers++;}}
 for(const item of bio){if(biomedical.length>=6)break;if(!biomedical.includes(item.id))biomedical.push(item.id);}
 return {...w,generatedAt:new Date(now).toISOString(),news,papers,biomedical,total:eligible.length,selection:'按发布时间、主题相关性、来源多样性与代码可用性筛选；生物医药兼顾厂商资讯与研究论文，社区热度仅作辅助。'};
}
export async function collect(previous=[],options={}) {
 const now=options.now||Date.now();const fetcher=options.fetcher||fetch;const statuses=[];const all=[];
 for(let i=0;i<SOURCES.length;i+=4){await Promise.all(SOURCES.slice(i,i+4).map(async source=>{try{const response=await fetcher(source.kind==='europepmc'?europePmcUrl(source,now):source.url,{headers:{'User-Agent':'AI-Daily-Radar/1.0 (public research and news reader)','Accept':source.kind==='rss'?'application/rss+xml, application/atom+xml, text/xml':'application/json'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('HTTP '+response.status);const raw=await response.text();if(raw.length>4000000)throw new Error('来源响应过大');const items=source.kind==='rss'?parseFeed(raw,source,now):source.kind==='company'?parseCompanyNews(JSON.parse(raw),source,now):source.kind==='papers'?parsePapers(JSON.parse(raw),source,now):source.kind==='europepmc'?parseEuropePmc(JSON.parse(raw),source,now):parseModels(JSON.parse(raw),source,now);all.push(...items);statuses.push({id:source.id,name:source.name,home:source.home,ok:true,count:items.length,checkedAt:new Date(now).toISOString()});}catch(e){statuses.push({id:source.id,name:source.name,home:source.home,ok:false,count:0,checkedAt:new Date(now).toISOString(),error:String(e?.message||'连接失败').slice(0,100)});}}));}
 const items=mergeItems(previous,all,now);return {schemaVersion:1,generatedAt:new Date(now).toISOString(),items,sources:statuses,weekly:buildWeekly(items,now)};
}

