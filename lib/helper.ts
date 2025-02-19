"use client"

export function tweleHrFormatDateString(date: Date) {
  // return new Date(date).toLocaleString();
  return new Date(date).toLocaleString('en-US', {
    dateStyle: 'short',
    timeStyle: 'medium',
    hour12: true
  });
}