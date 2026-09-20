import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

function key(){
  const raw=process.env.X_TOKEN_ENCRYPTION_KEY
  if(!raw) return null
  return createHash("sha256").update(raw).digest()
}
export function encryptToken(value:string){
  const k=key()
  if(!k)return value
  const iv=randomBytes(12)
  const cipher=createCipheriv("aes-256-gcm",k,iv)
  const encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()])
  return "v1:"+iv.toString("base64url")+":"+cipher.getAuthTag().toString("base64url")+":"+encrypted.toString("base64url")
}
export function decryptToken(value:string){
  if(!value.startsWith("v1:"))return value
  const k=key()
  if(!k)throw new Error("X_TOKEN_ENCRYPTION_KEY is required to decrypt stored X tokens")
  const [,iv,tag,data]=value.split(":")
  const decipher=createDecipheriv("aes-256-gcm",k,Buffer.from(iv,"base64url"))
  decipher.setAuthTag(Buffer.from(tag,"base64url"))
  return Buffer.concat([decipher.update(Buffer.from(data,"base64url")),decipher.final()]).toString("utf8")
}
