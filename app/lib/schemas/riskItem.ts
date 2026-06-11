import { z } from "zod/v4"

export const riskItemSchema = z.object({
	assetName: z.string().min(1, "Asset name is required"),
	assetCategory: z.string().min(1, "Asset category is required"),
	threat: z.string().min(1, "Threat is required"),
	vulnerability: z.string().min(1, "Vulnerability is required"),
	likelihood: z.coerce.number().int().min(1).max(5),
	impact: z.coerce.number().int().min(1).max(5),
	treatment: z.enum(["accept", "mitigate", "transfer", "avoid"]),
	controls: z.string().optional(),
	residualRisk: z.coerce.number().int().min(1).max(25).optional(),
	soc2Criteria: z.string().optional(),
})

export type RiskItemInput = z.infer<typeof riskItemSchema>
