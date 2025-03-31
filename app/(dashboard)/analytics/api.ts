/**
 * API utility functions for analytics data fetching
 */

import { DateRange } from "react-day-picker";

/**
 * Fetches general analytics data based on date range
 */
export async function fetchAnalyticsData(dateRange?: DateRange) {
  const fromDate = dateRange?.from ? dateRange.from.toISOString() : '';
  const toDate = dateRange?.to ? dateRange.to.toISOString() : '';
  
  const res = await fetch(`/api/analytics?from=${fromDate}&to=${toDate}`);
  
  if (!res.ok) {
    throw new Error('Failed to fetch analytics data');
  }
  
  return res.json();
}

/**
 * Fetches party-specific analytics data (top agencies and clients)
 */
export async function fetchPartiesData(dateRange?: DateRange) {
  const fromDate = dateRange?.from ? dateRange.from.toISOString() : '';
  const toDate = dateRange?.to ? dateRange.to.toISOString() : '';
  
  const res = await fetch(`/api/analytics/parties?from=${fromDate}&to=${toDate}`);
  
  if (!res.ok) {
    throw new Error('Failed to fetch parties data');
  }
  
  return res.json();
}

/**
 * Fetches activity heatmap data
 */
export async function fetchActivityData(activityType: string = 'all', dateRange?: DateRange) {
  const fromDate = dateRange?.from ? dateRange.from.toISOString() : '';
  const toDate = dateRange?.to ? dateRange.to.toISOString() : '';
  
  const res = await fetch(`/api/analytics/activity?type=${activityType}&from=${fromDate}&to=${toDate}`);
  
  if (!res.ok) {
    throw new Error('Failed to fetch activity data');
  }
  
  return res.json();
}

/**
 * Fetches inventory metrics data
 */
export async function fetchInventoryData(dateRange?: DateRange) {
  const fromDate = dateRange?.from ? dateRange.from.toISOString() : '';
  const toDate = dateRange?.to ? dateRange.to.toISOString() : '';
  
  const res = await fetch(`/api/analytics/inventory?from=${fromDate}&to=${toDate}`);
  
  if (!res.ok) {
    throw new Error('Failed to fetch inventory data');
  }
  
  return res.json();
}

/**
 * Fetches user performance data
 */
export async function fetchUserPerformanceData(dateRange?: DateRange) {
  const fromDate = dateRange?.from ? dateRange.from.toISOString() : '';
  const toDate = dateRange?.to ? dateRange.to.toISOString() : '';
  
  const res = await fetch(`/api/analytics/user-performance?from=${fromDate}&to=${toDate}`);
  
  if (!res.ok) {
    throw new Error('Failed to fetch user performance data');
  }
  
  return res.json();
} 