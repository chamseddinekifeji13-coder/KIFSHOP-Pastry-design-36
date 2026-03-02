import { CheckCircle2 } from "lucide-react"

function ProductionWorkflowIllustration() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400/60" />
          <span className="h-2 w-2 rounded-full bg-yellow-400/60" />
          <span className="h-2 w-2 rounded-full bg-green-400/60" />
        </div>
        <span className="text-[10px] text-muted-foreground">Production du jour</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Workflow steps */}
        <div className="flex items-center gap-2">
          {["Recette", "Production", "Controle", "Livraison"].map((step, i) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center justify-center rounded-full h-6 w-6 text-[9px] font-bold text-white ${i <= 1 ? "bg-[#4A7C59]" : "bg-muted-foreground/30"}`}>
                {i < 2 ? (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span className={`text-[9px] font-medium ${i <= 1 ? "text-foreground" : "text-muted-foreground"}`}>{step}</span>
              {i < 3 && <div className={`flex-1 h-px ${i < 1 ? "bg-[#4A7C59]" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Recipe card */}
        <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">Millefeuille classique</span>
            <span className="rounded-full bg-[#4A7C59]/10 px-2 py-0.5 text-[9px] font-medium text-[#4A7C59]">En production</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Quantite", value: "50 pieces" },
              { label: "Cout unitaire", value: "2.40 DT" },
              { label: "Marge", value: "62%" },
            ].map((item) => (
              <div key={item.label} className="rounded-md bg-background p-2">
                <p className="text-[8px] text-muted-foreground">{item.label}</p>
                <p className="text-xs font-bold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ingredients list */}
        <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
          <p className="text-[10px] font-medium text-foreground mb-2">Matieres premieres</p>
          <div className="space-y-1.5">
            {[
              { name: "Farine", qty: "3.2 kg", pct: 85 },
              { name: "Beurre", qty: "1.5 kg", pct: 60 },
              { name: "Sucre glace", qty: "0.8 kg", pct: 92 },
            ].map((ing) => (
              <div key={ing.name} className="flex items-center gap-2">
                <span className="w-16 text-[9px] text-muted-foreground">{ing.name}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#4A7C59] transition-all"
                    style={{ width: `${ing.pct}%` }}
                  />
                </div>
                <span className="text-[9px] font-medium text-foreground w-10 text-right">{ing.qty}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function EBoutiqueIllustration() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400/60" />
          <span className="h-2 w-2 rounded-full bg-yellow-400/60" />
          <span className="h-2 w-2 rounded-full bg-green-400/60" />
        </div>
        <span className="text-[10px] text-muted-foreground">E-Boutique & Commandes</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Product grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: "Gateau chocolat", price: "45 DT", emoji: "cake" },
            { name: "Croissant", price: "1.8 DT", emoji: "croissant" },
            { name: "Baklawa", price: "28 DT", emoji: "sweet" },
          ].map((product) => (
            <div key={product.name} className="rounded-lg border border-border/50 bg-muted/20 p-2 text-center">
              <div className="mx-auto mb-1.5 flex h-10 w-10 items-center justify-center rounded-lg bg-[#4A7C59]/10">
                <svg className="h-5 w-5 text-[#4A7C59]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  {product.emoji === "cake" && <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />}
                  {product.emoji === "croissant" && <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />}
                  {product.emoji === "sweet" && <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />}
                </svg>
              </div>
              <p className="text-[9px] font-medium text-foreground leading-tight">{product.name}</p>
              <p className="text-[10px] font-bold text-[#4A7C59]">{product.price}</p>
            </div>
          ))}
        </div>

        {/* Channel badges */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground">Canaux :</span>
          {[
            { name: "WhatsApp", color: "bg-green-500/10 text-green-600" },
            { name: "Instagram", color: "bg-pink-500/10 text-pink-500" },
            { name: "Telephone", color: "bg-blue-500/10 text-blue-500" },
          ].map((ch) => (
            <span key={ch.name} className={`rounded-full px-2 py-0.5 text-[8px] font-medium ${ch.color}`}>
              {ch.name}
            </span>
          ))}
        </div>

        {/* Recent orders */}
        <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
          <p className="text-[10px] font-medium text-foreground mb-2">Dernieres commandes</p>
          <div className="space-y-1.5">
            {[
              { client: "Fatma B.", product: "Gateau mariage", total: "180 DT", via: "WhatsApp", status: "Confirmee" },
              { client: "Ahmed K.", product: "Assortiment fete", total: "95 DT", via: "Instagram", status: "En attente" },
              { client: "Mounir S.", product: "Croissants x50", total: "90 DT", via: "Telephone", status: "Livree" },
            ].map((order) => (
              <div key={order.client} className="flex items-center justify-between rounded-md bg-background px-2.5 py-1.5">
                <div>
                  <p className="text-[9px] font-medium text-foreground">{order.client} - {order.product}</p>
                  <p className="text-[8px] text-muted-foreground">via {order.via}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-foreground">{order.total}</p>
                  <p className={`text-[8px] ${order.status === "Confirmee" ? "text-[#4A7C59]" : order.status === "Livree" ? "text-[#7dba94]" : "text-amber-500"}`}>
                    {order.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ShowcaseSection() {
  return (
    <section className="bg-muted/30 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        {/* Row 1: Illustration left, text right */}
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <ProductionWorkflowIllustration />
          <div className="flex flex-col gap-5">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#4A7C59]">
              Concu pour les artisans
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
              De la recette a la livraison, tout est suivi
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground text-pretty">
              KIFSHOP Pastry accompagne chaque etape de votre production. Creez vos fiches techniques,
              planifiez vos productions, suivez la consommation des matieres premieres et gerez vos
              commandes clients — le tout depuis une seule interface.
            </p>
            <ul className="mt-2 space-y-3">
              {[
                "Fiches techniques avec calcul automatique des couts",
                "Planification de production par jour ou par semaine",
                "Deduction automatique des matieres premieres",
                "Suivi en temps reel des stocks et alertes seuils bas",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#4A7C59]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Row 2: Text left, illustration right */}
        <div className="mt-20 grid items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-5 lg:order-1">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#4A7C59]">
              Votre vitrine digitale
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
              Presentez vos creations, recevez des commandes
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground text-pretty">
              Avec l{"'"}E-Boutique integree et les canaux de vente (WhatsApp, Instagram, telephone),
              transformez chaque message en commande tracee. Vos clients voient votre catalogue, passent
              commande, et vous gerez tout depuis KIFSHOP.
            </p>
            <ul className="mt-2 space-y-3">
              {[
                "Catalogue produits avec photos et prix",
                "Commandes via WhatsApp, Instagram et Messenger",
                "Suivi des prospects et conversion en commandes",
                "Facturation et suivi de tresorerie integres",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#4A7C59]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:order-2">
            <EBoutiqueIllustration />
          </div>
        </div>
      </div>
    </section>
  )
}
