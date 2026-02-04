import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Check } from "lucide-react";

export interface PricingCardProps {
  name: string;
  description: string;
  price: number;
  period: string;
  features: string[];
  popular?: boolean;
  currentPlan?: boolean;
  priceId: string;
  onUpgrade?: (priceId: string) => void;
}

export function PricingCard({
  name,
  description,
  price,
  period,
  features,
  popular = false,
  currentPlan = false,
  priceId,
  onUpgrade,
}: PricingCardProps) {
  return (
    <Card className={currentPlan ? "border-2 border-blue-500" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {name}
          {popular && <Badge className="bg-blue-600">Popular</Badge>}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-4">
          R$ {price}
          <span className="text-sm font-normal text-slate-600">
            /{period}
          </span>
        </div>
        <ul className="space-y-2 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center text-sm">
              <Check className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        {onUpgrade ? (
          <Button
            className="w-full"
            variant={currentPlan ? "outline" : "default"}
            disabled={currentPlan}
            onClick={() => onUpgrade(priceId)}
          >
            {currentPlan ? "Plano Atual" : "Fazer Upgrade"}
          </Button>
        ) : (
          <form action="/api/stripe/create-checkout" method="POST">
            <input type="hidden" name="priceId" value={priceId} />
            <Button
              type="submit"
              className="w-full"
              variant={currentPlan ? "outline" : "default"}
              disabled={currentPlan}
            >
              {currentPlan ? "Plano Atual" : "Fazer Upgrade"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
