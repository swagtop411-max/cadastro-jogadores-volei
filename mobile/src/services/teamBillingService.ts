import { getApp } from "@react-native-firebase/app";
import { getFunctions, httpsCallable } from "@react-native-firebase/functions";

import type { TeamPlan } from "./teamService";

const REGION = "southamerica-east1";

export const TEAM_PLAN_PRODUCTS: Record<Exclude<TeamPlan, "gratuito">, string> = {
  bronze: "team_bronze_monthly",
  prata: "team_prata_monthly",
  ouro: "team_ouro_monthly",
  premium: "team_premium_monthly",
};

export type PaidTeamPlan = keyof typeof TEAM_PLAN_PRODUCTS;

export function isPaidTeamPlan(plan: TeamPlan): plan is PaidTeamPlan {
  return plan !== "gratuito";
}

export function productIdForPlan(plan: PaidTeamPlan) {
  return TEAM_PLAN_PRODUCTS[plan];
}

export async function verifyTeamSubscription(input: {
  teamRequestId: string;
  planId: PaidTeamPlan;
  purchaseToken: string;
}) {
  const token = input.purchaseToken.trim();
  if (!token) throw new Error("A Google Play não retornou o token da compra.");
  const functions = getFunctions(getApp(), REGION);
  const callable = httpsCallable(functions, "verifyTeamSubscription");
  const result = await callable({
    teamRequestId: input.teamRequestId,
    planId: input.planId,
    purchaseToken: token,
  });
  const data = result.data as {
    verified?: boolean;
    active?: boolean;
    expiresAt?: string;
    subscriptionState?: string;
  };
  if (!data.verified || !data.active) throw new Error("A assinatura ainda não foi confirmada pela Google Play.");
  return data;
}
