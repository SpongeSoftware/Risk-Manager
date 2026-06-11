import { relations } from "drizzle-orm"
import { int, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core"

export const Role = {
	Student: 1,
	Supervisor: 2,
	Admin: 4,
} as const

export type RoleFlag = (typeof Role)[keyof typeof Role]

export function hasRole(userRole: number, flag: number): boolean {
	return (userRole & flag) !== 0
}

const auditCols = {
	createdBy: text("created_by").notNull(),
	createdDate: text("created_date")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	modifiedBy: text("modified_by").notNull(),
	modifiedDate: text("modified_date")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	deletedAt: text("deleted_at"),
	deletedBy: text("deleted_by"),
}

export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
	workosId: text("workos_id").unique(),
	fullName: text("full_name").notNull(),
	email: text("email").notNull().unique(),
	studentId: text("student_id"),
	role: integer("role").notNull().default(Role.Student),
	...auditCols,
})

export const semesters = sqliteTable("semesters", {
	id: int("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	year: integer("year").notNull(),
	period: text("period", { enum: ["1", "2", "summer"] }).notNull(),
	startDate: text("start_date").notNull(),
	endDate: text("end_date").notNull(),
	isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
	...auditCols,
})

export const teams = sqliteTable("teams", {
	id: int("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	semesterId: int("semester_id")
		.notNull()
		.references(() => semesters.id, { onDelete: "restrict" }),
	...auditCols,
})

export const teamMembers = sqliteTable(
	"team_members",
	{
		teamId: int("team_id")
			.notNull()
			.references(() => teams.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		memberRole: text("member_role", { enum: ["student", "supervisor"] }).notNull(),
		...auditCols,
	},
	(t) => [unique("team_member_unique").on(t.teamId, t.userId)],
)

export const assessments = sqliteTable("assessments", {
	id: int("id").primaryKey({ autoIncrement: true }),
	teamId: int("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	framework: text("framework", { enum: ["ISO27001", "SOC2", "BOTH"] })
		.notNull()
		.default("ISO27001"),
	status: text("status", { enum: ["draft", "submitted", "reviewed", "approved"] })
		.notNull()
		.default("draft"),
	...auditCols,
})

export const riskItems = sqliteTable("risk_items", {
	id: int("id").primaryKey({ autoIncrement: true }),
	assessmentId: int("assessment_id")
		.notNull()
		.references(() => assessments.id, { onDelete: "cascade" }),
	assetName: text("asset_name").notNull(),
	assetCategory: text("asset_category").notNull(),
	threat: text("threat").notNull(),
	vulnerability: text("vulnerability").notNull(),
	likelihood: integer("likelihood").notNull(),
	impact: integer("impact").notNull(),
	riskScore: integer("risk_score").notNull(),
	treatment: text("treatment", { enum: ["accept", "mitigate", "transfer", "avoid"] }).notNull(),
	controls: text("controls"),
	residualRisk: integer("residual_risk"),
	soc2Criteria: text("soc2_criteria"),
	...auditCols,
})

export const feedback = sqliteTable("feedback", {
	id: int("id").primaryKey({ autoIncrement: true }),
	assessmentId: int("assessment_id")
		.notNull()
		.references(() => assessments.id, { onDelete: "cascade" }),
	supervisorId: text("supervisor_id")
		.notNull()
		.references(() => users.id),
	comment: text("comment").notNull(),
	...auditCols,
})

export const audits = sqliteTable("audits", {
	id: int("id").primaryKey({ autoIncrement: true }),
	entityType: text("entity_type", {
		enum: ["user", "team", "semester", "assessment", "risk_item", "feedback"],
	}).notNull(),
	entityId: text("entity_id").notNull(),
	action: text("action", { enum: ["created", "updated", "deleted"] }).notNull(),
	fieldChanged: text("field_changed"),
	oldValue: text("old_value"),
	newValue: text("new_value"),
	createdBy: text("created_by").notNull(),
	createdDate: text("created_date")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
})

// ─── Relations ────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
	teamMemberships: many(teamMembers),
	feedbackGiven: many(feedback),
}))

export const semestersRelations = relations(semesters, ({ many }) => ({
	teams: many(teams),
}))

export const teamsRelations = relations(teams, ({ one, many }) => ({
	semester: one(semesters, { fields: [teams.semesterId], references: [semesters.id] }),
	members: many(teamMembers),
	assessments: many(assessments),
}))

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
	team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
	user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}))

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
	team: one(teams, { fields: [assessments.teamId], references: [teams.id] }),
	riskItems: many(riskItems),
	feedback: many(feedback),
}))

export const riskItemsRelations = relations(riskItems, ({ one }) => ({
	assessment: one(assessments, { fields: [riskItems.assessmentId], references: [assessments.id] }),
}))

export const feedbackRelations = relations(feedback, ({ one }) => ({
	assessment: one(assessments, { fields: [feedback.assessmentId], references: [assessments.id] }),
	supervisor: one(users, { fields: [feedback.supervisorId], references: [users.id] }),
}))

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Semester = typeof semesters.$inferSelect
export type NewSemester = typeof semesters.$inferInsert
export type Team = typeof teams.$inferSelect
export type NewTeam = typeof teams.$inferInsert
export type TeamMember = typeof teamMembers.$inferSelect
export type Assessment = typeof assessments.$inferSelect
export type NewAssessment = typeof assessments.$inferInsert
export type RiskItem = typeof riskItems.$inferSelect
export type NewRiskItem = typeof riskItems.$inferInsert
export type Feedback = typeof feedback.$inferSelect
export type NewFeedback = typeof feedback.$inferInsert
export type Audit = typeof audits.$inferSelect
