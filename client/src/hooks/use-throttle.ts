/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef } from 'react'

export default function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback)
  const lastCallRef = useRef<number>(0)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now
        callbackRef.current(...args)
      }
    },
    [delay],
  )
}
