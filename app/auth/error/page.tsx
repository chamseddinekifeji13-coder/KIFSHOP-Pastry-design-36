import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Erreur d{"'"}authentification</CardTitle>
          <CardDescription>
            Une erreur est survenue lors de l{"'"}authentification.
            Veuillez reessayer.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild>
            <Link href="/auth/login">Retour a la connexion</Link>
          </Button>
          <Button variant="outline" asChild className="bg-transparent">
            <Link href="/auth/sign-up">Creer un compte</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
