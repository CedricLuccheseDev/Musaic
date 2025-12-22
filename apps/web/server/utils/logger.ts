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
  return `${c.gray}${new Date().toLocaleTimeString('fr-FR')}${c.reset}`
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

  const line = `${time()} ${cfg.color}${cfg.icon}${c.reset} ${tagColor}${c.bold}${tag}${c.reset} ${message}`

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
    query: (resultCount: number, query: string) => {
      const shortQuery = query.length > 60 ? query.substring(0, 60) + '...' : query
      log('info', 'DB', `${num(resultCount)} results ${c.dim}│${c.reset} ${c.gray}${shortQuery}${c.reset}`)
    },
    error: (error: string) => log('error', 'DB', error)
  },

  // SoundCloud operations
  sc: {
    search: (query: string, count: number) => {
      log('info', 'SC', `"${c.cyan}${query}${c.reset}" → ${num(count)} tracks`)
    },
    error: (error: string) => log('error', 'SC', error)
  },

  // AI operations
  ai: {
    query: (question: string) => {
      log('info', 'AI', `"${c.cyan}${question}${c.reset}"`)
    },
    sql: (sql: string) => {
      log('debug', 'AI', `${c.gray}${sql}${c.reset}`)
    },
    tokens: (input: number, output: number, cacheRead = 0, cacheCreation = 0) => {
      sessionStats.haiku.inputTokens += input
      sessionStats.haiku.outputTokens += output
      sessionStats.haiku.cacheRead += cacheRead
      sessionStats.haiku.cacheCreation += cacheCreation
      sessionStats.haiku.requests++

      const h = sessionStats.haiku
      const cache = cacheRead > 0 ? ` ${c.green}(${cacheRead} cached)${c.reset}` : ''
      log('debug', 'AI', `${num(input)}in/${num(output)}out${cache} ${c.dim}│${c.reset} Session: ${num(h.requests, c.cyan)} req`)
    },
    result: (count: number, phrase?: string) => {
      const msg = phrase
        ? `${num(count)} results ${c.dim}│${c.reset} "${c.gray}${phrase}${c.reset}"`
        : `${num(count)} results`
      log('success', 'AI', msg)
    },
    error: (error: string) => log('error', 'AI', error)
  },

  // Get session stats
  getStats: () => ({ ...sessionStats })
}
