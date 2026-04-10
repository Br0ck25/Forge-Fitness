import { useRegisterSW } from 'virtual:pwa-register/react'

export function usePwaUpdates() {
  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    immediate: true,
  })

  return {
    needRefresh: needRefresh[0],
    offlineReady: offlineReady[0],
    dismissRefresh: () => needRefresh[1](false),
    dismissOfflineReady: () => offlineReady[1](false),
    updateServiceWorker,
  }
}
