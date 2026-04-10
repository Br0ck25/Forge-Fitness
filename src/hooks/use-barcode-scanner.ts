/* eslint-disable react-hooks/set-state-in-effect */

import {
  BrowserCodeReader,
  BrowserMultiFormatReader,
  type IScannerControls,
} from '@zxing/browser'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface UseBarcodeScannerOptions {
  enabled: boolean
  onDetected: (barcode: string) => void
}

export function useBarcodeScanner({ enabled, onDetected }: UseBarcodeScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const reader = useMemo(() => new BrowserMultiFormatReader(), [])
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'error'>('idle')
  const [error, setError] = useState<string>()
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [canToggleTorch, setCanToggleTorch] = useState(false)

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    setTorchEnabled(false)
    setCanToggleTorch(false)
  }, [])

  const startScanner = useCallback(async () => {
    if (!enabled || !videoRef.current) {
      return
    }

    stopScanner()
    setStatus('starting')
    setError(undefined)

    try {
      const devices = await BrowserCodeReader.listVideoInputDevices()
      const preferredDevice = devices.find((device) =>
        /back|rear|environment/i.test(device.label),
      )

      controlsRef.current = await reader.decodeFromVideoDevice(
        preferredDevice?.deviceId,
        videoRef.current,
        (result, scanError) => {
          if (result) {
            navigator.vibrate?.(40)
            stopScanner()
            onDetected(result.getText())
            return
          }

          if (scanError && scanError.name !== 'NotFoundException') {
            setError(scanError.message || 'Scanning failed. Try moving closer to the barcode.')
          }
        },
      )

      setCanToggleTorch(Boolean(controlsRef.current?.switchTorch))
      setStatus('scanning')
    } catch (scanError) {
      const nextError =
        scanError instanceof Error
          ? scanError.message
          : 'Camera access is unavailable on this device.'

      setError(nextError)
      setStatus('error')
      setCanToggleTorch(false)
    }
  }, [enabled, onDetected, reader, stopScanner])

  useEffect(() => {
    if (enabled) {
      void startScanner()
    } else {
      stopScanner()
      setStatus('idle')
    }

    return () => {
      stopScanner()
    }
  }, [enabled, startScanner, stopScanner])

  const toggleTorch = useCallback(async () => {
    if (!controlsRef.current?.switchTorch) {
      setError('Torch is not available for this camera.')
      return
    }

    try {
      const nextValue = !torchEnabled
      await controlsRef.current.switchTorch(nextValue)
      setTorchEnabled(nextValue)
    } catch (torchError) {
      setError(
        torchError instanceof Error
          ? torchError.message
          : 'Torch controls are not supported on this device.',
      )
    }
  }, [torchEnabled])

  return {
    videoRef,
    status,
    error,
    torchEnabled,
    canToggleTorch,
    restart: startScanner,
    stop: stopScanner,
    toggleTorch,
  }
}
