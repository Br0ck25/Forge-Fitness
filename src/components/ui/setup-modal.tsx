import { useEffect, useState } from 'react'
import type { Profile, UnitSettings } from '../../types/domain'
import { Modal } from './modal'
import { ProfileFields } from './profile-fields'

interface SetupModalProps {
  open: boolean
  initialProfile: Profile
  units: UnitSettings
  onSkip: () => void
  onSave: (profile: Profile) => Promise<void> | void
}

export function SetupModal({ initialProfile, onSave, onSkip, open, units }: SetupModalProps) {
  const [profile, setProfile] = useState<Profile>(initialProfile)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setProfile(initialProfile)
    }
  }, [initialProfile, open])

  async function handleSave() {
    setIsSaving(true)
    try {
      await onSave(profile)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Optional Setup"
      onClose={onSkip}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onSkip} className="button-primary flex-1">
            Skip
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            className="button-secondary flex-1"
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      }
    >
      <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900 ring-1 ring-emerald-100">
        This helps estimate your calorie needs. You can skip and set your own goals.
      </p>
      <ProfileFields profile={profile} units={units} onChange={setProfile} />
    </Modal>
  )
}
