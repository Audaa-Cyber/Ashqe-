import {createHash} from "node:crypto"
import type {BillingChain,BillingToken} from "./config"
import {chainConfig,tokenAddress} from "./config"
const TRANSFER_TOPIC="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
async function rpc(url:string,method:string,params:unknown[]){
 const res=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:Date.now(),method,params}),cache:"no-store"})
 if(!res.ok) throw new Error("rpc_http_"+res.status)
 const json=await res.json() as {result?:any;error?:{message?:string}}
 if(json.error) throw new Error(json.error.message||"rpc_error")
 return json.result
}
function padAddress(a:string){return "0x"+a.toLowerCase().replace(/^0x/,"").padStart(64,"0")}
export type VerifiedPayment={txHash:string;sender:string;amountUnits:bigint;blockNumber:bigint;eventKey:string;raw:unknown}
async function verifyEvm(chain:BillingChain,token:BillingToken,recipient:string,expected:bigint,fromBlock:bigint):Promise<VerifiedPayment|null>{
 const cfg=chainConfig(chain),contract=tokenAddress(chain,token)
 if(!cfg.wallet||!contract) throw new Error("billing_rail_not_configured")
 if(!/^0x[0-9a-fA-F]{40}$/.test(recipient)) throw new Error("invalid_evm_recipient")
 const latest=BigInt(await rpc(cfg.rpc,"eth_blockNumber",[]))
 const end=latest<fromBlock+2500n?latest:fromBlock+2500n
 if(end<fromBlock)return null
 const logs=await rpc(cfg.rpc,"eth_getLogs",[{address:contract,fromBlock:"0x"+fromBlock.toString(16),toBlock:"0x"+end.toString(16),topics:[TRANSFER_TOPIC,null,padAddress(recipient)]}]) as any[]
 for(const log of logs||[]){
  if(!log?.transactionHash||!log?.blockNumber||!Array.isArray(log.topics)||log.topics.length<3)continue
  const amount=BigInt(log.data||"0x0"); const sender="0x"+String(log.topics[1]).slice(-40)
  if(amount<expected)continue
  const receipt=await rpc(cfg.rpc,"eth_getTransactionReceipt",[log.transactionHash])
  if(!receipt||receipt.status!=="0x1")continue
  const block=BigInt(log.blockNumber); const confirmations=latest>=block?latest-block+1n:0n
  if(confirmations<BigInt(Math.max(1,cfg.confirmations)))continue
  const eventKey=createHash("sha256").update(chain+":"+log.transactionHash+":"+(log.logIndex??"0")).digest("hex")
  return {txHash:log.transactionHash,sender,amountUnits:amount,blockNumber:block,eventKey,raw:log}
 }
 return null
}
async function verifySolana(token:BillingToken,recipient:string,expected:bigint):Promise<VerifiedPayment|null>{
 const cfg=chainConfig("solana"),mint=tokenAddress("solana",token)
 if(!cfg.wallet||!mint)throw new Error("billing_solana_rail_not_configured")
 const owner=await rpc(cfg.rpc,"getTokenAccountsByOwner",[recipient,{mint},{encoding:"jsonParsed"}])
 for(const account of (owner?.value||[]).slice(0,8)){
  const signatures=await rpc(cfg.rpc,"getSignaturesForAddress",[account.pubkey,{limit:30}])
  for(const sig of signatures||[]){
   if(sig.err)continue
   const tx=await rpc(cfg.rpc,"getParsedTransaction",[sig.signature,{encoding:"jsonParsed",maxSupportedTransactionVersion:0}])
   if(!tx?.meta||tx.meta.err)continue
   const pre=tx.meta.preTokenBalances||[],post=tx.meta.postTokenBalances||[]
   let received=0n
   for(const p of post){
    if(p.owner!==recipient||p.mint!==mint)continue
    const before=pre.find((x:any)=>x.accountIndex===p.accountIndex)?.uiTokenAmount?.amount||"0"
    const after=p.uiTokenAmount?.amount||"0"; const delta=BigInt(after)-BigInt(before); if(delta>0n)received+=delta
   }
   if(received<expected)continue
   const slot=BigInt(tx.slot||0); const eventKey=createHash("sha256").update("solana:"+sig.signature+":"+account.pubkey).digest("hex")
   return {txHash:sig.signature,sender:"unknown",amountUnits:received,blockNumber:slot,eventKey,raw:{signature:sig.signature,account:account.pubkey,slot:tx.slot}}
  }
 }
 return null
}
export async function verifyPayment(chain:BillingChain,token:BillingToken,recipient:string,expected:bigint,startBlock:bigint){return chain==="solana"?verifySolana(token,recipient,expected):verifyEvm(chain,token,recipient,expected,startBlock)}
export function amountToUnits(amount:number){return BigInt(Math.round(Number(amount.toFixed(6))*1_000_000))}
