// utils/consoleColors.ts

/**
 * Utility functions for colored console logging
 * Supports INFO, SUCCESS, WARNING, ERROR levels
 */

// ANSI escape codes for colors
const Reset = "\x1b[0m";
const Bright = "\x1b[1m";
const Dim = "\x1b[2m";
const Underscore = "\x1b[4m";
const Blink = "\x1b[5m";
const Reverse = "\x1b[7m";
const Hidden = "\x1b[8m";

// Foreground colors
const FgBlack = "\x1b[30m";
const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";
const FgYellow = "\x1b[33m";
const FgBlue = "\x1b[34m";
const FgMagenta = "\x1b[35m";
const FgCyan = "\x1b[36m";
const FgWhite = "\x1b[37m";

/**
 * Logs an informational message in blue
 */
export function logInfo(message: string, ...optionalParams: any[]) {
  console.log(`${Bright}${FgBlue}[INFO]${Reset} ${message}`, ...optionalParams);
}

/**
 * Logs a success message in green
 */
export function logSuccess(message: string, ...optionalParams: any[]) {
  console.log(
    `${Bright}${FgGreen}[SUCCESS]${Reset} ${message}`,
    ...optionalParams
  );
}

/**
 * Logs a warning message in yellow
 */
export function logWarning(message: string, ...optionalParams: any[]) {
  console.log(
    `${Bright}${FgYellow}[WARNING]${Reset} ${message}`,
    ...optionalParams
  );
}

/**
 * Logs an error message in red
 */
export function logError(message: string, ...optionalParams: any[]) {
  console.error(
    `${Bright}${FgRed}[ERROR]${Reset} ${message}`,
    ...optionalParams
  );
}

/**
 * General purpose colored log
 */
export function logColored(
  message: string,
  colorCode: string,
  label: string = ""
) {
  const labelPrefix = label ? `${Bright}${colorCode}[${label}]${Reset} ` : "";
  console.log(`${labelPrefix}${message}`);
}
