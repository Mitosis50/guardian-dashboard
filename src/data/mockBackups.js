const now = Date.now()

export const mockBackups = [
  {
    id: 'mock-memory',
    user_id: 'mock-user',
    file_name: 'MEMORY.md',
    cid: 'QmfANw7H2YmpoEzA1vY9VcMEhZ5xj8qqLmxy9HJQUg',
    ipfs_url: 'https://gateway.pinata.cloud/ipfs/QmfANw7H2YmpoEzA1vY9VcMEhZ5xj8qqLmxy9HJQUg',
    status: 'success',
    backed_up_at: new Date(now - 1000 * 60 * 22).toISOString(),
  },
  {
    id: 'mock-soul',
    user_id: 'mock-user',
    file_name: 'SOUL.md',
    cid: 'QmX9bP2vNq4AgentGuardianSoulBackup9kaHJQUg',
    ipfs_url: 'https://gateway.pinata.cloud/ipfs/QmX9bP2vNq4AgentGuardianSoulBackup9kaHJQUg',
    status: 'uploading',
    backed_up_at: new Date(now - 1000 * 60 * 68).toISOString(),
  },
  {
    id: 'mock-agents',
    user_id: 'mock-user',
    file_name: 'AGENTS.md',
    cid: 'QmZp8eGuardianAgentsConfigBackup7vHJQUg2345',
    ipfs_url: 'https://gateway.pinata.cloud/ipfs/QmZp8eGuardianAgentsConfigBackup7vHJQUg2345',
    status: 'queued',
    backed_up_at: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
  },
]
