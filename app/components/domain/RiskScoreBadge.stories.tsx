import type { Meta, StoryObj } from "@storybook/react"
import { RiskScoreBadge } from "./RiskScoreBadge"

const meta: Meta<typeof RiskScoreBadge> = {
	title: "Domain/RiskScoreBadge",
	component: RiskScoreBadge,
}
export default meta

type Story = StoryObj<typeof RiskScoreBadge>

export const Low: Story = { args: { score: 3 } }
export const Medium: Story = { args: { score: 8 } }
export const High: Story = { args: { score: 15 } }
export const Critical: Story = { args: { score: 20 } }
