"use client";

import { useTenant } from "@/lib/tenant-context";
import { WorkflowTraceability } from "@/components/workflow/workflow-traceability";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function WorkflowTraceabilityPage() {
  const { currentTenant: tenant } = useTenant();

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Chargement...</CardTitle>
            <CardDescription>Initialisation des informations du tenant</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Traçabilité du workflow</h1>
        <p className="text-gray-600">
          Piste d'audit complète des alertes de stock, des bons d'approvisionnement et des commandes fournisseurs
        </p>
      </div>

      {/* Information cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Étapes du processus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="inline-block w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold text-center leading-5">
                  1
                </span>
                <span>Alerte de stock détectée</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold text-center leading-5">
                  2
                </span>
                <span>Conversion en approvisionnement</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold text-center leading-5">
                  3
                </span>
                <span>Génération des commandes fournisseurs</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Mises à jour en temps réel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Tous les changements sont suivis en temps réel avec des journaux d'audit complets, incluant les actions utilisateurs, les changements de statut et les références liées.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Traçabilité complète
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Le lien entre alertes de stock, bons d'approvisionnement et commandes fournisseurs est maintenu pour une visibilité totale.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Audit log */}
      <WorkflowTraceability tenantId={tenant?.id || null} />
    </div>
  );
}
