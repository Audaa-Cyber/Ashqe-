export type BillingChain = "solana" | "base" | "arc"
export type BillingToken = "USDC" | "USDT"
export type Plan = { id:string; name:string; description:string; monthlyUsd:number }

export const PLANS:Plan[] = [
  {id:"pro",name:"Pro",description:"Research, radar, growth and higher automation limits.",monthlyUsd:Number(process.env.ASHQE_PLAN_PRO_USD ?? 20)},
  {id:"operator",name:"Operator",description:"Full intelligence OS with advanced automation and execution controls.",monthlyUsd:Number(process.env.ASHQE_PLAN_OPERATOR_USD ?? 50)},
]
const SOLANA_USDC="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
const SOLANA_USDT="Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
const BASE_USDC="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
const BASE_USDT="0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"
const ARC_USDC="0x3600000000000000000000000000000000000000"
export function tokenAddress(chain:BillingChain,token:BillingToken){
  if(chain==="solana") return token==="USDC"?(process.env.ASHQE_SOLANA_USDC_MINT||SOLANA_USDC):(process.env.ASHQE_SOLANA_USDT_MINT||SOLANA_USDT)
  if(chain==="base") return token==="USDC"?(process.env.ASHQE_BASE_USDC_ADDRESS||BASE_USDC):(process.env.ASHQE_BASE_USDT_ADDRESS||BASE_USDT)
  return token==="USDC"?(process.env.ASHQE_ARC_USDC_ADDRESS||ARC_USDC):(process.env.ASHQE_ARC_USDT_ADDRESS||"")
}
export function chainConfig(chain:BillingChain){
  if(chain==="solana") return {rpc:process.env.SOLANA_RPC_URL||"https://api.mainnet-beta.solana.com",wallet:process.env.ASHQE_SOLANA_PAYMENT_WALLET||"",confirmations:Number(process.env.ASHQE_SOLANA_CONFIRMATIONS??1)}
  if(chain==="base") return {rpc:process.env.BASE_RPC_URL||"https://mainnet.base.org",wallet:process.env.ASHQE_BASE_PAYMENT_WALLET||"",confirmations:Number(process.env.ASHQE_BASE_CONFIRMATIONS??3)}
  return {rpc:process.env.ARC_RPC_URL||"https://rpc.mainnet.arc.io",wallet:process.env.ASHQE_ARC_PAYMENT_WALLET||"",confirmations:Number(process.env.ASHQE_ARC_CONFIRMATIONS??1)}
}
export function explorerTx(chain:BillingChain,tx:string){return chain==="solana"?"https://solscan.io/tx/"+tx:chain==="base"?"https://basescan.org/tx/"+tx:"https://explorer.arc.io/tx/"+tx}
export function decimals(_chain:BillingChain,_token:BillingToken){return 6}
export function getPlan(id:string){return PLANS.find(p=>p.id===id)||null}
