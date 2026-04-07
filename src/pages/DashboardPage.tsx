import { useLiveQuery } from 'dexie-react-hooks'
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
  subDays,
} from 'date-fns'
import { Activity, Flame, Scale, Sparkles, Target, UtensilsCrossed } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { db } from '../lib/db'
import { calculateEnergyTargetBreakdown } from '../lib/targets'
import {
  calculateConsistencyStreak,
  formatDateTime,
  formatDistance,
  formatLongDate,
  formatWeight,
  friendlyRelativeTime,
  sumMealMacros,
  toDayKey,
  toDisplayWeight,
} from '../lib/utils'
import type { AppSettings } from '../types'

interface DashboardPageProps {
  settings: AppSettings
}

export function DashboardPage({ settings }: DashboardPageProps) {
  const meals = useLiveQuery(
    () => db.mealEntries.orderBy('occurredAt').reverse().limit(200).toArray(),
    [],
    [],
  )
  const weights = useLiveQuery(
    () => db.weightEntries.orderBy('date').reverse().limit(40).toArray(),
    [],
    [],
  )
  const sessions = useLiveQuery(
    () => db.workoutSessions.orderBy('occurredAt').reverse().limit(40).toArray(),
    [],
    [],
  )

  const todayKey = toDayKey(new Date())
  const weekStartsOn = settings.weekStartsOn === 'monday' ? 1 : 0

  const todayMeals = useMemo(
    () => meals.filter((entry) => entry.dayKey === todayKey),
    [meals, todayKey],
  )

  const todayMacros = useMemo(() => sumMealMacros(todayMeals), [todayMeals])

  const weeklyWorkouts = useMemo(() => {
    const intervalStart = startOfWeek(new Date(), { weekStartsOn })
    const intervalEnd = endOfWeek(new Date(), { weekStartsOn })

    return sessions.filter((session) => {
      const occurredAt = parseISO(session.occurredAt)
      return occurredAt >= intervalStart && occurredAt <= intervalEnd
    })
  }, [sessions, weekStartsOn])

  const activityStreak = useMemo(() => {
    const activityKeys = [
      ...meals.map((entry) => entry.dayKey),
      ...weights.map((entry) => entry.date),
      ...sessions.map((session) => toDayKey(session.occurredAt)),
    ]

    return calculateConsistencyStreak(activityKeys)
  }, [meals, sessions, weights])

  const calorieTrend = useMemo(
    () =>
      eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() }).map((day) => {
        const dayKey = toDayKey(day)
        const dayTotals = sumMealMacros(meals.filter((entry) => entry.dayKey === dayKey))

        return {
          day: format(day, 'EEE'),
          calories: dayTotals.calories,
          protein: dayTotals.protein,
        }
      }),
    [meals],
  )

  const weightTrend = useMemo(
    () =>
      weights
        .slice()
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(-14)
        .map((entry) => ({
          day: format(parseISO(`${entry.date}T00:00:00`), 'MMM d'),
          weight: Number(toDisplayWeight(entry.weightKg, settings.profile.unit).toFixed(1)),
        })),
    [settings.profile.unit, weights],
  )

  const latestWeight = weights[0]
  const previousWeight = weights[1]
  const latestSession = sessions[0]
  const energyTargetKcal = calculateEnergyTargetBreakdown(settings, latestWeight?.weightKg).energyTargetKcal
  const caloriesRemaining = Math.max(0, energyTargetKcal - todayMacros.calories)
  const proteinProgress = Math.min(
    100,
    (todayMacros.protein / Math.max(settings.profile.proteinTarget, 1)) * 100,
  )

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Command center"
        title="Forge your day"
        description="Stay on top of calories, protein, weigh-ins, and training momentum from one local-first dashboard."
        actions={
          <>
            <Link to="/meals" className="button button-primary">
              Log meal
            </Link>
            <Link to="/workouts" className="button button-secondary">
              Track workout
            </Link>
          </>
        }
      />

      <div className="metric-grid">
        <article className="metric-card accent-card">
          <span className="metric-label">Calories today</span>
          <strong className="metric-value">{todayMacros.calories}</strong>
          <span className="metric-hint">{caloriesRemaining} kcal left in your target</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Protein progress</span>
          <strong className="metric-value">{todayMacros.protein} g</strong>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${proteinProgress}%` }} />
          </div>
          <span className="metric-hint">Goal: {settings.profile.proteinTarget} g</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Consistency streak</span>
          <strong className="metric-value">{activityStreak} day{activityStreak === 1 ? '' : 's'}</strong>
          <span className="metric-hint">Any meal, weight, or workout log counts.</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Latest weight</span>
          <strong className="metric-value">
            {latestWeight
              ? formatWeight(latestWeight.weightKg, settings.profile.unit)
              : '—'}
          </strong>
          <span className="metric-hint">
            {latestWeight && previousWeight
              ? `${latestWeight.weightKg >= previousWeight.weightKg ? '+' : ''}${(
                  toDisplayWeight(latestWeight.weightKg - previousWeight.weightKg, settings.profile.unit)
                ).toFixed(1)} ${settings.profile.unit} from the previous log`
              : 'Add a weigh-in to start the trend line.'}
          </span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Workouts this week</span>
          <strong className="metric-value">{weeklyWorkouts.length}</strong>
          <span className="metric-hint">
            {weeklyWorkouts.length > 0
              ? `${weeklyWorkouts.reduce((total, session) => total + session.durationMinutes, 0)} min logged so far`
              : 'No sessions yet this week — a ten-minute win still counts.'}
          </span>
        </article>
      </div>

      <div className="grid grid-two">
        <SectionCard
          title="7-day fuel rhythm"
          description="Calories and protein from your recent meal log."
          action={
            <span className="chip">
              <Flame size={16} /> {energyTargetKcal} kcal target
            </span>
          }
        >
          {meals.length > 0 ? (
            <div className="chart-wrap">
              <ResponsiveContainer>
                <BarChart data={calorieTrend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="calories" fill="#7c3aed" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state">
              Log your first meal and this chart will start showing your weekly calorie rhythm.
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Weight trend"
          description="The last two weeks of weigh-ins, displayed in your preferred unit."
          action={
            <span className="chip">
              <Scale size={16} /> {settings.profile.unit.toUpperCase()}
            </span>
          }
        >
          {weightTrend.length > 1 ? (
            <div className="chart-wrap">
              <ResponsiveContainer>
                <LineChart data={weightTrend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="day" />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state">
              Add a couple of weigh-ins and Forge Fitness will draw the trend for you.
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-two">
        <SectionCard
          title="Today’s highlights"
          description={formatLongDate(new Date())}
          action={
            <Link to="/meals" className="button button-ghost">
              <UtensilsCrossed size={18} /> Open meals
            </Link>
          }
        >
          {todayMeals.length > 0 ? (
            <div className="history-list">
              {todayMeals.map((entry) => (
                <article key={entry.id} className="history-card">
                  <div className="history-card-top">
                    <div>
                      <h3>{entry.foodName}</h3>
                      <p>
                        {entry.servings} × {entry.servingLabel} • {entry.mealType}
                      </p>
                    </div>
                    <span className="chip">{entry.calories * entry.servings} kcal</span>
                  </div>
                  <div className="macro-strip">
                    <span className="macro-pill">P {entry.protein * entry.servings} g</span>
                    <span className="macro-pill">C {entry.carbs * entry.servings} g</span>
                    <span className="macro-pill">F {entry.fat * entry.servings} g</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              No meals logged yet today. Start with a quick barcode scan or add a pantry favorite.
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Training pulse"
          description="Your latest workout and the nudge for the next one."
          action={
            <Link to="/workouts" className="button button-ghost">
              <Activity size={18} /> Open workouts
            </Link>
          }
        >
          {latestSession ? (
            <div className="history-list">
              <article className="history-card">
                <div className="history-card-top">
                  <div>
                    <h3>{latestSession.name}</h3>
                    <p>
                      {latestSession.focus} • {formatDateTime(latestSession.occurredAt)}
                    </p>
                  </div>
                  <span className="chip">{friendlyRelativeTime(latestSession.occurredAt)}</span>
                </div>

                <div className="stats-line">
                  <span className="macro-pill">{latestSession.durationMinutes} min</span>
                  <span className="macro-pill">Energy {latestSession.energyLevel}/5</span>
                  <span className="macro-pill">Volume {formatWeight(latestSession.totalVolumeKg, settings.profile.unit, 0)}</span>
                </div>

                <ul>
                  {latestSession.exercises.slice(0, 4).map((exercise) => (
                    <li key={exercise.id}>
                      {exercise.name}
                      {typeof exercise.weightKg === 'number'
                        ? ` — ${exercise.sets ?? 0}×${exercise.reps ?? 0} @ ${formatWeight(exercise.weightKg, settings.profile.unit, 1)}`
                        : exercise.durationMinutes || exercise.distanceKm
                          ? ` — ${[
                              exercise.durationMinutes ? `${exercise.durationMinutes} min` : null,
                              typeof exercise.distanceKm === 'number'
                                ? formatDistance(exercise.distanceKm, settings.profile.unit)
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' • ')}`
                          : ''}
                    </li>
                  ))}
                </ul>
              </article>

              <div className="notice notice-success">
                <Sparkles size={18} />
                Small sessions count. Consistency outruns perfection almost every time.
              </div>
            </div>
          ) : (
            <div className="empty-state">
              Add your first workout and the dashboard will start surfacing volume and timing.
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Daily priorities"
        description="The quick-glance checklist that keeps the basics tight."
        action={
          <span className="chip">
            <Target size={16} /> Protein first, effort second, repeat tomorrow
          </span>
        }
      >
        <div className="grid grid-three">
          <article className="food-card">
            <div className="food-card-top">
              <div>
                <h3>Fuel</h3>
                <p>{todayMeals.length} entries today</p>
              </div>
              <span className="chip">{todayMacros.calories} kcal</span>
            </div>
            <p className="subtle-text">
              Protein is at {todayMacros.protein} g. If you want an easy bump, add a pantry
              favorite or scan a quick snack.
            </p>
          </article>

          <article className="food-card">
            <div className="food-card-top">
              <div>
                <h3>Scale</h3>
                <p>
                  {latestWeight
                    ? `Last update ${format(parseISO(`${latestWeight.date}T00:00:00`), 'MMM d')}`
                    : 'No weigh-ins yet'}
                </p>
              </div>
              <span className="chip">
                {latestWeight
                  ? formatWeight(latestWeight.weightKg, settings.profile.unit)
                  : 'Ready'}
              </span>
            </div>
            <p className="subtle-text">
              Even one weigh-in per week gives you a useful trend. More data, less guesswork.
            </p>
          </article>

          <article className="food-card">
            <div className="food-card-top">
              <div>
                <h3>Training</h3>
                <p>{weeklyWorkouts.length} sessions this week</p>
              </div>
              <span className="chip">{activityStreak} day streak</span>
            </div>
            <p className="subtle-text">
              Your next best session might just be the one you actually log, even if it’s a short one.
            </p>
          </article>
        </div>
      </SectionCard>
    </div>
  )
}