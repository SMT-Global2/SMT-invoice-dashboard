'use client'

import { useEffect, useState } from 'react'
import useAnalyticsStore from '@/store/useAnalyticsStore'
import { StatsCards } from './stats-cards'
import { TrendChart } from './trend-chart'
import { StatusBreakdown } from './status-breakdown'
import { UserActivity } from './user-activity'
import { TopParties } from './top-parties'
import { ActivityHeatmap } from './activity-heatmap'
import { DateRange } from 'react-day-picker'
import { addDays } from 'date-fns'

export default function AnalyticsDashboardPage() {
  const { fetchDashboardAnalytics } = useAnalyticsStore()

  const [dateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date()
  })

  useEffect(() => {
    fetchDashboardAnalytics(dateRange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      <StatsCards />
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <TrendChart />
      </div>
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <StatusBreakdown />
        <UserActivity />
      </div>
      <TopParties />
      <ActivityHeatmap />
    </div>
  )
}
