import { z } from "zod/v4"

/**
 * Validation schema for the "Add / Edit Risk Item" form on assessment detail pages.
 * Note: `riskScore` is not included — it is computed server-side as `likelihood × impact`.
 */
export const riskItemSchema = z.object({
	assetName: z.string().min(1, "Asset name is required"),
	assetCategory: z.string().min(1, "Asset category is required"),
	threat: z.string().min(1, "Threat is required"),
	vulnerability: z.string().min(1, "Vulnerability is required"),
	/** Likelihood rating on a 1–5 scale. */
	likelihood: z.coerce.number().int().min(1).max(5),
	/** Impact rating on a 1–5 scale. */
	impact: z.coerce.number().int().min(1).max(5),
	treatment: z.enum(["accept", "mitigate", "transfer", "avoid"]),
	controls: z.string().optional(),
	/** Residual risk score after controls are applied (1–25). */
	residualRisk: z.coerce.number().int().min(1).max(25).optional(),
	/** SOC 2 Trust Service Criteria reference (e.g. `"CC6.1"`). Optional for ISO 27001-only assessments. */
	soc2Criteria: z.string().optional(),
})

/** Inferred TypeScript type for the risk item form payload. */
export type RiskItemInput = z.infer<typeof riskItemSchema>
