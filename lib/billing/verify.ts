import {createHash} from "node:crypto"
import type {BillingChain,BillingToken} from "./config"
import {chainConfig,tokenAddress} from "./config"
const TRANSFER_TOPIC="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
type RpcRecord=Record<string, unknown>
async function rpc(url:string,method:string,params:unknown[]):Promise<unknown>{
 const res=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:Date.now(),method,params}),cache:"no-store"})
 if(!res.ok)throw new Error("rpc_http_"+res.status)
 const json=await res.json() as {result?:unknown;error?:{message?:string}}
 if(json.error)throw new Error(json.error.message||"rpc_error")
 return json.result
}
function padAddress(a:string){return "0x"+a.toLowerCase().replace(/^0x/,"").padStart(64,"0")}
function rpcString(value:unknown,field:string):string{
 if(typeof value!=="string")throw new Error("rpc_"+field+"_invalid")
 return value
}
function rpcRecord(value:unknown):RpcRecord|null{return value&&typeof value==="object"&&!Array.isArray(value)?value as RpcRecord:null}
function rpcRecordArray(value:unknown):RpcRecord[]{return Array.isArray(value)?value.filter((item):item is RpcRecord=>!!item&&typeof item==="object"&&!Array.isArray(item)):[]}
function nestedString(record:RpcRecord,key:string):string|undefined{
 const value=record[key]
 return typeof value==="string"?value:undefined
}
export type VerifiedPayment={txHash:string;sender:string;amountUnits:bigint;blockNumber:bigint;eventKey:string;raw:unknown;scannedTo?:bigint}
export async function currentEvmBlock(chain:BillingChain){return BigInt(rpcString(await rpc(chainConfig(chain).rpc,"eth_blockNumber",[]),"block_number"))}
async function verifyEvm(chain:BillingChain,token:BillingToken,recipient:string,expected:bigint,fromBlock:bigint):Promise<VerifiedPayment|null>{
 const cfg=chainConfig(chain),contract=tokenAddress(chain,token)
 if(!cfg.wallet||!contract)throw new Error("billing_rail_not_configured")
 if(!/^0x[0-9a-fA-F]{40}$/.test(recipient))throw new Error("invalid_evm_recipient")
 const latest=await currentEvmBlock(chain)
 const start=fromBlock>0n?fromBlock:latest
 const end=latest<start+2500n?latest:start+2500n
 if(end<start)return null
 const logs=rpcRecordArray(await rpc(cfg.rpc,"eth_getLogs",[{address:contract,fromBlock:"0x"+start.toString(16),toBlock:"0x"+end.toString(16),topics:[TRANSFER_TOPIC,null,padAddress(recipient)]}]))
 for(const log of logs||[]){
  if(typeof log.transactionHash!=="string"||typeof log.blockNumber!=="string"||!Array.isArray(log.topics)||log.topics.length<3)continue
  const amount=BigInt(typeof log.data==="string"?log.data:"0x0"),sender="0x"+String(log.topics[1]).slice(-40)
  if(amount<expected)continue
  const receipt=await rpc(cfg.rpc,"eth_getTransactionReceipt",[log.transactionHash]) as RpcRecord | null
  if(!receipt||receipt.status!=="0x1")continue
  const block=BigInt(log.blockNumber),confirmations=latest>=block?latest-block+1n:0n
  if(confirmations<BigInt(Math.max(1,cfg.confirmations)))continue
  const eventKey=createHash("sha256").update(chain+":"+log.transactionHash+":"+String(log.logIndex ?? "0")).digest("hex")
  return {txHash:log.transactionHash,sender,amountUnits:amount,blockNumber:block,eventKey,raw:log,scannedTo:end}
 }
 return null
}
async function verifySolana(token:BillingToken,recipient:string,expected:bigint):Promise<VerifiedPayment|null>{
 const cfg=chainConfig("solana"),mint=tokenAddress("solana",token)
 if(!cfg.wallet||!mint)throw new Error("billing_solana_rail_not_configured")
 const owner=rpcRecord(await rpc(cfg.rpc,"getTokenAccountsByOwner",[recipient,{mint},{encoding:"jsonParsed"}]))
 const accounts=owner?rpcRecordArray(owner.value):[]
 for(const account of accounts.slice(0,8)){
  const signatures=rpcRecordArray(await rpc(cfg.rpc,"getSignaturesForAddress",[String(account.pubkey),{limit:30}]))
  for(const sig of signatures){
   const signature=nestedString(sig,"signature")
   if(!signature||sig.err)continue
   const tx=rpcRecord(await rpc(cfg.rpc,"getParsedTransaction",[signature,{encoding:"jsonParsed",maxSupportedTransactionVersion:0}]))
   const meta=tx?rpcRecord(tx.meta):null
   if(!meta||meta.err)continue
   const pre=rpcRecordArray(meta.preTokenBalances),post=rpcRecordArray(meta.postTokenBalances);let received=0n
   for(const p of post){
    if(nestedString(p,"owner")!==recipient||nestedString(p,"mint")!==mint)continue
    const beforeRow=pre.find((x)=>x.accountIndex===p.accountIndex)
    const beforeAmount=rpcRecord(beforeRow?.uiTokenAmount)?.amount
    const afterAmount=rpcRecord(p.uiTokenAmount)?.amount
    const before=typeof beforeAmount==="string"?beforeAmount:"0"
    const after=typeof afterAmount==="string"?afterAmount:"0"
    const delta=BigInt(after)-BigInt(before)
    if(delta>0n)received+=delta
   }
   if(received<expected)continue
   const slotValue=tx?.slot;const slot=BigInt(typeof slotValue==="number"||typeof slotValue==="string"?slotValue:0);const eventKey=createHash("sha256").update("solana:"+signature).digest("hex")
   return {txHash:signature,sender:"unknown",amountUnits:received,blockNumber:slot,eventKey,raw:{signature,account:account.pubkey,slot:slotValue}}
  }
 }
 return null
}
export async function verifyPayment(chain:BillingChain,token:BillingToken,recipient:string,expected:bigint,startBlock:bigint){return chain==="solana"?verifySolana(token,recipient,expected):verifyEvm(chain,token,recipient,expected,startBlock)}
export function amountToUnits(amount:number){return BigInt(Math.round(Number(amount.toFixed(6))*1000000))}
