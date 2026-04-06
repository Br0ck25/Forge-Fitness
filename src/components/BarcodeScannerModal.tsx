import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { Camera, Keyboard, LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cleanBarcode } from '../lib/utils'
import { Modal } from './Modal'

interface BarcodeScannerModalProps {
  open: boolean
  onClose: () => void
  onDetected: (barcode: string) => void | Promise<void>
}

export function BarcodeScannerModal({
  open,
  onClose,
  onDetected,
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [manualBarcode, setManualBarcode] = useState('')
  const [cameraState, setCameraState] = useState<'idle' | 'active' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const stopScanner = useCallback((videoElement: HTMLVideoElement | null) => {
    controlsRef.current?.stop()
    controlsRef.current = null

    const stream = videoElement?.srcObject as MediaStream | null
    stream?.getTracks().forEach((track) => track.stop())
  }, [])

  const handleClose = useCallback(() => {
    stopScanner(videoRef.current)
    setManualBarcode('')
    setErrorMessage(null)
    setCameraState('idle')
    onClose()
  }, [onClose, stopScanner])

  useEffect(() => {
    if (!open || !videoRef.current) {
      return undefined
    }

    let cancelled = false
    const reader = new BrowserMultiFormatReader()
    const videoElement = videoRef.current

    const startScanner = async () => {
      try {
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
            },
          },
          videoElement,
          (result) => {
            if (!result || cancelled) {
              return
            }

            const detectedBarcode = cleanBarcode(result.getText())

            if (!detectedBarcode) {
              return
            }

            cancelled = true
            stopScanner(videoElement)
            void Promise.resolve(onDetected(detectedBarcode))
            handleClose()
          },
        )

        if (cancelled) {
          controls.stop()
          return
        }

        controlsRef.current = controls
        setCameraState('active')
      } catch (error) {
        if (cancelled) {
          return
        }

        setCameraState('error')
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'The camera could not be started. You can still type the barcode manually.',
        )
      }
    }

    void startScanner()

    return () => {
      cancelled = true
      stopScanner(videoElement)
    }
  }, [handleClose, onDetected, open, stopScanner])

  const handleManualSubmit = () => {
    const cleaned = cleanBarcode(manualBarcode)

    if (cleaned.length < 8) {
      setErrorMessage('Please enter at least 8 digits for the barcode.')
      return
    }

    void Promise.resolve(onDetected(cleaned))
    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Scan a barcode"
      description="Use the back camera for the best results, or type the barcode manually if the lighting is bad. Fitness is hard enough without arguing with a scanner."
      size="lg"
    >
      <div className="scanner-shell">
        <div className="scanner-frame">
          {cameraState === 'idle' ? (
            <div className="empty-state">
              <LoaderCircle size={18} className="spin" /> Starting camera...
            </div>
          ) : null}
          <video ref={videoRef} className="scanner-video" muted playsInline />
        </div>

        <div className="notice notice-success">
          <Camera size={18} />
          Hold the barcode inside the frame and let the camera settle for a second.
        </div>

        {cameraState === 'active' ? (
          <p className="scanner-help">
            Camera is live. Aim at a UPC or EAN barcode, then Forge Fitness will fetch the
            nutrition profile for you.
          </p>
        ) : null}

        {errorMessage ? <div className="notice notice-error">{errorMessage}</div> : null}

        <div className="field-grid two-up">
          <div className="field">
            <label htmlFor="manual-barcode">Manual barcode entry</label>
            <input
              id="manual-barcode"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 737628064502"
              value={manualBarcode}
              onChange={(event) => setManualBarcode(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="manual-barcode-submit">Quick add</label>
            <button
              id="manual-barcode-submit"
              type="button"
              className="button button-secondary stretch"
              onClick={handleManualSubmit}
            >
              <Keyboard size={18} /> Use barcode
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}