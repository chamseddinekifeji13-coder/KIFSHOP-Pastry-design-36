import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function AuthErrorPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive text-destructive-foreground font-bold text-lg">
          !
        </div>
        <CardTitle className="text-xl font-bold text-balance">Erreur d{"'"}authentification</CardTitle>
        <CardDescription>
          Une erreur est survenue lors de l{"'"}authentification. Veuillez reessayer.
        </CardDescription>
      </CardHeader>
      <CardContent />
      <CardFooter>
        <Link href="/auth/login" className="w-full">
          <Button className="w-full">Retour a la connexion</Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
