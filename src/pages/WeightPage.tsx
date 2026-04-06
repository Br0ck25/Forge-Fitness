import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO } from 'date-fns'
import { Scale, Target, Trash2, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
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
import { db, deleteWeightEntry, saveWeightEntry } from '../lib/db'
import { formatWeight, fromDisplayWeight, toDayKey, toDisplayWeight } from '../lib/utils'
import type { AppSettings } from '../types'

interface WeightPageProps {
  settings: AppSettings
}

export function WeightPage({ settings }: WeightPageProps) {
  const entries = useLiveQuery(
    () => db.weightEntries.orderBy('date').reverse().toArray(),
    [],
    [],
  )

  const [date, setDate] = useState(() => toDayKey(new Date()))
  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const latest = entries[0]
  const previous = entries[1]
  const goalWeight = settings.profile.weightGoalKg

  const chartData = useMemo(
    () =>
      entries
        .slice()
        .sort((left, right) => left.date.localeCompare(right.date))
        .map((entry) => ({
          label: format(parseISO(`${entry.date}T00:00:00`), 'MMM d'),
          weight: Number(toDisplayWeight(entry.weightKg, settings.profile.unit).toFixed(1)),
        })),
    [entries, settings.profile.unit],
  )

  const averageOfRecentEntries = useMemo(() => {
    const recent = entries.slice(0, 7)

    if (recent.length === 0) {
      return 0
    }

    const averageKg = recent.reduce((total, entry) => total + entry.weightKg, 0) / recent.length
    return Number(toDisplayWeight(averageKg, settings.profile.unit).toFixed(1))
  }, [entries, settings.profile.unit])

  const handleSave = async () => {
    const numericWeight = Number(weight)

    if (!numericWeight) {
      setFeedback({ type: 'error', text: 'Enter a weight value before saving.' })
      return
    }

    await saveWeightEntry({
      date,
      weightKg: fromDisplayWeight(numericWeight, settings.profile.unit),
      note: note || undefined,
    })

    setWeight('')
    setNote('')
    setFeedback({
      type: 'success',
      text: 'Weight saved. If the date already existed, the entry was updated in place.',
    })
  }

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Weight"
        title="Keep the trend honest"
        description="A single data point never tells the whole story. Use the trend line, not one spicy weigh-in, to steer the ship."
      />

      <div className="metric-grid">
        <article className="metric-card accent-card">
          <span className="metric-label">Latest weigh-in</span>
          <strong className="metric-value">
            {latest ? formatWeight(latest.weightKg, settings.profile.unit) : '—'}
          </strong>
          <span className="metric-hint">
            {latest ? format(parseISO(`${latest.date}T00:00:00`), 'MMM d') : 'No entries yet'}
          </span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Change from previous</span>
          <strong className="metric-value">
            {latest && previous
              ? `${toDisplayWeight(latest.weightKg - previous.weightKg, settings.profile.unit).toFixed(1)} ${settings.profile.unit}`
              : '—'}
          </strong>
          <span className="metric-hint">Compare trends, not emotions.</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Recent average</span>
          <strong className="metric-value">
            {averageOfRecentEntries ? `${averageOfRecentEntries} ${settings.profile.unit}` : '—'}
          </strong>
          <span className="metric-hint">Average of the latest 7 entries</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Goal weight</span>
          <strong className="metric-value">
            {goalWeight ? formatWeight(goalWeight, settings.profile.unit) : 'Unset'}
          </strong>
          <span className="metric-hint">
            {goalWeight && latest
              ? `${Math.abs(toDisplayWeight(latest.weightKg - goalWeight, settings.profile.unit)).toFixed(1)} ${settings.profile.unit} away`
              : 'Set a target in Settings whenever you are ready.'}
          </span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Logs recorded</span>
          <strong className="metric-value">{entries.length}</strong>
          <span className="metric-hint">More logs create a calmer, cleaner trend line.</span>
        </article>
      </div>

      {feedback ? (
        <div className={`notice ${feedback.type === 'error' ? 'notice-error' : 'notice-success'}`}>
          {feedback.text}
        </div>
      ) : null}

      <div className="grid grid-two">
        <SectionCard
          title="Weight trend"
          description="Built to spot drift, plateaus, and progress without spreadsheet acrobatics."
          action={
            <span className="chip">
              <TrendingUp size={16} /> {settings.profile.unit.toUpperCase()}
            </span>
          }
        >
          {chartData.length > 1 ? (
            <div className="chart-wrap">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="label" />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#7c3aed"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state">
              Add at least two entries and the trend line will appear here.
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Log today’s weight"
          description="If you save the same day twice, Forge Fitness updates the existing entry instead of stacking duplicates."
          action={
            <span className="chip">
              <Scale size={16} /> Goal-aware tracking
            </span>
          }
        >
          <div className="field-grid two-up">
            <div className="field">
              <label htmlFor="weight-date">Date</label>
              <input
                id="weight-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="weight-value">Weight ({settings.profile.unit})</label>
              <input
                id="weight-value"
                type="number"
                step="0.1"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="weight-note">Note</label>
            <textarea
              id="weight-note"
              placeholder="Optional note: hydration, travel, sodium, training fatigue..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <div className="inline-row">
            <button type="button" className="button button-primary" onClick={() => void handleSave()}>
              Save weigh-in
            </button>
            <span className="chip">
              <Target size={16} /> Small trend changes beat daily panic every time
            </span>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Recent weigh-ins"
        description="The latest entries stay close at hand so it’s easy to sanity-check the trend."
      >
        {entries.length > 0 ? (
          <div className="weight-list">
            {entries.map((entry) => (
              <article key={entry.id} className="weight-row">
                <div>
                  <strong>{formatWeight(entry.weightKg, settings.profile.unit)}</strong>
                  <span>
                    {format(parseISO(`${entry.date}T00:00:00`), 'EEEE, MMM d')}
                    {entry.note ? ` • ${entry.note}` : ''}
                  </span>
                </div>

                <button
                  type="button"
                  className="button button-danger"
                  onClick={() => {
                    void deleteWeightEntry(entry.id)
                  }}
                >
                  <Trash2 size={16} /> Delete
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">No weight entries yet. Add your first weigh-in to get started.</div>
        )}
      </SectionCard>
    </div>
  )
}