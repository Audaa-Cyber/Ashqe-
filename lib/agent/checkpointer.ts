import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres"

export function createAgentCheckpointer(connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL) {
  if (!connectionString) return null
  return PostgresSaver.fromConnString(connectionString)
}

export async function setupAgentCheckpointer(connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("agent_checkpointer_database_url_missing")
  const checkpointer = PostgresSaver.fromConnString(connectionString)
  await checkpointer.setup()
  return checkpointer
}
