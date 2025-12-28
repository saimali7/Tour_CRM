"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { inferRouterOutputs, inferRouterInputs } from "@trpc/server";
import type { AppRouter } from "../server/routers";

export const trpc = createTRPCReact<AppRouter>();

// Type helpers for inferring router outputs and inputs
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
