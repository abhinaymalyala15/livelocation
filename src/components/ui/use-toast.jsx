import { useState, useCallback } from "react"
import { toast as sonnerToast } from "sonner"

// Toast context for managing toasts
const toasts = []

export function useToast() {
  const [toastList, setToastList] = useState([])

  const toast = useCallback((props) => {
    const id = Math.random().toString(36).substr(2, 9)
    const toastObject = { id, ...props }
    
    setToastList((prev) => [...prev, toastObject])
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      setToastList((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
    
    return {
      id,
      dismiss: () => setToastList((prev) => prev.filter((t) => t.id !== id)),
    }
  }, [])

  return {
    toast,
    toasts: toastList,
  }
}

