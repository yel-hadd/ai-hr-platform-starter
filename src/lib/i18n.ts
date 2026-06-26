export type Lang = "fr" | "en";

export const T = {
  fr: {
    // login
    login_title: "Connexion",
    login_subtitle: "Choisissez un role de demonstration — chacun a des permissions differentes.",
    login_enter: "Entrer",
    login_or_manual: "ou se connecter manuellement",
    login_demo_password: "Tous les comptes de demonstration utilisent le mot de passe",
    login_password_placeholder: "Mot de passe",
    login_signing_in: "Connexion en cours...",
    login_sign_in: "Se connecter",
    login_pitch: "Une plateforme RH propulsee par l'IA.",
    login_pitch_desc:
      "Une implementation de reference avec outils IA a acces controle (RBAC), RAG sur votre manuel, raisonnement en streaming et interface de chat generative — sur Next.js, Postgres + pgvector et le Vercel AI SDK.",
    login_demo_note:
      "Version demo · choisissez un role pour explorer comment les permissions faconnent l'experience.",
    // nav
    nav_dashboard: "Tableau de bord",
    nav_assistant: "Assistant IA",
    nav_directory: "Annuaire",
    nav_time_off: "Conges",
    nav_settings: "Parametres",
    nav_sign_out: "Deconnexion",
    // dashboard
    dash_welcome: "Bon retour",
    dash_signed_as: "Vous etes connecte en tant que",
    dash_permissions: "Ce que vous voyez ci-dessous est defini par vos permissions.",
    dash_people_company: "Personnes dans l'entreprise",
    dash_people_see: "Personnes que vous pouvez voir",
    dash_vacation_left: "Jours de conge restants",
    dash_pending_approvals: "Approbations en attente",
    dash_ask_ai: "Interroger l'Assistant IA",
    dash_rbac_badge: "Controle d'acces",
    dash_ai_desc:
      "L'assistant repond aux questions sur le manuel avec des citations (RAG), execute des actions RH via des outils a acces controle, diffuse son raisonnement et affiche des resultats enrichis en ligne. Essayez l'un de ceux-ci :",
    dash_q1: "Quelle est notre politique de conge parental ?",
    dash_q2: "Montre-moi l'annuaire de l'equipe.",
    dash_q3: "Combien de jours de conge me reste-t-il, et demande-en 2 pour lundi prochain.",
    dash_open_ai: "Ouvrir l'Assistant IA",
    // directory
    dir_title: "Annuaire",
    dir_scope_all: "Tous les membres de l'entreprise.",
    dir_scope_team: "Vous et vos collaborateurs directs.",
    dir_scope_self: "Uniquement votre propre profil — les managers et les RH voient davantage.",
    dir_name: "Nom",
    dir_title_col: "Poste",
    dir_dept: "Departement",
    dir_location: "Lieu",
    dir_manager: "Manager",
    dir_salary: "Salaire",
    dir_me: "Moi",
    dir_no_people: "Aucune personne correspondante.",
    // time off
    timeoff_title: "Conges",
    timeoff_tip: "Astuce : demandez des conges ou approuvez des demandes en interrogeant l'Assistant IA.",
    timeoff_my_requests: "Mes demandes",
    timeoff_pending: "Approbations en attente",
    timeoff_nothing: "Rien ici pour l'instant.",
    timeoff_employee: "Employe",
    timeoff_type: "Type",
    timeoff_dates: "Dates",
    timeoff_days_col: "Jours",
    timeoff_reason: "Motif",
    timeoff_status: "Statut",
    timeoff_days_unit: "jours",
    // leave types
    leave_vacation: "Conges payes",
    leave_sick: "Maladie",
    leave_personal: "Personnel",
    // statuses
    status_approved: "Approuve",
    status_pending: "En attente",
    status_rejected: "Refuse",
    // settings
    settings_title: "Parametres",
    settings_desc: "La matrice RBAC unique qui controle l'interface, les actions serveur et les outils IA.",
    settings_perm_matrix: "Matrice des permissions",
    settings_perm_col: "Permission",
    settings_model_registry: "Registre des modeles IA",
    settings_model_desc:
      "Le chat utilise par defaut les modeles gratuits d'OpenRouter ; la passerelle Vercel AI est selectionnable par requete. Configurez les cles via les variables d'environnement.",
    settings_reasoning: "raisonnement",
    settings_default: "defaut",
    // chat
    chat_title: "Assistant IA",
    chat_greeting: "Comment puis-je vous aider",
    chat_subtitle: "Posez des questions sur les politiques, vos conges, l'annuaire ou les fiches de paie.",
    chat_placeholder: "Posez n'importe quelle question... (Maj+Entree pour nouvelle ligne)",
    chat_error:
      "Une erreur s'est produite. Verifiez que la cle API du fournisseur est definie dans votre environnement.",
    chat_s1: "Quelle est notre politique de conge parental ?",
    chat_s2: "Combien de jours de conge me reste-t-il ?",
    chat_s3: "Montre-moi l'annuaire de l'equipe",
    chat_s4: "Montre-moi ma derniere fiche de paie",
    // tools
    tool_search_handbook: "Recherche dans le manuel",
    tool_directory: "Consultation de l'annuaire",
    tool_leave_balance: "Verification du solde de conges",
    tool_request_time_off: "Soumission de la demande de conge",
    tool_pending_approvals: "Recuperation des approbations en attente",
    tool_approve: "Traitement de l'approbation",
    tool_payslip: "Recuperation de la fiche de paie",
    tool_error: "Erreur d'outil",
    // reasoning
    reasoning_thinking: "Reflexion en cours...",
    reasoning_done: "Processus de reflexion",
    // denied
    denied: "Permission refusee",
    // citations
    citations_results: "Resultats du manuel pour",
    citations_none: "Aucune section correspondante.",
    citations_match: "de correspondance",
    // leave generative
    leave_no_pending: "Aucune demande en attente d'approbation.",
    leave_day: "jour",
    leave_days: "jours",
    leave_approval_result: "a ete",
    // payslip
    payslip_gross: "Brut",
    payslip_tax: "Impot (22%)",
    payslip_net: "Net",
    // roles
    role_employee: "Employe",
    role_manager: "Manager",
    role_hr_admin: "Admin RH",
    role_super_admin: "Super Admin",
    // permissions
    perm_dir_self: "Voir son propre profil",
    perm_dir_team: "Voir les collaborateurs directs",
    perm_dir_all: "Voir l'annuaire complet",
    perm_salary: "Voir la remuneration de tous",
    perm_leave_request: "Demander des conges",
    perm_leave_self: "Voir ses propres conges",
    perm_leave_team: "Voir les conges de l'equipe",
    perm_leave_approve: "Approuver / refuser les conges",
    perm_payslip_self: "Voir ses propres fiches de paie",
    perm_payslip_any: "Voir les fiches de paie de tous",
    perm_handbook: "Interroger le manuel (RAG)",
    perm_employee_manage: "Gerer les dossiers des employes",
    perm_admin_settings: "Gerer les parametres de la plateforme",
    // demo blurbs
    blurb_employee: "Voit uniquement ses propres donnees. Les outils qui touchent d'autres personnes sont refuses.",
    blurb_manager: "Acces aux collaborateurs directs et peut approuver leurs conges.",
    blurb_hr: "Annuaire complet, acces aux remunerations et aux fiches de paie.",
    blurb_admin: "Tout ce que les RH peuvent faire, plus les parametres de la plateforme.",
  },
  en: {
    // login
    login_title: "Sign in",
    login_subtitle: "Choose a demo role — each has different permissions.",
    login_enter: "Enter",
    login_or_manual: "or sign in manually",
    login_demo_password: "All demo accounts use the password",
    login_password_placeholder: "Password",
    login_signing_in: "Signing in...",
    login_sign_in: "Sign in",
    login_pitch: "An AI-powered HR platform starter.",
    login_pitch_desc:
      "A reference implementation showing RBAC-gated AI tools, RAG over your handbook, streaming reasoning, and generative chat UI — on Next.js, Postgres + pgvector, and the Vercel AI SDK.",
    login_demo_note: "Demo build · pick any role to explore how permissions shape the experience.",
    // nav
    nav_dashboard: "Dashboard",
    nav_assistant: "AI Assistant",
    nav_directory: "Directory",
    nav_time_off: "Time Off",
    nav_settings: "Settings",
    nav_sign_out: "Sign out",
    // dashboard
    dash_welcome: "Welcome back",
    dash_signed_as: "You're signed in as",
    dash_permissions: "What you see below is shaped by your permissions.",
    dash_people_company: "People in company",
    dash_people_see: "People you can see",
    dash_vacation_left: "Vacation days left",
    dash_pending_approvals: "Pending approvals",
    dash_ask_ai: "Ask the AI Assistant",
    dash_rbac_badge: "RBAC-aware",
    dash_ai_desc:
      "The assistant answers handbook questions with citations (RAG), runs HR actions through permission-checked tools, streams its reasoning, and renders rich results inline. Try one of these:",
    dash_q1: "What's our parental leave policy?",
    dash_q2: "Show me the team directory.",
    dash_q3: "How many vacation days do I have left, and request 2 of them next Monday.",
    dash_open_ai: "Open AI Assistant",
    // directory
    dir_title: "Directory",
    dir_scope_all: "Everyone in the company.",
    dir_scope_team: "You and your direct reports.",
    dir_scope_self: "Just your own profile — managers and HR see more.",
    dir_name: "Name",
    dir_title_col: "Title",
    dir_dept: "Department",
    dir_location: "Location",
    dir_manager: "Manager",
    dir_salary: "Salary",
    dir_me: "You",
    dir_no_people: "No matching people.",
    // time off
    timeoff_title: "Time Off",
    timeoff_tip: "Tip: request time off or approve requests by asking the AI Assistant.",
    timeoff_my_requests: "My requests",
    timeoff_pending: "Pending approvals",
    timeoff_nothing: "Nothing here yet.",
    timeoff_employee: "Employee",
    timeoff_type: "Type",
    timeoff_dates: "Dates",
    timeoff_days_col: "Days",
    timeoff_reason: "Reason",
    timeoff_status: "Status",
    timeoff_days_unit: "days",
    // leave types
    leave_vacation: "Vacation",
    leave_sick: "Sick",
    leave_personal: "Personal",
    // statuses
    status_approved: "Approved",
    status_pending: "Pending",
    status_rejected: "Rejected",
    // settings
    settings_title: "Settings",
    settings_desc: "The single RBAC matrix that gates the UI, server actions, and AI tools.",
    settings_perm_matrix: "Permission matrix",
    settings_perm_col: "Permission",
    settings_model_registry: "AI model registry",
    settings_model_desc:
      "Chat defaults to OpenRouter free models; the Vercel AI Gateway is selectable per request. Configure keys via environment variables.",
    settings_reasoning: "reasoning",
    settings_default: "default",
    // chat
    chat_title: "AI Assistant",
    chat_greeting: "How can I help",
    chat_subtitle: "Ask about policies, your time off, the directory, or payslips.",
    chat_placeholder: "Ask anything... (Shift+Enter for newline)",
    chat_error: "Something went wrong. Check that the provider API key is set in your environment.",
    chat_s1: "What is our parental leave policy?",
    chat_s2: "How many vacation days do I have left?",
    chat_s3: "Show me the team directory",
    chat_s4: "Show me my latest payslip",
    // tools
    tool_search_handbook: "Searching the handbook",
    tool_directory: "Looking up the directory",
    tool_leave_balance: "Checking leave balance",
    tool_request_time_off: "Submitting time-off request",
    tool_pending_approvals: "Fetching pending approvals",
    tool_approve: "Processing approval",
    tool_payslip: "Retrieving payslip",
    tool_error: "Tool error",
    // reasoning
    reasoning_thinking: "Thinking...",
    reasoning_done: "Thought process",
    // denied
    denied: "Permission denied",
    // citations
    citations_results: "Handbook results for",
    citations_none: "No matching sections.",
    citations_match: "match",
    // leave generative
    leave_no_pending: "No requests awaiting approval.",
    leave_day: "day",
    leave_days: "days",
    leave_approval_result: "was",
    // payslip
    payslip_gross: "Gross",
    payslip_tax: "Tax (22%)",
    payslip_net: "Net",
    // roles
    role_employee: "Employee",
    role_manager: "Manager",
    role_hr_admin: "HR Admin",
    role_super_admin: "Super Admin",
    // permissions
    perm_dir_self: "View own profile",
    perm_dir_team: "View direct reports",
    perm_dir_all: "View entire company directory",
    perm_salary: "View anyone's compensation",
    perm_leave_request: "Request time off",
    perm_leave_self: "View own leave",
    perm_leave_team: "View team leave",
    perm_leave_approve: "Approve / reject leave",
    perm_payslip_self: "View own payslips",
    perm_payslip_any: "View anyone's payslips",
    perm_handbook: "Ask the handbook (RAG)",
    perm_employee_manage: "Manage employee records",
    perm_admin_settings: "Manage platform settings",
    // demo blurbs
    blurb_employee: "Sees only their own data. Tools that touch other people get denied.",
    blurb_manager: "Adds visibility into direct reports and can approve their leave.",
    blurb_hr: "Company-wide directory, compensation, and payslip access.",
    blurb_admin: "Everything HR can do, plus platform settings.",
  },
} as const;

export type Translations = { [K in keyof typeof T.fr]: string };

// Lookup maps for DB-stored values (job titles, departments, locations)
const TITLE_MAP: Record<string, Partial<Record<Lang, string>>> = {
  "Software Engineer":      { fr: "Ingenieure Logiciel",      en: "Software Engineer" },
  "Engineering Manager":    { fr: "Responsable Ingenierie",   en: "Engineering Manager" },
  "Frontend Engineer":      { fr: "Ingenieure Frontend",      en: "Frontend Engineer" },
  "Backend Engineer":       { fr: "Ingenieur Backend",        en: "Backend Engineer" },
  "HR Business Partner":    { fr: "Partenaire RH",            en: "HR Business Partner" },
  "Platform Administrator": { fr: "Administrateur Plateforme",en: "Platform Administrator" },
};

const DEPT_MAP: Record<string, Partial<Record<Lang, string>>> = {
  Engineering: { fr: "Ingenierie",          en: "Engineering" },
  People:      { fr: "Ressources Humaines", en: "People" },
  IT:          { fr: "Informatique",        en: "IT" },
};

const LOCATION_MAP: Record<string, Partial<Record<Lang, string>>> = {
  Remote: { fr: "Teletravail", en: "Remote" },
};

export function translateField(
  value: string,
  lang: Lang,
  map: Record<string, Partial<Record<Lang, string>>>,
): string {
  return map[value]?.[lang] ?? value;
}

export { TITLE_MAP, DEPT_MAP, LOCATION_MAP };
