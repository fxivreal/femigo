"use client"

import { useEffect } from "react"
import { Serwist } from "@serwist/window"

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const serwist = new Serwist("/sw.js")
      serwist.register()
    }
  }, [])
  return null
}
