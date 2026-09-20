export function logEvent(event:string,data:Record<string,unknown>={}){console.log(JSON.stringify({event,ts:new Date().toISOString(),...data}))}
export function logError(event:string,error:unknown,data:Record<string,unknown>={}){console.error(JSON.stringify({event,ts:new Date().toISOString(),error:error instanceof Error?error.message:String(error),...data}))}
