// ANSI color codes for terminal output
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  orange: '\x1b[38;5;208m',
  gray: '\x1b[90m',
  bgGray: '\x1b[48;5;236m'
}

// Generate short request ID (4 chars)
let reqCounter = 0
export function genReqId(): string {
  reqCounter = (reqCounter + 1) % 10000
  return reqCounter.toString().padStart(4, '0')
}

type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug'

const levelConfig: Record<LogLevel, { color: string; icon: string }> = {
  info: { color: c.blue, icon: '●' },
  success: { color: c.green, icon: '✓' },
  warn: { color: c.yellow, icon: '⚠' },
  error: { color: c.red, icon: '✗' },
  debug: { color: c.gray, icon: '·' }
}

// Stats tracking (session only, for AI tokens)
interface SessionStats {
  haiku: {
    inputTokens: number
    outputTokens: number
    cacheRead: number
    cacheCreation: number
    requests: number
  }
}

const sessionStats: SessionStats = {
  haiku: { inputTokens: 0, outputTokens: 0, cacheRead: 0, cacheCreation: 0, requests: 0 }
}

function time(): string {
  return '' // Disabled - Docker adds timestamps
}

function log(level: LogLevel, tag: string, message: string, data?: unknown): void {
  const cfg = levelConfig[level]
  const tagColors: Record<string, string> = {
    AI: c.magenta,
    DB: c.green,
    SC: c.orange,
    Security: c.yellow
  }
  const tagColor = tagColors[tag] || c.cyan

  const line = `${cfg.color}${cfg.icon}${c.reset} ${tagColor}${c.bold}${tag}${c.reset} ${message}`

  if (level === 'error') {
    console.error(line, data !== undefined ? data : '')
  } else if (level === 'warn') {
    console.warn(line, data !== undefined ? data : '')
  } else {
    console.log(line, data !== undefined ? data : '')
  }
}

function num(n: number, color = c.yellow): string {
  return `${color}${n.toLocaleString()}${c.reset}`
}

export const logger = {
  info: (tag: string, message: string, data?: unknown) => log('info', tag, message, data),
  success: (tag: string, message: string, data?: unknown) => log('success', tag, message, data),
  warn: (tag: string, message: string, data?: unknown) => log('warn', tag, message, data),
  error: (tag: string, message: string, data?: unknown) => log('error', tag, message, data),
  debug: (tag: string, message: string, data?: unknown) => log('debug', tag, message, data),

  // Database operations
  db: {
    upsert: (count: number, totalInDb: number) => {
      log('success', 'DB', `+${num(count, c.green)} tracks ${c.dim}│${c.reset} Total: ${num(totalInDb, c.magenta)}`)
    },
    quality: (stored: number, rejected: number) => {
      log('info', 'DB', `Quality filter: ${num(stored, c.green)} stored, ${num(rejected, c.yellow)} rejected`)
    },
    query: (resultCount: number, query: string) => {
      const shortQuery = query.length > 60 ? query.substring(0, 60) + '...' : query
      log('info', 'DB', `${num(resultCount)} results ${c.dim}│${c.reset} ${c.gray}${shortQuery}${c.reset}`)
    },
    error: (error: string) => log('error', 'DB', error)
  },

  // SoundCloud operations
  sc: {
    // Search with optional artist match info
    search: (query: string, count: number, artist?: { name: string; matchType?: string }) => {
      log('success', 'SC', `"${c.cyan}${query}${c.reset}" → ${num(count)} tracks`)
      if (artist) {
        const matchInfo = artist.matchType ? ` ${c.dim}(${artist.matchType})${c.reset}` : ''
        console.log(`${c.dim}                └─ Artist: ${c.reset}${artist.name}${matchInfo}`)
      }
    },
    // Fallback search (no artist match)
    fallback: (query: string, count: number) => {
      log('warn', 'SC', `"${c.cyan}${query}${c.reset}" → ${num(count)} tracks ${c.dim}(no artist match)${c.reset}`)
    },
    error: (error: string) => log('error', 'SC', error)
  },

  // AI operations (with request ID for tracking)
  ai: {
    // Step 1: Log the user prompt
    prompt: (id: string, query: string) => {
      log('info', 'AI', `${c.dim}[${id}]${c.reset} "${c.cyan}${query}${c.reset}"`)
    },
    // Step 2: Log AI interpretation (SQL generated)
    interpret: (id: string, sql: string, scQuery: string) => {
      const shortSql = sql.length > 80 ? sql.substring(0, 80) + '...' : sql
      console.log(`${c.dim}      [${id}] ├─ SQL: ${shortSql}${c.reset}`)
      console.log(`${c.dim}      [${id}] └─ SC: "${scQuery}"${c.reset}`)
    },
    // Step 3: Log final results
    result: (id: string, count: number) => {
      log('success', 'AI', `${c.dim}[${id}]${c.reset} → ${num(count)} tracks`)
    },
    // Log when AI needs clarification
    clarify: (id: string, question: string) => {
      log('info', 'AI', `${c.dim}[${id}]${c.reset} → ${c.yellow}?${c.reset} ${question}`)
    },
    // Log fallback (AI failed)
    fallback: (id: string, query: string, reason?: string) => {
      const r = reason ? ` ${c.dim}(${reason})${c.reset}` : ''
      log('warn', 'AI', `${c.dim}[${id}]${c.reset} "${c.cyan}${query}${c.reset}" → fallback${r}`)
    },
    // Token stats (silent)
    tokens: (input: number, output: number, cacheRead = 0, cacheCreation = 0) => {
      sessionStats.haiku.inputTokens += input
      sessionStats.haiku.outputTokens += output
      sessionStats.haiku.cacheRead += cacheRead
      sessionStats.haiku.cacheCreation += cacheCreation
      sessionStats.haiku.requests++
    },
    error: (error: string) => log('error', 'AI', error)
  },

  // Get session stats
  getStats: () => ({ ...sessionStats })
}
