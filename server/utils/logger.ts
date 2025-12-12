// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
}

type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug'

const levelConfig: Record<LogLevel, { color: string; icon: string }> = {
  info: { color: colors.blue, icon: 'ℹ' },
  success: { color: colors.green, icon: '✓' },
  warn: { color: colors.yellow, icon: '⚠' },
  error: { color: colors.red, icon: '✗' },
  debug: { color: colors.gray, icon: '●' }
}

// Stats tracking
interface Stats {
  haiku: {
    inputTokens: number
    outputTokens: number
    cacheRead: number
    cacheCreation: number
    requests: number
  }
  db: {
    tracks: number
  }
}

const stats: Stats = {
  haiku: { inputTokens: 0, outputTokens: 0, cacheRead: 0, cacheCreation: 0, requests: 0 },
  db: { tracks: 0 }
}

function formatTime(): string {
  const now = new Date()
  return `${colors.gray}${now.toLocaleTimeString('fr-FR')}${colors.reset}`
}

function log(level: LogLevel, tag: string, message: string, data?: unknown): void {
  const config = levelConfig[level]
  const tagColor = colors.cyan

  const formatted = `${formatTime()} ${config.color}${config.icon}${colors.reset} ${tagColor}[${tag}]${colors.reset} ${message}`

  if (level === 'error') {
    console.error(formatted, data !== undefined ? data : '')
  } else if (level === 'warn') {
    console.warn(formatted, data !== undefined ? data : '')
  } else {
    console.log(formatted, data !== undefined ? data : '')
  }
}

function formatTokens(): string {
  const h = stats.haiku
  const cached = h.cacheRead > 0 ? ` ${colors.green}(${h.cacheRead} cached)${colors.reset}` : ''
  return `${colors.yellow}${h.inputTokens}${colors.reset}in/${colors.yellow}${h.outputTokens}${colors.reset}out${cached}`
}

function formatDbStats(): string {
  return `${colors.magenta}${stats.db.tracks}${colors.reset} tracks`
}

export const logger = {
  info: (tag: string, message: string, data?: unknown) => log('info', tag, message, data),
  success: (tag: string, message: string, data?: unknown) => log('success', tag, message, data),
  warn: (tag: string, message: string, data?: unknown) => log('warn', tag, message, data),
  error: (tag: string, message: string, data?: unknown) => log('error', tag, message, data),
  debug: (tag: string, message: string, data?: unknown) => log('debug', tag, message, data),

  // Shorthand for database operations
  db: {
    upsert: (table: string, count: number) => {
      if (table.includes('track')) stats.db.tracks += count
      log('success', 'DB', `${table}: ${count} upserted | Total: ${formatDbStats()}`)
    },
    error: (table: string, error: string) => log('error', 'DB', `${table}: ${error}`)
  },

  // Shorthand for AI Query with token tracking
  ai: {
    query: (question: string, sql: string) => {
      log('info', 'AI', `"${question}"`)
      log('debug', 'AI', `SQL: ${colors.magenta}${sql}${colors.reset}`)
    },
    tokens: (input: number, output: number, cacheRead = 0, cacheCreation = 0) => {
      stats.haiku.inputTokens += input
      stats.haiku.outputTokens += output
      stats.haiku.cacheRead += cacheRead
      stats.haiku.cacheCreation += cacheCreation
      stats.haiku.requests++
      log('info', 'AI', `Tokens: ${formatTokens()} | Requests: ${colors.cyan}${stats.haiku.requests}${colors.reset}`)
    },
    result: (count: number) => log('success', 'AI', `${count} results`),
    error: (error: string) => log('error', 'AI', error)
  },

  // Get current stats
  getStats: () => ({ ...stats })
}
