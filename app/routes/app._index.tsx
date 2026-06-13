import { redirect, Link } from "react-router"
import { Tag } from "primereact/tag"
import { Card } from "primereact/card"
import { Skeleton } from "primereact/skeleton"
import type { Route } from "./+types/app._index"

export const meta: Route.MetaFunction = () => [{ title: "Risk Management — Dashboard" }]
import { requireUserLoader } from "../server/auth"
import { Role, hasRole } from "../server/schema"
import { getTeamsForSupervisor, getActiveTeamsForUser } from "../server/queries"

export async function loader(args: Route.LoaderArgs) {
	return requireUserLoader(args, async (user) => {
		if (hasRole(user.role, Role.Admin)) {
			const { getAllTeams } = await import("../server/queries/teams")
			const teams = await getAllTeams()
			return { user, teams, view: "admin" as const }
		}

		if (hasRole(user.role, Role.Supervisor)) {
			const teams = await getTeamsForSupervisor(user.id)
			return { user, teams, view: "supervisor" as const }
		}

		const teams = await getActiveTeamsForUser(user.id)
		if (teams.length === 1) {
			throw redirect(`/teams/${teams[0].id}`)
		}
		return { user, teams, view: "student" as const }
	})
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
	return serverLoader()
}
clientLoader.hydrate = true

export function HydrateFallback() {
	return (
		<div>
			<Skeleton width="16rem" height="2rem" className="mb-6" />
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
				<Card>
					<div className="flex items-center gap-3 mb-2">
						<Skeleton shape="circle" size="1.5rem" />
						<Skeleton width="6rem" height="1rem" />
					</div>
					<Skeleton width="3rem" height="2.5rem" />
				</Card>
			</div>
			<Skeleton width="8rem" height="1.25rem" className="mb-4" />
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{[1, 2, 3].map((i) => (
					<Card key={i}>
						<Skeleton width="10rem" height="1.25rem" className="mb-2" />
						<Skeleton width="6rem" height="1rem" />
					</Card>
				))}
			</div>
		</div>
	)
}

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
	const { user, teams, view } = loaderData

	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">
				Welcome, {user.fullName}
			</h1>

			{view === "admin" && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<StatCard icon="pi pi-users" label="Total Teams" value={teams.length} />
				</div>
			)}

			<div>
				<h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-color-secondary)" }}>
					{view === "admin" ? "All Teams" : view === "supervisor" ? "Your Teams" : "Your Active Teams"}
				</h2>
				{teams.length === 0 ? (
					<p style={{ color: "var(--text-color-secondary)" }}>No teams found.</p>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{teams.map((team) => (
							<Link
								key={team.id}
								to={`/teams/${team.id}`}
								viewTransition
								className="block"
								style={{ "--vt-name": `team-card-${team.id}` } as React.CSSProperties}
							>
								<Card className="team-card cursor-pointer transition-shadow hover:shadow-md h-full">
									<h3 className="font-semibold mb-1">{team.name}</h3>
									{"semester" in team && (
										<div className="flex items-center gap-2 mt-1">
											<span className="text-sm" style={{ color: "var(--text-color-secondary)" }}>
												{(team as { semester: { name: string; isActive: boolean } }).semester.name}
											</span>
											{(team as { semester: { isActive: boolean } }).semester.isActive
												? <Tag value="Active" severity="success" />
												: <Tag value="Inactive" severity="danger" />
											}
										</div>
									)}
								</Card>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	)
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
	return (
		<Card>
			<div className="flex items-center gap-3 mb-2">
				<i className={`${icon} text-xl`} style={{ color: "var(--primary-color)" }} />
				<span className="text-sm" style={{ color: "var(--text-color-secondary)" }}>{label}</span>
			</div>
			<p className="text-3xl font-bold">{value}</p>
		</Card>
	)
}
