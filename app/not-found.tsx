import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Page introuvable</h2>
        <p className="text-sm text-muted-foreground">
          La page que vous cherchez n{"'"}existe pas.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Retour a la connexion
        </Link>
      </div>
    </div>
  )
}
