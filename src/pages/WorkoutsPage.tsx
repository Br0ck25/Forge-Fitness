import { useLiveQuery } from 'dexie-react-hooks'
import { endOfWeek, parseISO, startOfWeek } from 'date-fns'
import {
  BookmarkPlus,
  Clock3,
  Dumbbell,
  Flame,
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
import {
  calculateWorkoutCaloriesBurned,
  getReferenceWeightKg,
  WORKOUT_INTENSITY_OPTIONS,
  WORKOUT_SESSION_TYPE_OPTIONS,
} from '../lib/targets'
import {
  calculateWorkoutVolume,
  formatDateTime,
  formatWeight,
  roundValue,
} from '../lib/utils'
import type {
  AppSettings,
  ExerciseType,
  LoggedExercise,
  WorkoutExerciseTemplate,
  WorkoutIntensity,
  WorkoutSessionType,
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

const getSessionTypeLabel = (sessionType?: WorkoutSessionType) =>
  WORKOUT_SESSION_TYPE_OPTIONS.find((option) => option.id === sessionType)?.label ?? 'Mixed'

const getIntensityLabel = (intensity?: WorkoutIntensity) =>
  WORKOUT_INTENSITY_OPTIONS.find((option) => option.id === intensity)?.label ?? 'Moderate'

const formatProgramSummary = (values: Array<string | undefined>) =>
  values.filter((value): value is string => Boolean(value?.trim())).join(' • ')

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
  const latestWeight = useLiveQuery(
    () => db.weightEntries.orderBy('date').last(),
    [],
    undefined,
  )

  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [sessionFocus, setSessionFocus] = useState('Strength')
  const [programName, setProgramName] = useState('')
  const [phaseName, setPhaseName] = useState('')
  const [dayLabel, setDayLabel] = useState('')
  const [sessionType, setSessionType] = useState<WorkoutSessionType>('mixed')
  const [intensity, setIntensity] = useState<WorkoutIntensity>('moderate')
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [durationMinutes, setDurationMinutes] = useState('45')
  const [energyLevel, setEnergyLevel] = useState('3')
  const [calorieOverride, setCalorieOverride] = useState('')
  const [note, setNote] = useState('')
  const [exerciseRows, setExerciseRows] = useState<ExerciseEditor[]>([createExerciseEditor()])
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const weekStartsOn = settings.weekStartsOn === 'monday' ? 1 : 0
  const referenceWeightKg = getReferenceWeightKg(settings, latestWeight?.weightKg)
  const parsedCalorieOverride = calorieOverride.trim()
    ? Math.max(0, Number(calorieOverride) || 0)
    : undefined

  const exerciseDurationMinutes = useMemo(
    () =>
      exerciseRows.reduce(
        (total, exercise) =>
          total + (exercise.durationMinutes ? Number(exercise.durationMinutes) || 0 : 0),
        0,
      ),
    [exerciseRows],
  )

  const effectiveDurationMinutes = Math.max(
    1,
    Number(durationMinutes) || exerciseDurationMinutes || 30,
  )
  const estimatedCaloriesBurned = calculateWorkoutCaloriesBurned(
    effectiveDurationMinutes,
    referenceWeightKg,
    sessionType,
    intensity,
  )
  const displayedCaloriesBurned = parsedCalorieOverride ?? estimatedCaloriesBurned

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

  const weeklyCaloriesBurned = useMemo(
    () =>
      sessionsThisWeek.reduce(
        (total, session) =>
          total +
          (session.caloriesBurned ??
            calculateWorkoutCaloriesBurned(
              session.durationMinutes,
              referenceWeightKg,
              session.sessionType ?? 'mixed',
              session.intensity ?? 'moderate',
            )),
        0,
      ),
    [referenceWeightKg, sessionsThisWeek],
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
    setProgramName('')
    setPhaseName('')
    setDayLabel('')
    setSessionType('mixed')
    setIntensity('moderate')
    setOccurredAt(new Date().toISOString().slice(0, 16))
    setDurationMinutes('45')
    setEnergyLevel('3')
    setCalorieOverride('')
    setNote('')
    setExerciseRows([createExerciseEditor()])
  }

  const loadTemplate = (template: WorkoutTemplate) => {
    setSelectedTemplateId(template.id)
    setSessionName(template.name)
    setSessionFocus(template.focus)
    setProgramName(template.programName ?? '')
    setPhaseName(template.phaseName ?? '')
    setDayLabel(template.dayLabel ?? '')
    setSessionType(template.sessionType ?? 'mixed')
    setIntensity(template.intensity ?? 'moderate')
    setDurationMinutes(
      String(
        template.exercises.reduce(
          (total, exercise) => total + (exercise.defaultDurationMinutes ?? 0),
          45,
        ),
      ),
    )
    setCalorieOverride('')
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
      programName: programName || undefined,
      phaseName: phaseName || undefined,
      dayLabel: dayLabel || undefined,
      sessionType,
      intensity,
      occurredAt: new Date(occurredAt).toISOString(),
      exercises: normalizedExercises,
      durationMinutes: effectiveDurationMinutes,
      energyLevel: Number(energyLevel) || 3,
      calorieOverride: parsedCalorieOverride,
      referenceWeightKg,
      note: note || undefined,
    })

    setFeedback({
      type: 'success',
      text: `${sessionName} saved with ${displayedCaloriesBurned} estimated calories burned.`,
    })
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
      programName: programName || undefined,
      phaseName: phaseName || undefined,
      dayLabel: dayLabel || undefined,
      sessionType,
      intensity,
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

    setFeedback({
      type: 'success',
      text: `${sessionName} saved as a reusable program template.`,
    })
  }

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Workouts"
        title="Log programs, not just random gym sessions"
        description="Track branded programs like your own custom template: add the program name, phase, day label, duration, and workout type, then let Forge Fitness estimate calories or accept your watch number."
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
          <span className="metric-hint">
            {sessionsThisWeek.reduce((total, session) => total + session.durationMinutes, 0)} minutes logged
          </span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Calories this week</span>
          <strong className="metric-value">{weeklyCaloriesBurned}</strong>
          <span className="metric-hint">Estimated from type, intensity, duration, and weight</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Volume this week</span>
          <strong className="metric-value">{totalVolumeThisWeek} kg</strong>
          <span className="metric-hint">Strength movements only</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Templates ready</span>
          <strong className="metric-value">{templates.length}</strong>
          <span className="metric-hint">Perfect for repeatable programs and phases</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Latest PR indicator</span>
          <strong className="metric-value">
            {heaviestExercise ? `${heaviestExercise.weightKg} kg` : '—'}
          </strong>
          <span className="metric-hint">
            {heaviestExercise
              ? `${heaviestExercise.name} is your heaviest logged lift.`
              : 'Log a weighted exercise to surface your heaviest lift.'}
          </span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Current session estimate</span>
          <strong className="metric-value">{displayedCaloriesBurned} kcal</strong>
          <span className="metric-hint">
            Based on {effectiveDurationMinutes} min at {formatWeight(referenceWeightKg, settings.profile.unit)}
          </span>
        </article>
      </div>

      {feedback ? (
        <div className={`notice ${feedback.type === 'error' ? 'notice-error' : 'notice-success'}`}>
          {feedback.text}
        </div>
      ) : null}

      <div className="notice notice-success">
        <Flame size={18} />
        For workouts like <strong>21 Day Fix</strong> or <strong>9 Week Control Freak</strong>, use
        <strong> Program name</strong>, <strong>Phase / Week</strong>, and <strong>Day label</strong>,
        then save that structure as a template. Calories are estimated from duration × body weight ×
        workout type × intensity, and you can override the estimate if your watch or app gives you a better number.
      </div>

      <div className="grid grid-two">
        <SectionCard
          title="Workout composer"
          description="Build from scratch or load a template, then save the session or turn it into a reusable workout program."
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
                placeholder="Strength, conditioning, recovery..."
                onChange={(event) => setSessionFocus(event.target.value)}
              />
            </div>
          </div>

          <div className="field-grid three-up">
            <div className="field">
              <label htmlFor="program-name">Program name</label>
              <input
                id="program-name"
                value={programName}
                placeholder="21 Day Fix"
                onChange={(event) => setProgramName(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="phase-name">Phase / week</label>
              <input
                id="phase-name"
                value={phaseName}
                placeholder="Week 2"
                onChange={(event) => setPhaseName(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="day-label">Day / block label</label>
              <input
                id="day-label"
                value={dayLabel}
                placeholder="Day 3 • Lower Fix"
                onChange={(event) => setDayLabel(event.target.value)}
              />
            </div>
          </div>

          <div className="field-grid two-up">
            <div className="field">
              <label htmlFor="session-type">Workout type</label>
              <select
                id="session-type"
                value={sessionType}
                onChange={(event) => setSessionType(event.target.value as WorkoutSessionType)}
              >
                {WORKOUT_SESSION_TYPE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="session-intensity">Intensity</label>
              <select
                id="session-intensity"
                value={intensity}
                onChange={(event) => setIntensity(event.target.value as WorkoutIntensity)}
              >
                {WORKOUT_INTENSITY_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
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

          <div className="field-grid three-up">
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
              <label htmlFor="session-calorie-override">Calories burned override</label>
              <input
                id="session-calorie-override"
                type="number"
                min="0"
                step="1"
                placeholder={`Auto estimate: ${estimatedCaloriesBurned}`}
                value={calorieOverride}
                onChange={(event) => setCalorieOverride(event.target.value)}
              />
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

          <div className="summary-list compact-summary-list">
            <div className="summary-row">
              <span>Reference weight</span>
              <strong>{formatWeight(referenceWeightKg, settings.profile.unit)}</strong>
            </div>
            <div className="summary-row">
              <span>Estimated calories burned</span>
              <strong>{estimatedCaloriesBurned} kcal</strong>
            </div>
            <div className="summary-row">
              <span>Saved value</span>
              <strong>{displayedCaloriesBurned} kcal</strong>
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
            description="Great for repeatable programs, named phases, and day-specific sessions."
          >
            {templates.length > 0 ? (
              <div className="template-list">
                {templates.map((template) => (
                  <article key={template.id} className="template-card">
                    <div className="template-card-top">
                      <div>
                        <h3>{template.name}</h3>
                        <p>
                          {formatProgramSummary([
                            template.programName,
                            template.phaseName,
                            template.dayLabel,
                          ]) || template.focus}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => loadTemplate(template)}
                      >
                        Load
                      </button>
                    </div>

                    <div className="stats-line">
                      <span className="macro-pill">{getSessionTypeLabel(template.sessionType)}</span>
                      <span className="macro-pill">{getIntensityLabel(template.intensity)}</span>
                      <span className="macro-pill">{template.exercises.length} exercises</span>
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
            description="Your workout history now keeps program labels and calorie burn with the workout details."
          >
            {sessions.length > 0 ? (
              <div className="history-list">
                {sessions.map((session) => (
                  <article key={session.id} className="history-card">
                    <div className="history-card-top">
                      <div>
                        <h3>{session.name}</h3>
                        <p>
                          {formatProgramSummary([
                            session.programName,
                            session.phaseName,
                            session.dayLabel,
                          ]) || session.focus}
                        </p>
                        <p>{formatDateTime(session.occurredAt)}</p>
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
                      <span className="macro-pill">
                        <Flame size={14} /> {session.caloriesBurned ?? 0} kcal
                      </span>
                      <span className="macro-pill">{getSessionTypeLabel(session.sessionType)}</span>
                      <span className="macro-pill">{getIntensityLabel(session.intensity)}</span>
                      <span className="macro-pill">Energy {session.energyLevel}/5</span>
                      <span className="macro-pill">Volume {roundValue(calculateWorkoutVolume(session.exercises), 0)} kg</span>
                      <span className="macro-pill">
                        <Trophy size={14} /> {session.totalVolumeKg} kg
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
              <div className="empty-state">
                No workout sessions yet — save one from the composer to begin your history.
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}