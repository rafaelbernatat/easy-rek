import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSubscriptionAction } from "@/app/actions/subscriptions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, ExternalLink, Check, X } from "lucide-react";
import Link from "next/link";

interface SubscriptionPageProps {
  searchParams: {
    success?: string;
    canceled?: string;
  };
}

export default async function SubscriptionPage({ searchParams }: SubscriptionPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const { success: subSuccess, subscription } = await getSubscriptionAction(userId);

  // Check for checkout success/cancel
  const checkoutSuccess = searchParams.success === "true";
  const checkoutCanceled = searchParams.canceled === "true";

  // Get user's current plan from users table
  // For now, we'll derive it from subscription
  const currentPlan = subscription?.status === "active"
    ? subscription?.stripePriceId?.includes("pro")
      ? "Pro"
      : subscription?.stripePriceId?.includes("enterprise")
      ? "Enterprise"
      : "Free"
    : "Free";

  const renewalDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd || false;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Voltar para Home
            </Link>
            <h1 className="text-xl font-semibold">Assinatura</h1>
            <div className="w-24" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Canceled Messages */}
        {checkoutSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex">
              <Check className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-800">
                Assinatura ativada com sucesso! Bem-vindo ao plano {currentPlan}.
              </p>
            </div>
          </div>
        )}

        {checkoutCanceled && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <X className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-yellow-800">
                O checkout foi cancelado. Sua assinatura não foi alterada.
              </p>
            </div>
          </div>
        )}

        {/* Current Plan Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Plano Atual
              <Badge variant={currentPlan === "Free" ? "secondary" : "default"}>
                {currentPlan}
              </Badge>
            </CardTitle>
            <CardDescription>
              Gerencie sua assinatura e veja seu histórico de faturas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscription?.status === "active" ? (
                <>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Status</span>
                    <Badge variant="default" className="bg-green-600">
                      {cancelAtPeriodEnd ? "Cancelando ao final" : "Ativo"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Próxima renovação</span>
                    <span className="font-medium">{renewalDate || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">ID da assinatura</span>
                    <span className="font-mono text-sm">{subscription?.stripeSubscriptionId}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">
                    Você está no plano Free. Faça upgrade para acessar recursos premium.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan Options */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {/* Free Plan */}
          <Card className={currentPlan === "Free" ? "border-2 border-blue-500" : ""}>
            <CardHeader>
              <CardTitle className="text-lg">Free</CardTitle>
              <CardDescription>
                Para começar a explorar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">R$ 0<span className="text-sm font-normal text-gray-600">/mês</span></div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  5 vídeos/mês
                </li>
                <li className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  10 minutos por vídeo
                </li>
                <li className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Lower Thirds básicos
                </li>
              </ul>
              {currentPlan !== "Free" && (
                <Button variant="outline" className="w-full" disabled>
                  Plano Atual
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className={currentPlan === "Pro" ? "border-2 border-blue-500" : ""}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Pro
                <Badge className="bg-blue-600">Popular</Badge>
              </CardTitle>
              <CardDescription>
                Para criadores sérios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">R$ 29<span className="text-sm font-normal text-gray-600">/mês</span></div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Vídeos ilimitados
                </li>
                <li className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  60 minutos por vídeo
                </li>
                <li className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Lower Thirds avançados
                </li>
                <li className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Elementos YouTube
                </li>
              </ul>
              <form action="/api/stripe/create-checkout" method="POST">
                <input
                  type="hidden"
                  name="priceId"
                  value={process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || ""}
                />
                <Button
                  type="submit"
                  className="w-full"
                  variant={currentPlan === "Pro" ? "outline" : "default"}
                  disabled={currentPlan === "Pro"}
                >
                  {currentPlan === "Pro" ? "Plano Atual" : "Fazer Upgrade"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className={currentPlan === "Enterprise" ? "border-2 border-blue-500" : ""}>
            <CardHeader>
              <CardTitle className="text-lg">Enterprise</CardTitle>
              <CardDescription>
                Para equipes e negócios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">R$ 99<span className="text-sm font-normal text-gray-600">/mês</span></div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Tudo do Pro
                </li>
                <li className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Vídeos ilimitados
                </li>
                <li className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Suporte prioritário
                </li>
                <li className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  API Access
                </li>
              </ul>
              <form action="/api/stripe/create-checkout" method="POST">
                <input
                  type="hidden"
                  name="priceId"
                  value={process.env.NEXT_PUBLIC_STRIPE_ENT_MONTHLY_PRICE_ID || ""}
                />
                <Button
                  type="submit"
                  className="w-full"
                  variant={currentPlan === "Enterprise" ? "outline" : "default"}
                  disabled={currentPlan === "Enterprise"}
                >
                  {currentPlan === "Enterprise" ? "Plano Atual" : "Fazer Upgrade"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Cancel Subscription */}
        {subscription?.status === "active" && !cancelAtPeriodEnd && (
          <Card className="mb-6 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Cancelar Assinatura</CardTitle>
              <CardDescription>
                Você continuará tendo acesso até o final do período atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={async () => {
                  "use server";
                  const { cancelSubscriptionAction } = await import("@/app/actions/subscriptions");
                  if (subscription?.stripeSubscriptionId) {
                    await cancelSubscriptionAction(subscription.stripeSubscriptionId);
                  }
                }}
              >
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  Cancelar Assinatura
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Invoices Section */}
        <Card>
          <CardHeader>
            <CardTitle>Faturas</CardTitle>
            <CardDescription>
              Histórico de pagamentos e faturas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscription?.status === "active" ? (
              <div className="text-center py-8 text-gray-500">
                <p>As faturas aparecerão aqui após o primeiro pagamento.</p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhuma fatura disponível.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
