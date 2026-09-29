const DAY=86400000;
// UTC 00:00 is 08:00 in Asia/Shanghai. Sunday UTC 12:00 is the weekly cutoff.
export function requiredUpdateAt(now=Date.now()){
 const date=new Date(now),daily=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate());
 let weekly=daily-date.getUTCDay()*DAY+12*3600000;
 if(weekly>now)weekly-=7*DAY;
 return Math.max(daily,weekly);
}
export function pendingTranslations(feed){
 return (feed?.items||[]).some(a=>{
  if(a.category==='algorithm'&&a.summaryKind!=='translated'&&/[A-Za-z]{3}/.test(a.summary||'')&&!/[\u4e00-\u9fff]/.test(a.summary||''))return true;
  if(!a.biomedicalTopics?.length)return false;
  const t=a.biomedicalTranslation;
  return !t||t.sourceTitle!==(a.originalTitle||a.title)||t.sourceSummary!==(a.originalSummary||a.summary)||!/[\u4e00-\u9fff]/.test(t.title||'')||!/[\u4e00-\u9fff]/.test(t.summary||'');
 });
}
export function needsScheduledUpdate(feed,now=Date.now()){
 const generated=Date.parse(feed?.generatedAt);
 return !feed?.items?.length||!Number.isFinite(generated)||generated>now+3600000||generated<requiredUpdateAt(now)||pendingTranslations(feed);
}
export function updateState(generatedAt,now=Date.now()){
 const dueAt=requiredUpdateAt(now),generated=Date.parse(generatedAt);
 return {dueAt,state:Number.isFinite(generated)&&generated>=dueAt?'current':now<dueAt+30*60000?'waiting':'late'};
}
