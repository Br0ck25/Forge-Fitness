import { useLiveQuery } from 'dexie-react-hooks'
import { endOfWeek, parseISO, startOfWeek } from 'date-fns'
import {
  BookmarkPlus,
  Clock3,
  Dumbbell,
  Plus,
  Trash2,
  Trophy,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import {
  db,
  deleteWorkoutSession,
  saveWorkoutSession,
  saveWorkoutTemplate,
} from '../lib/db'
import { calculateWorkoutVolume, formatDateTime } from '../lib/utils'
import type {
  AppSettings,
  ExerciseType,
  LoggedExercise,
  WorkoutExerciseTemplate,
  WorkoutTemplate,
} from '../types'

interface WorkoutsPageProps {
  settings: AppSettings
}

interface ExerciseEditor {
  id: string
  name: string
  type: ExerciseType
  sets: string
  reps: string
  weightKg: string
  durationMinutes: string
  distanceKm: string
  note: string
}

const createExerciseEditor = (): ExerciseEditor => ({
  id: crypto.randomUUID(),
  name: '',
  type: 'strength',
  sets: '3',
  reps: '8',
  weightKg: '',
  durationMinutes: '',
  distanceKm: '',
  note: '',
})

const fromTemplateExercise = (exercise: WorkoutExerciseTemplate): ExerciseEditor => ({
  id: crypto.randomUUID(),
  name: exercise.name,
  type: exercise.type,
  sets: exercise.defaultSets ? String(exercise.defaultSets) : '',
  reps: exercise.defaultReps ? String(exercise.defaultReps) : '',
  weightKg:
    exercise.defaultWeightKg !== undefined ? String(exercise.defaultWeightKg) : '',
  durationMinutes:
    exercise.defaultDurationMinutes !== undefined
      ? String(exercise.defaultDurationMinutes)
      : '',
  distanceKm: '',
  note: exercise.note ?? '',
})

export function WorkoutsPage({ settings }: WorkoutsPageProps) {
  const templates = useLiveQuery(
    () => db.workoutTemplates.orderBy('updatedAt').reverse().toArray(),
    [],
    [],
  )
  const sessions = useLiveQuery(
    () => db.workoutSessions.orderBy('occurredAt').reverse().toArray(),
    [],
    [],
  )

  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [sessionFocus, setSessionFocus] = useState('Strength')
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [durationMinutes, setDurationMinutes] = useState('45')
  const [energyLevel, setEnergyLevel] = useState('3')
  const [note, setNote] = useState('')
  const [exerciseRows, setExerciseRows] = useState<ExerciseEditor[]>([createExerciseEditor()])
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const weekStartsOn = settings.weekStartsOn === 'monday' ? 1 : 0

  const sessionsThisWeek = useMemo(() => {
    const intervalStart = startOfWeek(new Date(), { weekStartsOn })
    const intervalEnd = endOfWeek(new Date(), { weekStartsOn })

    return sessions.filter((session) => {
      const date = parseISO(session.occurredAt)
      return date >= intervalStart && date <= intervalEnd
    })
  }, [sessions, weekStartsOn])

  const totalVolumeThisWeek = useMemo(
    () => sessionsThisWeek.reduce((total, session) => total + session.totalVolumeKg, 0),
    [sessionsThisWeek],
  )

  const heaviestExercise = useMemo(() => {
    const candidates = sessions
      .flatMap((session) => session.exercises)
      .filter((exercise) => typeof exercise.weightKg === 'number' && exercise.weightKg > 0)

    if (candidates.length === 0) {
      return null
    }

    return candidates.reduce((heaviest, current) =>
      (current.weightKg ?? 0) > (heaviest.weightKg ?? 0) ? current : heaviest,
    )
  }, [sessions])

  const resetComposer = () => {
    setSelectedTemplateId('')
    setSessionName('')
    setSessionFocus('Strength')
    setOccurredAt(new Date().toISOString().slice(0, 16))
    setDurationMinutes('45')
    setEnergyLevel('3')
    setNote('')
    setExerciseRows([createExerciseEditor()])
  }

  const loadTemplate = (template: WorkoutTemplate) => {
    setSelectedTemplateId(template.id)
    setSessionName(template.name)
    setSessionFocus(template.focus)
    setDurationMinutes(
      String(
        template.exercises.reduce(
          (total, exercise) => total + (exercise.defaultDurationMinutes ?? 0),
          45,
        ),
      ),
    )
    setExerciseRows(template.exercises.map(fromTemplateExercise))
    setFeedback({ type: 'success', text: `Loaded template: ${template.name}.` })
  }

  const handleExerciseChange = (
    id: string,
    field: keyof ExerciseEditor,
    value: string,
  ) => {
    setExerciseRows((current) =>
      current.map((exercise) =>
        exercise.id === id ? { ...exercise, [field]: value } : exercise,
      ),
    )
  }

  const normalizeExercises = (): LoggedExercise[] => {
    return exerciseRows
      .filter((exercise) => exercise.name.trim())
      .map((exercise) => ({
        id: exercise.id,
        name: exercise.name.trim(),
        type: exercise.type,
        sets: exercise.sets ? Number(exercise.sets) : undefined,
        reps: exercise.reps ? Number(exercise.reps) : undefined,
        weightKg: exercise.weightKg ? Number(exercise.weightKg) : undefined,
        durationMinutes: exercise.durationMinutes ? Number(exercise.durationMinutes) : undefined,
        distanceKm: exercise.distanceKm ? Number(exercise.distanceKm) : undefined,
        note: exercise.note.trim() || undefined,
      }))
  }

  const handleSaveSession = async () => {
    const normalizedExercises = normalizeExercises()

    if (!sessionName.trim()) {
      setFeedback({ type: 'error', text: 'Give the session a name before saving.' })
      return
    }

    if (normalizedExercises.length === 0) {
      setFeedback({ type: 'error', text: 'Add at least one exercise to the session.' })
      return
    }

    await saveWorkoutSession({
      templateId: selectedTemplateId || undefined,
      name: sessionName,
      focus: sessionFocus,
      occurredAt: new Date(occurredAt).toISOString(),
      exercises: normalizedExercises,
      durationMinutes:
        Number(durationMinutes) ||
        normalizedExercises.reduce((total, exercise) => total + (exercise.durationMinutes ?? 0), 0) ||
        30,
      energyLevel: Number(energyLevel) || 3,
      note: note || undefined,
    })

    setFeedback({ type: 'success', text: `${sessionName} saved to your workout history.` })
    resetComposer()
  }

  const handleSaveTemplate = async () => {
    const normalizedExercises = normalizeExercises()

    if (!sessionName.trim() || normalizedExercises.length === 0) {
      setFeedback({
        type: 'error',
        text: 'Give the session a name and at least one exercise before saving a template.',
      })
      return
    }

    await saveWorkoutTemplate({
      id: selectedTemplateId || undefined,
      name: sessionName,
      focus: sessionFocus,
      exercises: normalizedExercises.map((exercise) => ({
        id: crypto.randomUUID(),
        name: exercise.name,
        type: exercise.type,
        defaultSets: exercise.sets,
        defaultReps: exercise.reps,
        defaultWeightKg: exercise.weightKg,
        defaultDurationMinutes: exercise.durationMinutes,
        note: exercise.note,
      })),
    })

    setFeedback({ type: 'success', text: `${sessionName} saved as a reusable template.` })
  }

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Workouts"
        title="Capture sessions that actually happened"
        description="Use templates for repeatability, edit the details on the fly, and keep volume plus effort visible over time."
        actions={
          <button type="button" className="button button-ghost" onClick={resetComposer}>
            Reset composer
          </button>
        }
      />

      <div className="metric-grid">
        <article className="metric-card accent-card">
          <span className="metric-label">Sessions this week</span>
          <strong className="metric-value">{sessionsThisWeek.length}</strong>
          <span className="metric-hint">{sessionsThisWeek.reduce((total, session) => total + session.durationMinutes, 0)} minutes logged</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Volume this week</span>
          <strong className="metric-value">{totalVolumeThisWeek} kg</strong>
          <span className="metric-hint">Strength movements only</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Templates ready</span>
          <strong className="metric-value">{templates.length}</strong>
          <span className="metric-hint">Seeded with a few starter sessions</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Latest PR indicator</span>
          <strong className="metric-value">
            {heaviestExercise ? `${heaviestExercise.weightKg} kg` : '—'}
          </strong>
          <span className="metric-hint">
            {heaviestExercise ? `${heaviestExercise.name} is your heaviest logged lift.` : 'Log a weighted exercise to surface your heaviest lift.'}
          </span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Workouts logged</span>
          <strong className="metric-value">{sessions.length}</strong>
          <span className="metric-hint">Momentum loves evidence.</span>
        </article>
      </div>

      {feedback ? (
        <div className={`notice ${feedback.type === 'error' ? 'notice-error' : 'notice-success'}`}>
          {feedback.text}
        </div>
      ) : null}

      <div className="grid grid-two">
        <SectionCard
          title="Workout composer"
          description="Build from scratch or load a template, then save the session or turn it into a reusable workout."
          action={
            <div className="field">
              <label htmlFor="template-picker">Load template</label>
              <select
                id="template-picker"
                value={selectedTemplateId}
                onChange={(event) => {
                  const template = templates.find((item) => item.id === event.target.value)
                  setSelectedTemplateId(event.target.value)
                  if (template) {
                    loadTemplate(template)
                  }
                }}
              >
                <option value="">Start from scratch</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          <div className="field-grid two-up">
            <div className="field">
              <label htmlFor="session-name">Session name</label>
              <input
                id="session-name"
                value={sessionName}
                placeholder="Upper body push"
                onChange={(event) => setSessionName(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="session-focus">Focus</label>
              <input
                id="session-focus"
                value={sessionFocus}
                placeholder="Strength"
                onChange={(event) => setSessionFocus(event.target.value)}
              />
            </div>
          </div>

          <div className="field-grid two-up">
            <div className="field">
              <label htmlFor="session-occurred-at">When</label>
              <input
                id="session-occurred-at"
                type="datetime-local"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="session-duration">Duration (minutes)</label>
              <input
                id="session-duration"
                type="number"
                min="1"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
              />
            </div>
          </div>

          <div className="field-grid two-up">
            <div className="field">
              <label htmlFor="session-energy">Energy level (1-5)</label>
              <select
                id="session-energy"
                value={energyLevel}
                onChange={(event) => setEnergyLevel(event.target.value)}
              >
                <option value="1">1 — Running on fumes</option>
                <option value="2">2 — Not my finest</option>
                <option value="3">3 — Solid baseline</option>
                <option value="4">4 — Strong day</option>
                <option value="5">5 — Rocket mode</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="session-note">Notes</label>
              <input
                id="session-note"
                placeholder="Optional cues or context"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </div>

          <div className="exercise-list">
            {exerciseRows.map((exercise, index) => (
              <article key={exercise.id} className="exercise-card">
                <div className="entry-card-top">
                  <div>
                    <h3>Exercise {index + 1}</h3>
                    <p>
                      {exercise.type.charAt(0).toUpperCase() + exercise.type.slice(1)} entry
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button button-danger"
                    onClick={() =>
                      setExerciseRows((current) =>
                        current.length === 1
                          ? current
                          : current.filter((item) => item.id !== exercise.id),
                      )
                    }
                  >
                    <Trash2 size={16} /> Remove
                  </button>
                </div>

                <div className="field-grid two-up">
                  <div className="field">
                    <label>Name</label>
                    <input
                      value={exercise.name}
                      onChange={(event) =>
                        handleExerciseChange(exercise.id, 'name', event.target.value)
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Type</label>
                    <select
                      value={exercise.type}
                      onChange={(event) =>
                        handleExerciseChange(
                          exercise.id,
                          'type',
                          event.target.value as ExerciseType,
                        )
                      }
                    >
                      <option value="strength">Strength</option>
                      <option value="cardio">Cardio</option>
                      <option value="mobility">Mobility</option>
                    </select>
                  </div>
                </div>

                <div className="field-grid two-up">
                  <div className="field">
                    <label>Sets</label>
                    <input
                      type="number"
                      min="0"
                      value={exercise.sets}
                      onChange={(event) =>
                        handleExerciseChange(exercise.id, 'sets', event.target.value)
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Reps</label>
                    <input
                      type="number"
                      min="0"
                      value={exercise.reps}
                      onChange={(event) =>
                        handleExerciseChange(exercise.id, 'reps', event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="field-grid two-up">
                  <div className="field">
                    <label>Weight (kg)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={exercise.weightKg}
                      onChange={(event) =>
                        handleExerciseChange(exercise.id, 'weightKg', event.target.value)
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Duration (min)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={exercise.durationMinutes}
                      onChange={(event) =>
                        handleExerciseChange(
                          exercise.id,
                          'durationMinutes',
                          event.target.value,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="field-grid two-up">
                  <div className="field">
                    <label>Distance (km)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={exercise.distanceKm}
                      onChange={(event) =>
                        handleExerciseChange(exercise.id, 'distanceKm', event.target.value)
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Notes</label>
                    <input
                      value={exercise.note}
                      onChange={(event) =>
                        handleExerciseChange(exercise.id, 'note', event.target.value)
                      }
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="inline-row">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setExerciseRows((current) => [...current, createExerciseEditor()])}
            >
              <Plus size={18} /> Add exercise
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                void handleSaveSession()
              }}
            >
              <Dumbbell size={18} /> Save session
            </button>
            <button
              type="button"
              className="button button-ghost"
              onClick={() => {
                void handleSaveTemplate()
              }}
            >
              <BookmarkPlus size={18} /> Save as template
            </button>
          </div>
        </SectionCard>

        <div className="content-stack">
          <SectionCard
            title="Templates"
            description="Use a starter workout or save your own repeatable session structures."
          >
            {templates.length > 0 ? (
              <div className="template-list">
                {templates.map((template) => (
                  <article key={template.id} className="template-card">
                    <div className="template-card-top">
                      <div>
                        <h3>{template.name}</h3>
                        <p>{template.focus}</p>
                      </div>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => loadTemplate(template)}
                      >
                        Load
                      </button>
                    </div>
                    <ul>
                      {template.exercises.slice(0, 4).map((exercise) => (
                        <li key={exercise.id}>
                          {exercise.name}
                          {exercise.defaultSets
                            ? ` — ${exercise.defaultSets}×${exercise.defaultReps ?? 0}`
                            : exercise.defaultDurationMinutes
                              ? ` — ${exercise.defaultDurationMinutes} min`
                              : ''}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">No templates available yet.</div>
            )}
          </SectionCard>

          <SectionCard
            title="Recent sessions"
            description="Your workout history keeps duration, effort, and exercise details in one place."
          >
            {sessions.length > 0 ? (
              <div className="history-list">
                {sessions.map((session) => (
                  <article key={session.id} className="history-card">
                    <div className="history-card-top">
                      <div>
                        <h3>{session.name}</h3>
                        <p>
                          {session.focus} • {formatDateTime(session.occurredAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="button button-danger"
                        onClick={() => {
                          void deleteWorkoutSession(session.id)
                        }}
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>

                    <div className="stats-line">
                      <span className="macro-pill">
                        <Clock3 size={14} /> {session.durationMinutes} min
                      </span>
                      <span className="macro-pill">Energy {session.energyLevel}/5</span>
                      <span className="macro-pill">Volume {session.totalVolumeKg} kg</span>
                      <span className="macro-pill">
                        <Trophy size={14} /> {calculateWorkoutVolume(session.exercises)} kg
                      </span>
                    </div>

                    <ul>
                      {session.exercises.slice(0, 5).map((exercise) => (
                        <li key={exercise.id}>
                          {exercise.name}
                          {exercise.weightKg
                            ? ` — ${exercise.sets ?? 0}×${exercise.reps ?? 0} @ ${exercise.weightKg} kg`
                            : exercise.durationMinutes
                              ? ` — ${exercise.durationMinutes} min`
                              : ''}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">No workout sessions yet — save one from the composer to begin your history.</div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}