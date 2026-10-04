import type { XTweet } from "@/lib/x/api"
import type { XOpportunity } from "@/lib/x/opportunity-engine"

export type BriefingItem={kind:"conversation"|"trend"|"content"|"bd"|"research"|"insight";title:string;summary:string;score:number;action:string;sourceUrl?:string}
export type RelationshipNode={id:string;mentions:number;engagement:number;lastSeen:string|null;sample:string}
export type ContentGenome={posts:number;avgLength:number;medianLength:number;questionRate:number;hookRate:number;hashtagRate:number;linkRate:number;avgLikes:number;avgReplies:number;avgReposts:number;topPatterns:string[]}

function clamp(n:number,min=0,max=100){return Math.max(min,Math.min(max,n))}
function pct(n:number,d:number){return d?Math.round(n/d*100):0}
function median(xs:number[]){if(!xs.length)return 0;const a=[...xs].sort((x,y)=>x-y);const m=Math.floor(a.length/2);return a.length%2?a[m]:Math.round((a[m-1]+a[m])/2)}

export function buildDailyBriefing(signals:Array<Record<string,unknown>>, opportunities:XOpportunity[], limit=12):BriefingItem[]{
 const signalItems=signals.map(s=>({
   kind:(String(s.type||"insight") as BriefingItem["kind"]),title:String(s.title||"Untitled"),
   summary:String(s.summary||""),score:clamp(Number(s.confidence||0)*.65+Number(s.urgency||0)*7),
   action:s.status==="acted"?"Review the outcome":"Inspect evidence and decide the next move.",sourceUrl:typeof s.source_url==="string"?s.source_url:undefined
 }))
 const oppItems=opportunities.map(o=>({kind:o.type,title:o.title,summary:o.whyNow,score:clamp(o.confidence*.65+o.urgency*7),action:o.action,sourceUrl:o.evidence[0]?.url}))
 return [...signalItems,...oppItems].sort((a,b)=>b.score-a.score).slice(0,limit)
}

export function buildRelationshipGraph(tweets:XTweet[], limit=40):RelationshipNode[]{
 const map=new Map<string,{mentions:number;engagement:number;lastSeen:string|null;sample:string}>()
 for(const t of tweets){
   const id=t.author_id||"unknown"
   if(id==="unknown")continue
   const m=t.public_metrics||{like_count:0,reply_count:0,retweet_count:0,quote_count:0}
   const engagement=(m.like_count||0)+(m.reply_count||0)+(m.retweet_count||0)+(m.quote_count||0)
   const cur=map.get(id)||{mentions:0,engagement:0,lastSeen:null,sample:""}
   cur.mentions++;cur.engagement+=engagement
   if(!cur.lastSeen||String(t.created_at||"")>cur.lastSeen)cur.lastSeen=t.created_at||null
   if(!cur.sample)cur.sample=t.text.slice(0,220)
   map.set(id,cur)
 }
 return [...map.entries()].map(([id,v])=>({id,...v})).sort((a,b)=>b.engagement-a.engagement||b.mentions-a.mentions).slice(0,limit)
}

export function buildContentGenome(tweets:XTweet[]):ContentGenome{
 const texts=tweets.map(t=>t.text.trim()).filter(Boolean), lengths=texts.map(t=>t.length)
 const questions=texts.filter(t=>/\?/.test(t)).length
 const hooks=texts.filter(t=>/^(gm|hot take|unpopular|here's|here is|the|why|how|what|i |we )\b/i.test(t)).length
 const hashtags=texts.filter(t=>/(^|\s)#\w+/.test(t)).length
 const links=texts.filter(t=>/https?:\/\//i.test(t)).length
 const likes=tweets.map(t=>t.public_metrics?.like_count||0), replies=tweets.map(t=>t.public_metrics?.reply_count||0), reposts=tweets.map(t=>t.public_metrics?.retweet_count||0)
 const patterns:string[]=[]
 if(pct(questions,texts.length)>=20)patterns.push("questions")
 if(pct(hooks,texts.length)>=35)patterns.push("direct hooks")
 if(pct(hashtags,texts.length)>=25)patterns.push("hashtags")
 if(pct(links,texts.length)>=20)patterns.push("links")
 if(lengths.length&&median(lengths)<140)patterns.push("short-form")
 else if(lengths.length&&median(lengths)>220)patterns.push("long-form")
 return {posts:texts.length,avgLength:lengths.length?Math.round(lengths.reduce((a,b)=>a+b,0)/lengths.length):0,medianLength:median(lengths),questionRate:pct(questions,texts.length),hookRate:pct(hooks,texts.length),hashtagRate:pct(hashtags,texts.length),linkRate:pct(links,texts.length),avgLikes:likes.length?Math.round(likes.reduce((a,b)=>a+b,0)/likes.length):0,avgReplies:replies.length?Math.round(replies.reduce((a,b)=>a+b,0)/replies.length):0,avgReposts:reposts.length?Math.round(reposts.reduce((a,b)=>a+b,0)/reposts.length):0,topPatterns:patterns}
}

export type MissionStep={id:string;agent:string;goal:string;dependsOn:string[];risk:"low"|"medium"|"high";requiresApproval:boolean}
export function planMission(goal:string, opts:{write?:boolean}={}):{goal:string;steps:MissionStep[];approvalBoundary:string}{
 const write=Boolean(opts.write)
 const steps:MissionStep[]=[
  {id:"observe",agent:"research",goal:"Collect fresh X context, relevant signals and evidence for the requested outcome.",dependsOn:[],risk:"low",requiresApproval:false},
  {id:"understand",agent:"orchestrator",goal:"Synthesize evidence with memory and voice constraints; separate facts, inference and unknowns.",dependsOn:["observe"],risk:"low",requiresApproval:false},
  {id:"propose",agent:"content",goal:"Produce the smallest useful set of candidate actions with rationale and source evidence.",dependsOn:["understand"],risk:"low",requiresApproval:false},
 ]
 if(write)steps.push({id:"execute",agent:"operator",goal:"Execute only the explicitly approved X write action and verify the resulting post/reply.",dependsOn:["propose"],risk:"high",requiresApproval:true})
 steps.push({id:"learn",agent:"analytics",goal:"Record outcome signals and update durable learning candidates without silently changing permissions.",dependsOn:[write?"execute":"propose"],risk:"low",requiresApproval:false})
 return {goal,steps,approvalBoundary:write?"Execution is an explicit approval boundary; no write occurs during observation or planning.":"Read-only planning; no external side effect is authorized."}
}
