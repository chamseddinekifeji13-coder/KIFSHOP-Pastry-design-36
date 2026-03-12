"use client"

export class SoundManager {
  private static instance: SoundManager
  private audioContext: AudioContext | null = null

  private constructor() {
    if (typeof window !== "undefined" && window.AudioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager()
    }
    return SoundManager.instance
  }

  // Beep sound for payment confirmation
  playBeep(frequency: number = 800, duration: number = 100) {
    if (!this.audioContext) return

    const oscillator = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()

    oscillator.connect(gain)
    gain.connect(this.audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = "sine"

    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000)

    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + duration / 1000)
  }

  // Success sound (two beeps)
  playSuccess() {
    this.playBeep(800, 100)
    setTimeout(() => this.playBeep(1000, 100), 150)
  }

  // Error sound (low beep)
  playError() {
    this.playBeep(400, 200)
  }

  // Drawer opening sound
  playDrawerOpen() {
    this.playBeep(600, 50)
    setTimeout(() => this.playBeep(700, 50), 75)
    setTimeout(() => this.playBeep(800, 50), 150)
  }

  // Add to cart sound
  playAddToCart() {
    this.playBeep(900, 80)
  }
}

export function useSoundManager() {
  return SoundManager.getInstance()
}
