"use client"

export function tweleHrFormatDateString(date: Date) {
  return new Date(date).toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}