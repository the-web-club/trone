/**
 * Eén centrale registry voor het audit- en eventlog.
 *
 * De databasekolommen zijn strings en geen enums, zodat een nieuw event geen
 * migratie kost. Deze registry is de tegenhanger daarvan: hier staan de
 * toegestane standaardwaarden, de Nederlandse labels voor de UI en de
 * normalisatie die zowel de server helpers als de client-endpoint gebruiken.
 *
 * Geen `import "server-only"`: de client tracker en de filter-UI lezen hier ook.
 */

// ---------------------------------------------------------------------
// Categorie
// ---------------------------------------------------------------------

export const AUDIT_CATEGORIES = [
  "AUTH",
  "NAVIGATION",
  "UI",
  "DATA",
  "LEADS",
  "CONTACTS",
  "COMPANIES",
  "USERS",
  "SETTINGS",
  "COMMUNICATION",
  "IMPORT_EXPORT",
  "INTEGRATION",
  "SECURITY",
  "ERROR",
  "SYSTEM",
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  AUTH: "Authenticatie",
  NAVIGATION: "Navigatie",
  UI: "Interface",
  DATA: "Data",
  LEADS: "Leads",
  CONTACTS: "Contacten",
  COMPANIES: "Bedrijven",
  USERS: "Gebruikers",
  SETTINGS: "Instellingen",
  COMMUNICATION: "Communicatie",
  IMPORT_EXPORT: "Import en export",
  INTEGRATION: "Integraties",
  SECURITY: "Beveiliging",
  ERROR: "Fouten",
  SYSTEM: "Systeem",
};

// ---------------------------------------------------------------------
// Event type
// ---------------------------------------------------------------------

export const AUDIT_EVENT_TYPES = [
  // Navigatie en interface
  "PAGE_VIEW",
  "UI_CLICK",
  "MODAL_OPENED",
  "MODAL_CLOSED",
  "DRAWER_OPENED",
  "DRAWER_CLOSED",
  "TAB_CHANGED",
  "FILTER_APPLIED",
  "FILTER_RESET",
  "SEARCH_SUBMITTED",
  "SORT_CHANGED",
  "PAGINATION_CHANGED",
  "COPY_ACTION",
  // Formulieren
  "FORM_STARTED",
  "FORM_SUBMITTED",
  "FORM_VALIDATION_FAILED",
  // Data
  "CREATE",
  "UPDATE",
  "DELETE",
  "STATUS_CHANGED",
  "LINK_CHANGED",
  "BULK_ACTION",
  // Authenticatie
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGOUT",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  // Communicatie
  "EMAIL_SENT",
  "EMAIL_FAILED",
  // Import en export
  "IMPORT_STARTED",
  "IMPORT_COMPLETED",
  "IMPORT_FAILED",
  "EXPORT_STARTED",
  "EXPORT_COMPLETED",
  // Integraties en systeem
  "WEBHOOK_RECEIVED",
  "INTEGRATION_CALL",
  "INTEGRATION_ERROR",
  "API_ERROR",
  "PERMISSION_DENIED",
  "SERVER_ERROR",
  "CLIENT_ERROR",
] as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export const AUDIT_EVENT_TYPE_LABELS: Record<AuditEventType, string> = {
  PAGE_VIEW: "Pagina bekeken",
  UI_CLICK: "Klik",
  MODAL_OPENED: "Dialoog geopend",
  MODAL_CLOSED: "Dialoog gesloten",
  DRAWER_OPENED: "Paneel geopend",
  DRAWER_CLOSED: "Paneel gesloten",
  TAB_CHANGED: "Tab gewijzigd",
  FILTER_APPLIED: "Filter toegepast",
  FILTER_RESET: "Filters gewist",
  SEARCH_SUBMITTED: "Zoekopdracht",
  SORT_CHANGED: "Sortering gewijzigd",
  PAGINATION_CHANGED: "Pagina gewijzigd",
  COPY_ACTION: "Gekopieerd",
  FORM_STARTED: "Formulier gestart",
  FORM_SUBMITTED: "Formulier verzonden",
  FORM_VALIDATION_FAILED: "Validatiefout",
  CREATE: "Aangemaakt",
  UPDATE: "Gewijzigd",
  DELETE: "Verwijderd",
  STATUS_CHANGED: "Status gewijzigd",
  LINK_CHANGED: "Koppeling gewijzigd",
  BULK_ACTION: "Bulkactie",
  LOGIN_SUCCESS: "Inloggen gelukt",
  LOGIN_FAILED: "Inloggen mislukt",
  LOGOUT: "Uitgelogd",
  PASSWORD_RESET_REQUESTED: "Wachtwoordreset aangevraagd",
  PASSWORD_RESET_COMPLETED: "Wachtwoord ingesteld",
  EMAIL_SENT: "E-mail verzonden",
  EMAIL_FAILED: "E-mail mislukt",
  IMPORT_STARTED: "Import gestart",
  IMPORT_COMPLETED: "Import afgerond",
  IMPORT_FAILED: "Import mislukt",
  EXPORT_STARTED: "Export gestart",
  EXPORT_COMPLETED: "Export afgerond",
  WEBHOOK_RECEIVED: "Webhook ontvangen",
  INTEGRATION_CALL: "Integratie aangeroepen",
  INTEGRATION_ERROR: "Integratiefout",
  API_ERROR: "API-fout",
  PERMISSION_DENIED: "Geen rechten",
  SERVER_ERROR: "Serverfout",
  CLIENT_ERROR: "Clientfout",
};

/**
 * Event types die de browser mag insturen via POST /api/audit-events.
 *
 * Alles wat bewijswaarde heeft over een mutatie (CREATE, DELETE, LOGIN_SUCCESS,
 * ...) staat hier bewust NIET in: anders kan een gebruiker met een devtools-
 * console een verzonnen "lead verwijderd" in het log zetten. Die events komen
 * uitsluitend uit server-side code.
 */
export const AUDIT_CLIENT_EVENT_TYPES = [
  "PAGE_VIEW",
  "UI_CLICK",
  "MODAL_OPENED",
  "MODAL_CLOSED",
  "DRAWER_OPENED",
  "DRAWER_CLOSED",
  "TAB_CHANGED",
  "FILTER_APPLIED",
  "FILTER_RESET",
  "SEARCH_SUBMITTED",
  "SORT_CHANGED",
  "PAGINATION_CHANGED",
  "COPY_ACTION",
  "FORM_STARTED",
  "FORM_SUBMITTED",
  "FORM_VALIDATION_FAILED",
  "CLIENT_ERROR",
] as const satisfies readonly AuditEventType[];

export type AuditClientEventType = (typeof AUDIT_CLIENT_EVENT_TYPES)[number];

/**
 * Categorieën die de browser mag insturen.
 *
 * AUTH, SECURITY en SYSTEM staan er bewust niet in: een claim over inloggen,
 * rechten of systeemgedrag moet uit server-side code komen. De rest mag wel,
 * zodat een klik op de leadslijst ook echt onder LEADS terechtkomt en het
 * categoriefilter bruikbaar blijft voor clientevents.
 */
export const AUDIT_CLIENT_CATEGORIES = [
  "NAVIGATION",
  "UI",
  "DATA",
  "LEADS",
  "CONTACTS",
  "COMPANIES",
  "USERS",
  "SETTINGS",
  "COMMUNICATION",
  "IMPORT_EXPORT",
  "INTEGRATION",
  "ERROR",
] as const satisfies readonly AuditCategory[];

// ---------------------------------------------------------------------
// Bron, severity, resultaat
// ---------------------------------------------------------------------

export const AUDIT_SOURCES = [
  "CLIENT",
  "SERVER_ACTION",
  "API",
  "WEBHOOK",
  "SYSTEM",
  "CRON",
] as const;

export type AuditSource = (typeof AUDIT_SOURCES)[number];

export const AUDIT_SOURCE_LABELS: Record<AuditSource, string> = {
  CLIENT: "Browser",
  SERVER_ACTION: "Server action",
  API: "API",
  WEBHOOK: "Webhook",
  SYSTEM: "Systeem",
  CRON: "Achtergrondtaak",
};

export const AUDIT_SEVERITIES = [
  "INFO",
  "NOTICE",
  "WARNING",
  "ERROR",
  "CRITICAL",
] as const;

export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export const AUDIT_SEVERITY_LABELS: Record<AuditSeverity, string> = {
  INFO: "Info",
  NOTICE: "Melding",
  WARNING: "Waarschuwing",
  ERROR: "Fout",
  CRITICAL: "Kritiek",
};

export const AUDIT_RESULTS = [
  "SUCCESS",
  "FAILURE",
  "DENIED",
  "PARTIAL",
] as const;

export type AuditResult = (typeof AUDIT_RESULTS)[number];

export const AUDIT_RESULT_LABELS: Record<AuditResult, string> = {
  SUCCESS: "Gelukt",
  FAILURE: "Mislukt",
  DENIED: "Geweigerd",
  PARTIAL: "Gedeeltelijk",
};

// ---------------------------------------------------------------------
// Entiteiten
// ---------------------------------------------------------------------

export const AUDIT_ENTITY_TYPES = [
  "deal",
  "contact",
  "company",
  "quote",
  "order",
  "invoice",
  "task",
  "timelineEvent",
  "user",
  "product",
  "optionValue",
  "productImage",
  "appSetting",
  "featureRequest",
  "auditEvent",
  "page",
  "session",
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export const AUDIT_ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  deal: "Lead",
  contact: "Contact",
  company: "Bedrijf",
  quote: "Offerte",
  order: "Order",
  invoice: "Factuur",
  task: "Taak",
  timelineEvent: "Tijdlijnitem",
  user: "Gebruiker",
  product: "Product",
  optionValue: "Optiewaarde",
  productImage: "Productbeeld",
  appSetting: "Instelling",
  featureRequest: "Feedback",
  auditEvent: "Logregel",
  page: "Pagina",
  session: "Sessie",
};

// ---------------------------------------------------------------------
// Acties
// ---------------------------------------------------------------------

/**
 * Puntnotatie `domein.actie`. Deze lijst is de standaardset; `action` blijft in
 * de database een vrije string zodat een nieuwe actie geen migratie kost.
 */
export const AUDIT_ACTIONS = {
  // Auth
  loginSuccess: "auth.login_success",
  loginFailed: "auth.login_failed",
  logout: "auth.logout",
  passwordResetRequest: "auth.password_reset_request",
  passwordResetComplete: "auth.password_reset_complete",
  permissionDenied: "auth.permission_denied",

  // Leads
  leadCreate: "lead.create",
  leadUpdate: "lead.update",
  leadDelete: "lead.delete",
  leadStatusChange: "lead.status_change",
  leadOwnerChange: "lead.owner_change",
  leadQualification: "lead.qualification_update",
  leadHotToggle: "lead.hot_toggle",
  leadActivityCreate: "lead.activity_create",
  leadExport: "lead.export",

  // Contacten
  contactCreate: "contact.create",
  contactUpdate: "contact.update",
  contactDelete: "contact.delete",
  contactOwnerChange: "contact.owner_change",
  contactCompanyLink: "contact.company_link",

  // Bedrijven
  companyCreate: "company.create",
  companyUpdate: "company.update",
  companyDelete: "company.delete",
  companyOwnerChange: "company.owner_change",
  companyVatValidate: "company.vat_validate",

  // Offertes en orders
  quoteCreate: "quote.create",
  quoteUpdate: "quote.update",
  quoteSend: "quote.send",
  quoteRevision: "quote.revision",
  quoteStatusChange: "quote.status_change",
  quoteExportPdf: "quote.export_pdf",
  orderCreate: "order.create",
  orderStatusChange: "order.status_change",
  invoiceCreate: "invoice.create",

  // Taken en tijdlijn
  taskCreate: "task.create",
  taskUpdate: "task.update",
  taskDelete: "task.delete",
  taskStatusChange: "task.status_change",
  timelineCreate: "timeline.create",
  timelineUpdate: "timeline.update",
  timelineDelete: "timeline.delete",

  // Gebruikers
  userInvite: "user.invite",
  userInviteResend: "user.invite_resend",
  userRoleChange: "user.role_change",
  userActivate: "user.activate",
  userDeactivate: "user.deactivate",
  userAvatarUpdate: "user.avatar_update",

  // Instellingen en catalogus
  settingsUpdate: "settings.update",
  settingsThresholds: "settings.thresholds_update",
  settingsLetterhead: "settings.letterhead_update",
  settingsTheme: "settings.theme_update",
  catalogPriceUpdate: "catalog.price_update",
  catalogSwatchUpdate: "catalog.swatch_update",
  catalogImageAdd: "catalog.image_add",
  catalogImageDelete: "catalog.image_delete",
  catalogImageDefault: "catalog.image_default",

  // Feedback
  feedbackCreate: "feedback.create",
  feedbackUpdate: "feedback.update",
  feedbackStatusChange: "feedback.status_change",
  feedbackVote: "feedback.vote",
  feedbackComment: "feedback.comment",
  feedbackMerge: "feedback.merge",

  // Communicatie
  emailSend: "email.send",

  // Import en export
  importLeads: "import.leads",
  exportLeads: "export.leads",

  // Integraties
  integrationVies: "integration.vies_check",
  integrationBlob: "integration.blob_upload",
  webhookReceived: "webhook.received",

  // Client
  pageView: "navigation.page_view",
  uiClick: "ui.click",
  uiFilter: "ui.filter",
  uiSearch: "ui.search",
} as const;

export type AuditActionKey = keyof typeof AUDIT_ACTIONS;
export type AuditKnownAction = (typeof AUDIT_ACTIONS)[AuditActionKey];

export const AUDIT_KNOWN_ACTIONS: readonly string[] = Object.values(
  AUDIT_ACTIONS,
);

// ---------------------------------------------------------------------
// Route naar categorie
// ---------------------------------------------------------------------

/**
 * Categorie van een route, zodat een klik op de leadslijst onder LEADS valt en
 * niet onder een generieke UI-bak. Langste prefix wint.
 */
const ROUTE_CATEGORIES: Array<[string, AuditCategory]> = [
  ["/instellingen/logs", "SECURITY"],
  ["/instellingen/medewerkers", "USERS"],
  ["/instellingen", "SETTINGS"],
  ["/leads", "LEADS"],
  ["/contacten", "CONTACTS"],
  ["/bedrijven", "COMPANIES"],
  ["/offertes", "DATA"],
  ["/orders", "DATA"],
  ["/taken", "DATA"],
  ["/kansen", "LEADS"],
  ["/producten", "SETTINGS"],
  ["/overzicht", "NAVIGATION"],
];

export function auditCategoryForRoute(
  route: string | null | undefined,
  fallback: AuditCategory = "UI",
): AuditCategory {
  if (!route) return fallback;
  const match = ROUTE_CATEGORIES.filter(
    ([prefix]) => route === prefix || route.startsWith(`${prefix}/`),
  ).sort((a, b) => b[0].length - a[0].length)[0];
  if (!match) return fallback;
  // De logpagina zelf valt onder SECURITY, maar dat mag de client niet claimen.
  return isAuditClientCategory(match[1]) ? match[1] : fallback;
}

/**
 * Queryparameters die als filterwaarde in metadata mogen. Alles wat hier niet
 * in staat wordt niet opgeslagen; `zoeken` wordt geredigeerd naar een lengte.
 */
export const AUDIT_FILTER_PARAM_ALLOWLIST = [
  "zoeken",
  "fase",
  "bron",
  "eigenaar",
  "status",
  "sortering",
  "leadscore",
  "branche",
  "sector",
  "toepassing",
  "plaats",
  "land",
  "leads",
  "bedrijf",
  "contact",
  "kind",
  "prioriteit",
  "toegewezen",
  "datumveld",
  "waarde-min",
  "waarde-max",
  "van",
  "tot",
  "view",
  "weergave",
  "pagina",
  "type",
  "categorie",
  "gebruiker",
  "actie",
  "resultaat",
  "ernst",
  "entiteit",
] as const;

// ---------------------------------------------------------------------
// Normalisatie en validatie
// ---------------------------------------------------------------------

export const AUDIT_LIMITS = {
  eventType: 64,
  category: 32,
  action: 96,
  source: 24,
  severity: 16,
  result: 16,
  entityType: 48,
  entityId: 191,
  label: 191,
  route: 255,
  httpMethod: 8,
  targetKey: 191,
  sessionId: 191,
  requestId: 64,
  clientEventId: 64,
} as const;

export function isAuditCategory(value: unknown): value is AuditCategory {
  return (
    typeof value === "string" &&
    (AUDIT_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isAuditEventType(value: unknown): value is AuditEventType {
  return (
    typeof value === "string" &&
    (AUDIT_EVENT_TYPES as readonly string[]).includes(value)
  );
}

export function isAuditSource(value: unknown): value is AuditSource {
  return (
    typeof value === "string" &&
    (AUDIT_SOURCES as readonly string[]).includes(value)
  );
}

export function isAuditSeverity(value: unknown): value is AuditSeverity {
  return (
    typeof value === "string" &&
    (AUDIT_SEVERITIES as readonly string[]).includes(value)
  );
}

export function isAuditResult(value: unknown): value is AuditResult {
  return (
    typeof value === "string" &&
    (AUDIT_RESULTS as readonly string[]).includes(value)
  );
}

export function isAuditClientEventType(
  value: unknown,
): value is AuditClientEventType {
  return (
    typeof value === "string" &&
    (AUDIT_CLIENT_EVENT_TYPES as readonly string[]).includes(value)
  );
}

export function isAuditClientCategory(value: unknown): value is AuditCategory {
  return (
    typeof value === "string" &&
    (AUDIT_CLIENT_CATEGORIES as readonly string[]).includes(value)
  );
}

/** SCREAMING_SNAKE, alleen letters, cijfers en underscores. */
export function normalizeAuditEventType(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .slice(0, AUDIT_LIMITS.eventType);
}

/** Puntnotatie: lowercase, alleen letters, cijfers, punt en underscore. */
export function normalizeAuditAction(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^[._]+|[._]+$/g, "")
    .slice(0, AUDIT_LIMITS.action);
}

// ---------------------------------------------------------------------
// Labels voor de UI
// ---------------------------------------------------------------------

export function auditCategoryLabel(value: string): string {
  return isAuditCategory(value) ? AUDIT_CATEGORY_LABELS[value] : value;
}

export function auditEventTypeLabel(value: string): string {
  return isAuditEventType(value) ? AUDIT_EVENT_TYPE_LABELS[value] : value;
}

export function auditSourceLabel(value: string): string {
  return isAuditSource(value) ? AUDIT_SOURCE_LABELS[value] : value;
}

export function auditSeverityLabel(value: string): string {
  return isAuditSeverity(value) ? AUDIT_SEVERITY_LABELS[value] : value;
}

export function auditResultLabel(value: string): string {
  return isAuditResult(value) ? AUDIT_RESULT_LABELS[value] : value;
}

export function auditEntityTypeLabel(value: string): string {
  return (AUDIT_ENTITY_TYPES as readonly string[]).includes(value)
    ? AUDIT_ENTITY_TYPE_LABELS[value as AuditEntityType]
    : value;
}

/** Tone voor de Badge-component, afgeleid van resultaat en severity. */
export function auditResultTone(
  result: string,
  severity: string,
): "default" | "info" | "success" | "warning" | "danger" {
  if (result === "DENIED") return "warning";
  if (result === "FAILURE") return "danger";
  if (result === "PARTIAL") return "warning";
  if (severity === "CRITICAL" || severity === "ERROR") return "danger";
  if (severity === "WARNING") return "warning";
  return "success";
}

export function auditSeverityTone(
  severity: string,
): "default" | "info" | "success" | "warning" | "danger" {
  if (severity === "CRITICAL" || severity === "ERROR") return "danger";
  if (severity === "WARNING") return "warning";
  if (severity === "NOTICE") return "info";
  return "default";
}
