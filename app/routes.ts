import { type RouteConfig, index, layout, route } from "@react-router/dev/routes"

export default [
	route("login", "routes/auth.login.tsx"),
	route("callback", "routes/auth.callback.tsx"),
	route("no-active-team", "routes/no-active-team.tsx"),

	layout("routes/app.tsx", [
		index("routes/app._index.tsx"),

		route("teams", "routes/app.teams._index.tsx"),
		route("teams/:teamId", "routes/app.teams.$teamId._index.tsx"),
		route("teams/:teamId/assessments/new", "routes/app.teams.$teamId.assessments.new.tsx"),
		route(
			"teams/:teamId/assessments/:assessmentId",
			"routes/app.teams.$teamId.assessments.$assessmentId.tsx",
		),
		route("teams/:teamId/members", "routes/app.teams.$teamId.members.tsx"),
		route("teams/:teamId/report", "routes/app.teams.$teamId.report.tsx"),
		route("teams/:teamId/audits", "routes/app.teams.$teamId.audits.tsx"),

		route("admin/users", "routes/app.admin.users.tsx"),
		route("admin/teams", "routes/app.admin.teams._index.tsx"),
		route("admin/teams/new", "routes/app.admin.teams.new.tsx"),
		route("admin/semesters", "routes/app.admin.semesters._index.tsx"),
		route("admin/semesters/new", "routes/app.admin.semesters.new.tsx"),
		route("admin/audits", "routes/app.admin.audits.tsx"),
	]),
] satisfies RouteConfig
