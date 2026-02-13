"use client"

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface OnboardingState {
  isComplete: boolean
  currentStep: number
  totalSteps: number
  setCurrentStep: (step: number) => void
  completeOnboarding: () => void
  resetOnboarding: () => void
  showOnboarding: boolean
  setShowOnboarding: (show: boolean) => void
}

const OnboardingContext = createContext<OnboardingState | undefined>(undefined)

const ONBOARDING_KEY = "kifshop-onboarding-complete"
const TOTAL_STEPS = 5

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isComplete, setIsComplete] = useState(true) // Default to true to avoid flash
  const [currentStep, setCurrentStep] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(ONBOARDING_KEY)
    if (stored === null) {
      setIsComplete(false)
      setShowOnboarding(true)
    } else {
      setIsComplete(stored === "true")
    }
  }, [])

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, "true")
    setIsComplete(true)
    setShowOnboarding(false)
  }

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY)
    setIsComplete(false)
    setCurrentStep(0)
    setShowOnboarding(true)
  }

  return (
    <OnboardingContext.Provider
      value={{
        isComplete,
        currentStep,
        totalSteps: TOTAL_STEPS,
        setCurrentStep,
        completeOnboarding,
        resetOnboarding,
        showOnboarding,
        setShowOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider")
  }
  return context
}
