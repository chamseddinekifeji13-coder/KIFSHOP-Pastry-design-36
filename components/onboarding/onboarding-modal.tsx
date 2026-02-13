"use client"

import { useState } from "react"
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Wallet, 
  ChefHat,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useOnboarding } from "@/lib/onboarding-context"
import { useTenant } from "@/lib/tenant-context"
import { cn } from "@/lib/utils"

const steps = [
  {
    id: "welcome",
    title: "Bienvenue sur KIFSHOP",
    description: "L'application de gestion complete pour votre patisserie",
    icon: Sparkles,
  },
  {
    id: "dashboard",
    title: "Tableau de bord",
    description: "Suivez vos KPIs en temps reel : tresorerie, CA, stocks critiques et commandes en attente",
    icon: LayoutDashboard,
  },
  {
    id: "stocks",
    title: "Gestion des stocks",
    description: "Gerez vos matieres premieres et produits finis, faites vos inventaires et suivez les mouvements",
    icon: Package,
  },
  {
    id: "production",
    title: "Production & Commandes",
    description: "Planifiez votre production avec les fiches techniques et gerez vos commandes clients",
    icon: ChefHat,
  },
  {
    id: "ready",
    title: "Vous etes pret !",
    description: "Configurez votre boutique pour commencer",
    icon: Check,
  },
]

export function OnboardingModal() {
  const { showOnboarding, setShowOnboarding, currentStep, setCurrentStep, completeOnboarding } = useOnboarding()
  const { currentTenant } = useTenant()
  const [shopName, setShopName] = useState(currentTenant.name)
  const [ownerName, setOwnerName] = useState("")

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding()
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    completeOnboarding()
  }

  return (
    <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden" aria-describedby={undefined}>
        <VisuallyHidden>
          <DialogTitle>{step?.title ?? "Onboarding"}</DialogTitle>
        </VisuallyHidden>
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Step indicator */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentStep 
                    ? "bg-primary w-6" 
                    : index < currentStep 
                      ? "bg-primary" 
                      : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              {step && <step.icon className="w-8 h-8 text-primary" />}
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              {step?.title}
            </h2>
            <p className="text-muted-foreground">
              {step?.description}
            </p>
          </div>

          {/* Step-specific content */}
          {currentStep === 0 && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  {currentTenant.logo}
                </div>
                <div>
                  <p className="font-medium text-foreground">{currentTenant.name}</p>
                  <p className="text-muted-foreground">Votre boutique actuelle</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4 mb-6">
              <div className="grid gap-2">
                <Label htmlFor="shop-name">Nom de la boutique</Label>
                <Input 
                  id="shop-name" 
                  value={shopName} 
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Ma Patisserie"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="owner-name">Votre nom</Label>
                <Input 
                  id="owner-name" 
                  value={ownerName} 
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Ahmed Ben Ali"
                />
              </div>
            </div>
          )}

          {/* Feature preview for middle steps */}
          {currentStep > 0 && currentStep < 4 && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                {currentStep === 1 && (
                  <>
                    <div className="bg-background rounded-md p-3 text-center">
                      <p className="text-2xl font-bold text-primary">4 520</p>
                      <p className="text-xs text-muted-foreground">TND Tresorerie</p>
                    </div>
                    <div className="bg-background rounded-md p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">890</p>
                      <p className="text-xs text-muted-foreground">TND CA du jour</p>
                    </div>
                  </>
                )}
                {currentStep === 2 && (
                  <>
                    <div className="bg-background rounded-md p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">8</p>
                      <p className="text-xs text-muted-foreground">Matieres premieres</p>
                    </div>
                    <div className="bg-background rounded-md p-3 text-center">
                      <p className="text-2xl font-bold text-warning">3</p>
                      <p className="text-xs text-muted-foreground">Stocks critiques</p>
                    </div>
                  </>
                )}
                {currentStep === 3 && (
                  <>
                    <div className="bg-background rounded-md p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">5</p>
                      <p className="text-xs text-muted-foreground">Fiches techniques</p>
                    </div>
                    <div className="bg-background rounded-md p-3 text-center">
                      <p className="text-2xl font-bold text-primary">7</p>
                      <p className="text-xs text-muted-foreground">Commandes en attente</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Passer
            </Button>
            <div className="flex gap-2">
              {!isFirstStep && (
                <Button variant="outline" onClick={handlePrev} className="bg-transparent">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Precedent
                </Button>
              )}
              <Button onClick={handleNext}>
                {isLastStep ? (
                  <>
                    Commencer
                    <Check className="ml-1 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Suivant
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
