import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Wine, Flame, Sparkles, Calendar, Clock, MapPin, TrendingUp, Info } from 'lucide-react';
import { useSpotOn } from '../../context/SpotOnContext';
import { formatCurrency, getTimeBucket, getDayOfWeek } from '../../utils/formatters';
import { Category, Purchase } from '../../types';

export const InsightsScreen: React.FC = () => {
  const { purchases, settings } = useSpotOn();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [hoveredHeatmapCell, setHoveredHeatmapCell] = useState<{
    day: string;
    bucket: string;
    amount: number;
    count: number;
  } | null>(null);

  // Filter purchases by period
  const filteredData = useMemo(() => {
    const now = new Date();
    let startTime = 0;

    if (period === 'week') {
      startTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    } else if (period === 'month') {
      startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    } else if (period === 'year') {
      startTime = new Date(now.getFullYear(), 0, 1).getTime();
    }

    return purchases.filter((p) => new Date(p.date).getTime() >= startTime);
  }, [purchases, period]);

  // Overall sums
  const { totalSpend, alcoholSpend, tobaccoSpend, alcPercent, tobPercent } = useMemo(() => {
    let tot = 0;
    let alc = 0;
    let tob = 0;
    filteredData.forEach((p) => {
      tot += p.totalPrice;
      if (p.category === 'alcohol') alc += p.totalPrice;
      if (p.category === 'tobacco') tob += p.totalPrice;
    });

    const alcP = tot > 0 ? Math.round((alc / tot) * 100) : 50;
    const tobP = tot > 0 ? 100 - alcP : 50;

    return {
      totalSpend: tot,
      alcoholSpend: alc,
      tobaccoSpend: tob,
      alcPercent: alcP,
      tobPercent: tobP,
    };
  }, [filteredData]);

  // Chart 1: Daily totals line chart data
  const lineChartData = useMemo(() => {
    const daysCount = period === 'week' ? 7 : period === 'month' ? 30 : 12;
    const points: { label: string; dateStr: string; amount: number }[] = [];

    if (period === 'year') {
      // Monthly buckets for year view
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentYear = new Date().getFullYear();
      for (let m = 0; m < 12; m++) {
        let sum = 0;
        filteredData.forEach((p) => {
          const d = new Date(p.date);
          if (d.getFullYear() === currentYear && d.getMonth() === m) {
            sum += p.totalPrice;
          }
        });
        points.push({
          label: monthNames[m],
          dateStr: `${currentYear}-${m + 1}`,
          amount: Number(sum.toFixed(2)),
        });
      }
    } else {
      // Daily points
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const label = period === 'week'
          ? d.toLocaleDateString(undefined, { weekday: 'short' })
          : d.getDate().toString();

        let daySum = 0;
        filteredData.forEach((p) => {
          if (p.date.startsWith(dateStr)) {
            daySum += p.totalPrice;
          }
        });

        points.push({
          label,
          dateStr,
          amount: Number(daySum.toFixed(2)),
        });
      }
    }

    return points;
  }, [filteredData, period]);

  const maxLineAmount = useMemo(() => {
    return Math.max(...lineChartData.map((p) => p.amount), 10);
  }, [lineChartData]);

  // Heatmap Data (Days: Mon-Sun x Buckets: Morning, Afternoon, Evening, Night)
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
  const BUCKETS = ['Morning', 'Afternoon', 'Evening', 'Night'] as const;

  const heatmapMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, { amount: number; count: number }>> = {};

    BUCKETS.forEach((b) => {
      matrix[b] = {};
      DAYS.forEach((d) => {
        matrix[b][d] = { amount: 0, count: 0 };
      });
    });

    purchases.forEach((p) => {
      const bucket = getTimeBucket(p.date);
      const day = getDayOfWeek(p.date);
      if (matrix[bucket] && matrix[bucket][day]) {
        matrix[bucket][day].amount += p.totalPrice;
        matrix[bucket][day].count += 1;
      }
    });

    let maxCell = 0;
    BUCKETS.forEach((b) => {
      DAYS.forEach((d) => {
        if (matrix[b][d].amount > maxCell) {
          maxCell = matrix[b][d].amount;
        }
      });
    });

    return { matrix, maxCell: maxCell || 1 };
  }, [purchases]);

  // Generated Intelligent Insights
  const dynamicInsights = useMemo(() => {
    const insights: string[] = [];

    if (purchases.length === 0) {
      return ['Log a few purchases to unlock pattern insights.'];
    }

    // 1. Day of highest spend
    const daySpendMap: Record<string, number> = {};
    const placeMap: Record<string, number> = {};
    let totalAll = 0;

    purchases.forEach((p) => {
      const day = getDayOfWeek(p.date);
      daySpendMap[day] = (daySpendMap[day] || 0) + p.totalPrice;
      placeMap[p.place] = (placeMap[p.place] || 0) + p.totalPrice;
      totalAll += p.totalPrice;
    });

    const dayEntries = Object.entries(daySpendMap).sort((a, b) => b[1] - a[1]);
    if (dayEntries.length > 0) {
      const topDay = dayEntries[0][0];
      const topDayFull =
        topDay === 'Fri'
          ? 'Fridays'
          : topDay === 'Sat'
          ? 'Saturdays'
          : topDay === 'Sun'
          ? 'Sundays'
          : `${topDay}s`;
      insights.push(`You spend the most on ${topDayFull} (${formatCurrency(dayEntries[0][1], settings.currencySymbol)} total tracked).`);
    }

    // 2. Average Daily Spending
    const now = new Date();
    const currentMonthPurchases = purchases.filter((p) => {
      const d = new Date(p.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const currentMonthSum = currentMonthPurchases.reduce((acc, p) => acc + p.totalPrice, 0);
    const dayOfMonth = Math.max(1, now.getDate());
    const avgDaily = currentMonthSum / dayOfMonth;
    insights.push(`Average daily spending this month: ${formatCurrency(avgDaily, settings.currencySymbol)}.`);

    // 3. Top place
    const placeEntries = Object.entries(placeMap).sort((a, b) => b[1] - a[1]);
    if (placeEntries.length > 0 && totalAll > 0) {
      const topPlace = placeEntries[0][0];
      const placePercent = Math.round((placeEntries[0][1] / totalAll) * 100);
      insights.push(`Most frequent location: ${topPlace} (${placePercent}% of total tracked spending).`);
    }

    // 4. Split
    if (alcSpendRate(purchases) > 0) {
      insights.push(
        `Alcohol accounts for ${alcPercent}% of spending and Tobacco for ${tobPercent}%.`
      );
    }

    return insights;
  }, [purchases, settings.currencySymbol, alcPercent, tobPercent]);

  function alcSpendRate(plist: Purchase[]) {
    return plist.filter((p) => p.category === 'alcohol').length;
  }

  return (
    <div className="space-y-4 pb-28">
      {/* Top Bar / Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Insights</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Patterns, trends, and spending balance</p>
        </div>

        {/* Period Selector (Segmented Control: Week · Month · Year) */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-semibold">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-xl capitalize transition ${
                period === p
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Insight Cards (Top Highlights) */}
      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Key Patterns</span>
        </div>
        <div className="space-y-1.5">
          {dynamicInsights.map((insight, idx) => (
            <p key={idx} className="text-xs text-blue-950 dark:text-blue-200 font-medium leading-relaxed flex items-start gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              {insight}
            </p>
          ))}
        </div>
      </div>

      {/* Chart 1: Daily Totals (Line / Area Chart) */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-sm text-slate-900 dark:text-white">Daily Spending Trend</span>
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Total: {formatCurrency(totalSpend, settings.currencySymbol)}
          </span>
        </div>

        {/* SVG Curve Chart */}
        <div className="w-full h-44 pt-2">
          {lineChartData.length > 0 ? (
            <div className="relative w-full h-full flex flex-col justify-between">
              {/* Y-axis helper guides */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="border-b border-dashed border-slate-400 w-full" />
                <div className="border-b border-dashed border-slate-400 w-full" />
                <div className="border-b border-slate-400 w-full" />
              </div>

              {/* Dynamic SVG with smooth line and gradient */}
              <svg className="w-full h-32 overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Area Fill */}
                <path
                  d={`
                    M 0 100
                    ${lineChartData
                      .map((d, i) => {
                        const x = (i / (lineChartData.length - 1 || 1)) * 300;
                        const y = 100 - (d.amount / maxLineAmount) * 85;
                        return `L ${x} ${y}`;
                      })
                      .join(' ')}
                    L 300 100 Z
                  `}
                  fill="url(#chartGradient)"
                />

                {/* Line stroke */}
                <path
                  d={`
                    M 0 ${100 - (lineChartData[0]?.amount / maxLineAmount) * 85 || 100}
                    ${lineChartData
                      .map((d, i) => {
                        const x = (i / (lineChartData.length - 1 || 1)) * 300;
                        const y = 100 - (d.amount / maxLineAmount) * 85;
                        return `L ${x} ${y}`;
                      })
                      .join(' ')}
                  `}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {lineChartData.map((d, i) => {
                  const x = (i / (lineChartData.length - 1 || 1)) * 300;
                  const y = 100 - (d.amount / maxLineAmount) * 85;
                  if (d.amount === 0 && lineChartData.length > 15) return null;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={d.amount > 0 ? '3.5' : '2'}
                      className="fill-blue-600 stroke-white dark:stroke-slate-900 stroke-2"
                    />
                  );
                })}
              </svg>

              {/* X-axis labels */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1 font-medium">
                <span>{lineChartData[0]?.label || ''}</span>
                {lineChartData.length > 2 && (
                  <span>{lineChartData[Math.floor(lineChartData.length / 2)]?.label || ''}</span>
                )}
                <span>{lineChartData[lineChartData.length - 1]?.label || ''}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-400">
              No data for this time frame
            </div>
          )}
        </div>
      </div>

      {/* Chart 2: Category Split (Pie / Donut chart) */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm text-slate-900 dark:text-white">Category Split</span>
          <span className="text-xs text-slate-400">Alcohol vs Tobacco</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5 justify-around pt-2">
          {/* Visual Donut Ring */}
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              {/* Background circle */}
              <path
                className="text-slate-200 dark:text-slate-800 stroke-current"
                strokeWidth="4"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              {/* Alcohol arc (Slate-900 / Blue) */}
              <path
                className="text-slate-900 dark:text-blue-500 stroke-current transition-all duration-500"
                strokeDasharray={`${alcPercent}, 100`}
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {formatCurrency(totalSpend, settings.currencySymbol)}
              </span>
            </div>
          </div>

          {/* Legend Details */}
          <div className="space-y-2.5 w-full sm:w-auto">
            {/* Alcohol */}
            <div className="flex items-center justify-between gap-6 p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-900 dark:bg-blue-500" />
                <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">Alcohol</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-xs text-slate-900 dark:text-white block">
                  {formatCurrency(alcoholSpend, settings.currencySymbol)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{alcPercent}% of total</span>
              </div>
            </div>

            {/* Tobacco */}
            <div className="flex items-center justify-between gap-6 p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">Tobacco</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-xs text-slate-900 dark:text-white block">
                  {formatCurrency(tobaccoSpend, settings.currencySymbol)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{tobPercent}% of total</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap: Grid (Days: Mon–Sun x Time Buckets: Morning, Afternoon, Evening, Night) */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-sm text-slate-900 dark:text-white block">Spending Heatmap</span>
            <span className="text-xs text-slate-400">Day & Time Patterns</span>
          </div>
          {hoveredHeatmapCell ? (
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              {hoveredHeatmapCell.day} {hoveredHeatmapCell.bucket}: {formatCurrency(hoveredHeatmapCell.amount, settings.currencySymbol)} ({hoveredHeatmapCell.count})
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">Tap cell for details</span>
          )}
        </div>

        {/* Matrix Grid */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="py-1 px-1 text-left text-[10px] font-semibold text-slate-400 w-16">Time</th>
                {DAYS.map((d) => (
                  <th key={d} className="py-1 px-1 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/80">
              {BUCKETS.map((bucket) => (
                <tr key={bucket}>
                  <td className="py-1.5 px-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {bucket}
                  </td>
                  {DAYS.map((day) => {
                    const cell = heatmapMatrix.matrix[bucket][day];
                    const intensity = cell.amount > 0 ? Math.min(1, cell.amount / (heatmapMatrix.maxCell * 0.8)) : 0;

                    let bgClass = 'bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300';
                    if (intensity > 0.75) bgClass = 'bg-blue-600 text-white shadow-xs';
                    else if (intensity > 0.5) bgClass = 'bg-blue-500 text-white';
                    else if (intensity > 0.25) bgClass = 'bg-blue-200 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200';
                    else if (intensity > 0) bgClass = 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300';

                    return (
                      <td key={day} className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setHoveredHeatmapCell({
                              day,
                              bucket,
                              amount: cell.amount,
                              count: cell.count,
                            })
                          }
                          onMouseEnter={() =>
                            setHoveredHeatmapCell({
                              day,
                              bucket,
                              amount: cell.amount,
                              count: cell.count,
                            })
                          }
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-[10px] transition-all duration-150 active:scale-95 ${bgClass}`}
                        >
                          {cell.amount > 0 ? `${Math.round(cell.amount)}` : ''}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800">
          <span>Morning (6-12) · Afternoon (12-18) · Evening (18-24) · Night (0-6)</span>
          <div className="flex items-center gap-1">
            <span>Low</span>
            <div className="w-2.5 h-2.5 rounded bg-blue-100 dark:bg-blue-950" />
            <div className="w-2.5 h-2.5 rounded bg-blue-300 dark:bg-blue-800" />
            <div className="w-2.5 h-2.5 rounded bg-blue-600" />
            <span>High</span>
          </div>
        </div>
      </div>
    </div>
  );
};
