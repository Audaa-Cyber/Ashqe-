import type { AgentDefinition, AgentId } from "./contracts"

const definitions: Record<AgentId, AgentDefinition> = {
  orchestrator: {
    id: "orchestrator",
    trust: "system",
    // The orchestrator coordinates; it does not directly mutate X or memory.
    allowedTools: ["research.read", "memory.read", "x.read", "content.generate", "analytics.read"],
    allowedDelegates: ["research", "conversation", "voice", "content", "critic", "opportunity", "trend", "relationship", "analytics", "operator", "memory"],
    maxTaskDepth: 8,
  },
  research: {
    id: "research",
    trust: "internal",
    allowedTools: ["x.read", "web.read"],
    allowedDelegates: [],
    maxTaskDepth: 1,
  },
  conversation: {
    id: "conversation",
    trust: "internal",
    allowedTools: ["x.read", "memory.read"],
    allowedDelegates: [],
    maxTaskDepth: 1,
  },
  voice: {
    id: "voice",
    trust: "internal",
    allowedTools: ["memory.read", "style.read"],
    allowedDelegates: [],
    maxTaskDepth: 1,
  },
  content: {
    id: "content",
    trust: "internal",
    allowedTools: ["memory.read", "style.read", "content.generate"],
    allowedDelegates: ["critic"],
    maxTaskDepth: 2,
  },
  critic: {
    id: "critic",
    trust: "internal",
    allowedTools: ["content.inspect", "memory.read"],
    allowedDelegates: [],
    maxTaskDepth: 1,
  },
  opportunity: {
    id: "opportunity",
    trust: "internal",
    allowedTools: ["x.read", "web.read", "memory.read"],
    allowedDelegates: [],
    maxTaskDepth: 1,
  },
  trend: {
    id: "trend",
    trust: "internal",
    allowedTools: ["x.read", "web.read", "analytics.read"],
    allowedDelegates: [],
    maxTaskDepth: 1,
  },
  relationship: {
    id: "relationship",
    trust: "internal",
    allowedTools: ["x.read", "memory.read"],
    allowedDelegates: [],
    maxTaskDepth: 1,
  },
  analytics: {
    id: "analytics",
    trust: "internal",
    allowedTools: ["x.read", "analytics.read", "memory.read"],
    allowedDelegates: [],
    maxTaskDepth: 1,
  },
  operator: {
    id: "operator",
    trust: "privileged",
    allowedTools: ["x.write"],
    allowedDelegates: [],
    maxTaskDepth: 1,
  },
  memory: {
    id: "memory",
    trust: "internal",
    allowedTools: ["memory.read", "memory.write"],
    allowedDelegates: [],
    maxTaskDepth: 1,
  },
}

export function getAgentDefinition(agent: AgentId) {
  return definitions[agent]
}

export function listAgentDefinitions() {
  return Object.values(definitions)
}
