"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import PhotoPicker from "./PhotoPicker";
import ModalFrame from "./ModalFrame";

type Language = "en" | "es";
type Role = "staff" | "maintenance";
type Status = "unaddressed" | "in-progress" | "completed";
type Floor = "first" | "second" | "common";

type Account = {
  name: string;
  phone: string;
  demo?: boolean;
  role: Role;
};

type Issue = {
  id: string;
  location: string;
  locationType: "room" | "common";
  category: string;
  description: string;
  status: Status;
  reporterName: string;
  reporterPhone: string;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  photos: string[];
  updates?: { status: Status; actorName: string; createdAt: string }[];
};

const rooms = {
  first: Array.from({ length: 28 }, (_, index) => String(100 + index)),
  second: Array.from({ length: 34 }, (_, index) => String(200 + index)),
};

const commonAreas = [
  "North Lobby",
  "South Lobby",
  "Pool",
  "Fitness Room",
  "Laundry",
  "Parking Lot",
];

const areaNames: Record<string, string> = {
  "North Lobby": "Vestíbulo norte",
  "South Lobby": "Vestíbulo sur",
  Pool: "Piscina",
  "Fitness Room": "Gimnasio",
  Laundry: "Lavandería",
  "Parking Lot": "Estacionamiento",
};
function locationLabel(location: string, language: Language) {
  return language === "es" ? (areaNames[location] ?? location) : location;
}

const starterIssues: Issue[] = [
  {
    id: "FXQ-1048",
    location: "108",
    locationType: "room",
    category: "Plumbing",
    description: "Bathroom faucet is leaking steadily at the base.",
    status: "unaddressed",
    reporterName: "Maria S.",
    reporterPhone: "4045550146",
    assigneeName: null,
    createdAt: "2026-09-09T12:14:00.000Z",
    updatedAt: "2026-09-09T12:14:00.000Z",
    completedAt: null,
    photos: [],
  },
  {
    id: "FXQ-1047",
    location: "114",
    locationType: "room",
    category: "HVAC",
    description: "Air conditioner turns on but is not cooling the room.",
    status: "in-progress",
    reporterName: "Elena R.",
    reporterPhone: "4045550118",
    assigneeName: "Marcus T.",
    createdAt: "2026-09-09T11:38:00.000Z",
    updatedAt: "2026-09-09T11:51:00.000Z",
    completedAt: null,
    photos: [],
  },
  {
    id: "FXQ-1044",
    location: "123",
    locationType: "room",
    category: "Electrical",
    description: "Bedside lamp outlet is not working.",
    status: "completed",
    reporterName: "James K.",
    reporterPhone: "4045550161",
    assigneeName: "Marcus T.",
    createdAt: "2026-09-08T16:21:00.000Z",
    updatedAt: "2026-09-08T17:04:00.000Z",
    completedAt: "2026-09-08T17:04:00.000Z",
    photos: [],
  },
  {
    id: "FXQ-1046",
    location: "207",
    locationType: "room",
    category: "Furniture",
    description: "Desk chair arm is loose and needs to be tightened.",
    status: "unaddressed",
    reporterName: "Ana P.",
    reporterPhone: "4045550129",
    assigneeName: null,
    createdAt: "2026-09-09T10:55:00.000Z",
    updatedAt: "2026-09-09T10:55:00.000Z",
    completedAt: null,
    photos: [],
  },
  {
    id: "FXQ-1045",
    location: "218",
    locationType: "room",
    category: "Plumbing",
    description: "Shower is draining slowly after use.",
    status: "in-progress",
    reporterName: "Maria S.",
    reporterPhone: "4045550146",
    assigneeName: "David L.",
    createdAt: "2026-09-09T09:42:00.000Z",
    updatedAt: "2026-09-09T10:10:00.000Z",
    completedAt: null,
    photos: [],
  },
  {
    id: "FXQ-1042",
    location: "229",
    locationType: "room",
    category: "Appliance",
    description: "Mini refrigerator was not cooling; thermostat replaced.",
    status: "completed",
    reporterName: "Elena R.",
    reporterPhone: "4045550118",
    assigneeName: "David L.",
    createdAt: "2026-09-08T13:05:00.000Z",
    updatedAt: "2026-09-08T14:34:00.000Z",
    completedAt: "2026-09-08T14:34:00.000Z",
    photos: [],
  },
  {
    id: "FXQ-1043",
    location: "North Lobby",
    locationType: "common",
    category: "Lighting",
    description: "Two ceiling lights near the elevators are flickering.",
    status: "unaddressed",
    reporterName: "James K.",
    reporterPhone: "4045550161",
    assigneeName: null,
    createdAt: "2026-09-09T08:27:00.000Z",
    updatedAt: "2026-09-09T08:27:00.000Z",
    completedAt: null,
    photos: [],
  },
];

const demoAccounts: Account[] = [
  { name: "Maria Santos", phone: "4045550146", demo: true, role: "staff" },
  {
    name: "Marcus Taylor",
    phone: "4045550199",
    demo: true,
    role: "maintenance",
  },
];

const copy = {
  en: {
    welcome: "Welcome to Fyxinn Quick",
    signInHelp: "Sign in to report and track hotel repairs.",
    phone: "Phone number",
    pin: "6-digit password",
    signIn: "Sign in",
    create: "Create account",
    haveAccount: "Already have an account?",
    name: "Full name",
    chooseRole: "Choose your role",
    staff: "Staff member",
    maintenance: "Maintenance tech",
    invalidLogin: "That phone number or password does not match.",
    formError: "Enter a name, 10-digit phone number, and 6-digit password.",
    demo: "Try a demo account",
    demoStaff: "Staff demo",
    demoMaintenance: "Maintenance demo",
    signedInAs: "Signed in as",
    signOut: "Sign out",
    hotel: "Fyxinn Hotel",
    staffDashboard: "Staff dashboard",
    maintenanceDashboard: "Maintenance dashboard",
    goodMorning: "Good morning",
    staffIntro:
      "See every room at a glance and report anything that needs attention.",
    maintenanceIntro:
      "Your repair queue is ready. Start with the unaddressed issues.",
    reportIssue: "Report an issue",
    allRooms: "All rooms",
    firstFloor: "First floor",
    secondFloor: "Second floor",
    commonAreas: "Common areas",
    unaddressed: "Unaddressed",
    inProgress: "In progress",
    completed: "Completed",
    noIssues: "No issues",
    statusKey: "Status key",
    roomOverview: "Room overview",
    workQueue: "Work queue",
    openIssues: "Open issues",
    openRepairs: "Open repairs",
    filter: "Filter",
    all: "All",
    location: "Location",
    category: "Repair type",
    description: "Brief description",
    descriptionHint: "What needs to be repaired?",
    addPhotos: "Add exactly 3 photos",
    photoHelp: "Include one wide photo and two close-ups.",
    photo: "Photo",
    replace: "Replace",
    submitReport: "Send report",
    cancel: "Cancel",
    required: "Please complete every field and add all 3 photos.",
    submitting: "Sending…",
    reportSent: "Report sent to maintenance",
    reportSentHelp: "The room card and maintenance queue were updated.",
    reportedBy: "Reported by",
    assignedTo: "Assigned to",
    reported: "Reported",
    issueLog: "Issue log",
    repairStarted: "Repair started",
    repairCompleted: "Repair completed",
    reportedPhotos: "Reported photos",
    noPhotoPreview: "Photo preview appears after upload",
    startRepair: "Start repair",
    markComplete: "Mark completed",
    reopen: "Reopen issue",
    close: "Close",
    room: "Room",
    latestActivity: "Latest activity",
    viewIssue: "View issue",
    activityEmpty: "Everything looks good here.",
    saved: "Status updated",
    alertMaintenance: "Maintenance alerted",
    searchPlaceholder: "Search room or issue",
    issue: "issue",
    issues: "issues",
    selectLocation: "Select a location",
    selectCategory: "Select a repair type",
    language: "Español",
    accountReady: "Account created. You’re signed in.",
  },
  es: {
    welcome: "Bienvenido a Fyxinn Quick",
    signInHelp: "Inicie sesión para reportar y seguir reparaciones del hotel.",
    phone: "Número de teléfono",
    pin: "Contraseña de 6 dígitos",
    signIn: "Iniciar sesión",
    create: "Crear cuenta",
    haveAccount: "¿Ya tiene una cuenta?",
    name: "Nombre completo",
    chooseRole: "Elija su función",
    staff: "Personal del hotel",
    maintenance: "Técnico de mantenimiento",
    invalidLogin: "El teléfono o la contraseña no coinciden.",
    formError:
      "Ingrese un nombre, teléfono de 10 dígitos y contraseña de 6 dígitos.",
    demo: "Probar una cuenta de demostración",
    demoStaff: "Demo de personal",
    demoMaintenance: "Demo de mantenimiento",
    signedInAs: "Sesión iniciada como",
    signOut: "Cerrar sesión",
    hotel: "Hotel Fyxinn",
    staffDashboard: "Panel del personal",
    maintenanceDashboard: "Panel de mantenimiento",
    goodMorning: "Buenos días",
    staffIntro: "Vea cada habitación y reporte lo que necesite atención.",
    maintenanceIntro:
      "Su lista está lista. Comience con los asuntos sin atender.",
    reportIssue: "Reportar un problema",
    allRooms: "Todas las habitaciones",
    firstFloor: "Primer piso",
    secondFloor: "Segundo piso",
    commonAreas: "Áreas comunes",
    unaddressed: "Sin atender",
    inProgress: "En progreso",
    completed: "Completado",
    noIssues: "Sin problemas",
    statusKey: "Clave de estado",
    roomOverview: "Resumen de habitaciones",
    workQueue: "Lista de trabajo",
    openIssues: "Problemas abiertos",
    openRepairs: "Reparaciones abiertas",
    filter: "Filtrar",
    all: "Todos",
    location: "Ubicación",
    category: "Tipo de reparación",
    description: "Descripción breve",
    descriptionHint: "¿Qué necesita reparación?",
    addPhotos: "Agregue exactamente 3 fotos",
    photoHelp: "Incluya una foto amplia y dos primeros planos.",
    photo: "Foto",
    replace: "Cambiar",
    submitReport: "Enviar reporte",
    cancel: "Cancelar",
    required: "Complete todos los campos y agregue las 3 fotos.",
    submitting: "Enviando…",
    reportSent: "Reporte enviado a mantenimiento",
    reportSentHelp:
      "La habitación y la lista de mantenimiento se actualizaron.",
    reportedBy: "Reportado por",
    assignedTo: "Asignado a",
    reported: "Reportado",
    issueLog: "Registro del problema",
    repairStarted: "Reparación iniciada",
    repairCompleted: "Reparación completada",
    reportedPhotos: "Fotos del reporte",
    noPhotoPreview: "La vista previa aparece después de subirla",
    startRepair: "Iniciar reparación",
    markComplete: "Marcar completado",
    reopen: "Reabrir problema",
    close: "Cerrar",
    room: "Habitación",
    latestActivity: "Actividad reciente",
    viewIssue: "Ver problema",
    activityEmpty: "Todo se ve bien aquí.",
    saved: "Estado actualizado",
    alertMaintenance: "Mantenimiento notificado",
    searchPlaceholder: "Buscar habitación o problema",
    issue: "problema",
    issues: "problemas",
    selectLocation: "Seleccione una ubicación",
    selectCategory: "Seleccione el tipo de reparación",
    language: "English",
    accountReady: "Cuenta creada. Su sesión está iniciada.",
  },
} as const;

const categoryLabels: Record<string, { en: string; es: string }> = {
  Plumbing: { en: "Plumbing", es: "Plomería" },
  HVAC: { en: "Heating & air", es: "Clima y calefacción" },
  Electrical: { en: "Electrical", es: "Electricidad" },
  Furniture: { en: "Furniture", es: "Muebles" },
  Appliance: { en: "Appliance", es: "Electrodoméstico" },
  Lighting: { en: "Lighting", es: "Iluminación" },
  Safety: { en: "Safety", es: "Seguridad" },
  Other: { en: "Other", es: "Otro" },
};

function cleanPhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function displayPhone(value: string) {
  const digits = cleanPhone(value);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function relativeTime(date: string, language: Language) {
  const minutes = Math.max(
    1,
    Math.round((Date.now() - new Date(date).getTime()) / 60000),
  );
  if (minutes < 60)
    return language === "en" ? `${minutes} min ago` : `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24)
    return language === "en" ? `${hours} hr ago` : `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return language === "en"
    ? `${days} day${days === 1 ? "" : "s"} ago`
    : `hace ${days} día${days === 1 ? "" : "s"}`;
}

export default function FyxinnQuick() {
  const [language, setLanguage] = useState<Language>("en");
  const [authBusy, setAuthBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [session, setSession] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [loginError, setLoginError] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [floor, setFloor] = useState<Floor>("first");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Issue | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const t = copy[language];

  useEffect(() => {
    let active = true;
    fetch("/api/auth")
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{ account: Account | null }>)
          : Promise.reject(),
      )
      .then((data) => {
        if (active && data.account) setSession(data.account);
      })
      .catch(() => undefined);
    try {
      const saved = localStorage.getItem("fyxinn-language");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore a device preference after hydration.
      if (saved === "en" || saved === "es") setLanguage(saved);
    } catch {
      /* Storage may be disabled. */
    }
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem("fyxinn-language", language);
    } catch {
      /* Storage may be disabled. */
    }
  }, [language]);
  useEffect(() => {
    if (!session || session.demo) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize request loading state with the external store.
    setLoading(true);
    fetch("/api/issues", { signal: controller.signal, cache: "no-store" })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{ issues: Issue[] }>)
          : Promise.reject(),
      )
      .then((data: { issues: Issue[] }) => {
        setIssues(data.issues);
        setLoadError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [session, refresh]);
  useEffect(() => {
    if (!session || session.demo) return;
    const reload = () => {
      if (document.visibilityState === "visible")
        setRefresh((value) => value + 1);
    };
    const timer = window.setInterval(reload, 30000);
    window.addEventListener("focus", reload);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", reload);
    };
  }, [session]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (authBusy) return;
    setLoginError("");
    const digits = cleanPhone(phone);
    if (
      (creating && name.trim().length < 2) ||
      digits.length !== 10 ||
      !/^\d{6}$/.test(pin)
    ) {
      setLoginError(t.formError);
      return;
    }
    setAuthBusy(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: creating ? "register" : "login",
          name: name.trim(),
          phone: digits,
          pin,
          role,
        }),
      });
      const data = (await response.json()) as {
        account: Account;
        error?: string;
      };
      if (!response.ok) {
        setLoginError(
          data.error === "duplicate"
            ? language === "en"
              ? "This phone number already has an account. Sign in instead."
              : "Este teléfono ya tiene una cuenta. Inicie sesión."
            : data.error === "rate_limit"
              ? language === "en"
                ? "Too many attempts. Try again in 15 minutes."
                : "Demasiados intentos. Inténtelo en 15 minutos."
              : response.status === 401
                ? t.invalidLogin
                : language === "en"
                  ? "Sign-in is unavailable. Please try again."
                  : "No se pudo iniciar sesión. Inténtelo de nuevo.",
        );
        return;
      }
      setIssues([]);
      setSession(data.account);
      setPin("");
      if (creating) setToast(t.accountReady);
    } catch {
      setLoginError(
        language === "en"
          ? "Could not connect. Please try again."
          : "No se pudo conectar. Inténtelo de nuevo.",
      );
    } finally {
      setAuthBusy(false);
    }
  }
  function enterDemo(accountRole: Role) {
    setIssues(starterIssues);
    setSession(demoAccounts.find((item) => item.role === accountRole)!);
    setLoadError(false);
    setPin("");
  }
  async function signOut() {
    try {
      if (!session?.demo) {
        const response = await fetch("/api/auth", { method: "DELETE" });
        if (!response.ok) throw new Error();
      }
      setSession(null);
      setIssues([]);
      setProfileOpen(false);
      setSelected(null);
      setReportOpen(false);
      setPin("");
      setSearch("");
      setStatusFilter("all");
      setShowAll(false);
      setToast("");
    } catch {
      setToast(
        language === "en"
          ? "Could not sign out. Try again."
          : "No se pudo cerrar sesión. Inténtelo de nuevo.",
      );
    }
  }

  if (!session) {
    return (
      <main className="login-shell">
        <button
          className="language-button login-language"
          onClick={() => setLanguage(language === "en" ? "es" : "en")}
        >
          <span aria-hidden="true">◎</span> {t.language}
        </button>
        <section className="login-brand" aria-label="Fyxinn Quick">
          <img
            src="/fyxinn-quick-logo.png"
            alt="Fyxinn Quick"
            className="login-logo"
          />
          <p className="brand-kicker">ROOM CARE · MADE QUICK</p>
          <h1>
            {language === "en"
              ? "Repairs move faster when everyone can see what’s next."
              : "Las reparaciones avanzan más rápido cuando todos saben qué sigue."}
          </h1>
          <div className="brand-steps" aria-hidden="true">
            <span>
              <b>1</b>
              {language === "en" ? "Report" : "Reportar"}
            </span>
            <i />
            <span>
              <b>2</b>
              {language === "en" ? "Repair" : "Reparar"}
            </span>
            <i />
            <span>
              <b>3</b>
              {language === "en" ? "Ready" : "Listo"}
            </span>
          </div>
        </section>
        <section className="login-panel">
          <div className="login-card">
            <img src="/fyxinn-mark.png" alt="" className="login-mark" />
            <p className="eyebrow">{t.hotel}</p>
            <h2>{creating ? t.create : t.welcome}</h2>
            <p className="muted">{t.signInHelp}</p>
            <form onSubmit={handleLogin} className="login-form">
              {creating && (
                <label>
                  <span>{t.name}</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    placeholder={language === "en" ? "Your name" : "Su nombre"}
                  />
                </label>
              )}
              <label>
                <span>{t.phone}</span>
                <input
                  value={displayPhone(phone)}
                  onChange={(event) => setPhone(cleanPhone(event.target.value))}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(404) 555-0000"
                />
              </label>
              <label>
                <span>{t.pin}</span>
                <input
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  type="password"
                  autoComplete={creating ? "new-password" : "current-password"}
                  placeholder="••••••"
                />
              </label>
              {creating && (
                <fieldset className="role-field">
                  <legend>{t.chooseRole}</legend>
                  <div className="role-options">
                    {(["staff", "maintenance"] as const).map((item) => (
                      <button
                        type="button"
                        key={item}
                        className={role === item ? "selected" : ""}
                        onClick={() => setRole(item)}
                      >
                        <span aria-hidden="true">
                          {item === "staff" ? "●" : "◆"}
                        </span>
                        {item === "staff" ? t.staff : t.maintenance}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              {loginError && (
                <p className="form-error" role="alert">
                  {loginError}
                </p>
              )}
              <button
                className="primary-button login-submit"
                type="submit"
                disabled={authBusy}
              >
                {authBusy ? t.submitting : creating ? t.create : t.signIn}{" "}
                <span aria-hidden="true">→</span>
              </button>
            </form>
            <button
              className="text-button create-toggle"
              onClick={() => {
                setCreating(!creating);
                setLoginError("");
              }}
            >
              {creating ? t.haveAccount : t.create}
            </button>
            {!creating && (
              <div className="demo-box">
                <span>{t.demo}</span>
                <div>
                  <button
                    disabled={authBusy}
                    onClick={() => enterDemo("staff")}
                  >
                    {t.demoStaff}
                  </button>
                  <button
                    disabled={authBusy}
                    onClick={() => enterDemo("maintenance")}
                  >
                    {t.demoMaintenance}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    );
  }

  const isMaintenance = session.role === "maintenance";
  const openCount = issues.filter(
    (issue) => issue.status === "unaddressed",
  ).length;
  const progressCount = issues.filter(
    (issue) => issue.status === "in-progress",
  ).length;
  const completeCount = issues.filter(
    (issue) => issue.status === "completed",
  ).length;
  const allLocations = floor === "common" ? commonAreas : rooms[floor];
  const latestByLocation = new Map<string, Issue>();
  const priority = { unaddressed: 0, "in-progress": 1, completed: 2 };
  [...issues]
    .sort(
      (a, b) =>
        priority[a.status] - priority[b.status] ||
        b.updatedAt.localeCompare(a.updatedAt),
    )
    .forEach((issue) => {
      if (!latestByLocation.has(issue.location))
        latestByLocation.set(issue.location, issue);
    });
  const normalizedSearch = search.trim().toLowerCase();
  const visibleLocations = allLocations.filter((location) => {
    const issue =
      issues.find(
        (item) =>
          item.location === location &&
          (statusFilter === "all" || item.status === statusFilter),
      ) ?? latestByLocation.get(location);
    const matchesStatus =
      statusFilter === "all" || issue?.status === statusFilter;
    const matchesSearch =
      !normalizedSearch ||
      locationLabel(location, language)
        .toLowerCase()
        .includes(normalizedSearch) ||
      (
        categoryLabels[issue?.category ?? ""]?.[language] ??
        issue?.category ??
        ""
      )
        .toLowerCase()
        .includes(normalizedSearch) ||
      issue?.description.toLowerCase().includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  });
  const activity = issues
    .filter(
      (issue) =>
        (statusFilter !== "all"
          ? issue.status === statusFilter
          : showAll || issue.status !== "completed") &&
        (!normalizedSearch ||
          `${locationLabel(issue.location, language)} ${categoryLabels[issue.category]?.[language]} ${issue.description}`
            .toLowerCase()
            .includes(normalizedSearch)),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="wordmark-wrap">
          <img
            src="/fyxinn-quick-logo.png"
            alt="Fyxinn Quick"
            className="wordmark"
          />
          <span className="property-name">{t.hotel}</span>
        </div>
        <nav className="desktop-nav" aria-label="Main navigation">
          <button
            className="active"
            onClick={() => {
              setStatusFilter("all");
              setSearch("");
              setShowAll(false);
            }}
          >
            {isMaintenance ? t.workQueue : t.roomOverview}
          </button>
          <button onClick={() => setReportOpen(true)}>{t.reportIssue}</button>
        </nav>
        <div className="top-actions">
          <button
            className="language-button"
            onClick={() => setLanguage(language === "en" ? "es" : "en")}
          >
            <span aria-hidden="true">◎</span> {t.language}
          </button>
          <button
            className="notification-button"
            onClick={() => {
              setStatusFilter("unaddressed");
              setShowAll(true);
            }}
            aria-label={`${openCount} ${t.openIssues}`}
          >
            <span aria-hidden="true">♢</span>
            <b>{openCount}</b>
          </button>
          <div className="profile-wrap">
            <button
              className="profile-button"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-expanded={profileOpen}
            >
              <span className="avatar">{initials(session.name)}</span>
              <span className="profile-copy">
                <b>{session.name}</b>
                <small>{isMaintenance ? t.maintenance : t.staff}</small>
              </span>
              <span aria-hidden="true">⌄</span>
            </button>
            {profileOpen && (
              <div className="profile-menu">
                <small>{t.signedInAs}</small>
                <strong>{displayPhone(session.phone)}</strong>
                <button onClick={() => void signOut()}>{t.signOut}</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="app-content">
        {session.demo && (
          <p className="notice">
            {language === "en"
              ? "Demo mode · Changes are for practice and are not saved."
              : "Modo demo · Los cambios son de práctica y no se guardan."}
          </p>
        )}
        {loadError && (
          <p className="notice" role="alert">
            {language === "en"
              ? "Repairs could not be refreshed. Your connection may be offline."
              : "No se pudieron actualizar las reparaciones. Revise su conexión."}{" "}
            <button
              className="text-button"
              onClick={() => setRefresh((value) => value + 1)}
            >
              {language === "en" ? "Retry" : "Reintentar"}
            </button>
          </p>
        )}
        {loading && (
          <p className="muted" role="status">
            {language === "en"
              ? "Refreshing repairs…"
              : "Actualizando reparaciones…"}
          </p>
        )}
        <section className="hero-row">
          <div>
            <p className="eyebrow">
              {isMaintenance ? t.maintenanceDashboard : t.staffDashboard}
            </p>
            <h1>
              {language === "en" ? "Hello" : "Hola"},{" "}
              {session.name.split(" ")[0]}.
            </h1>
            <p>{isMaintenance ? t.maintenanceIntro : t.staffIntro}</p>
          </div>
          <button
            className="primary-button report-button"
            onClick={() => setReportOpen(true)}
          >
            <span aria-hidden="true">＋</span> {t.reportIssue}
          </button>
        </section>

        <section className="summary-grid" aria-label="Issue summary">
          <button
            className={`summary-card urgent ${statusFilter === "unaddressed" ? "active" : ""}`}
            onClick={() =>
              setStatusFilter(
                statusFilter === "unaddressed" ? "all" : "unaddressed",
              )
            }
          >
            <span className="summary-icon">!</span>
            <span>
              <b>{openCount}</b>
              <small>{t.unaddressed}</small>
            </span>
            <i>→</i>
          </button>
          <button
            className={`summary-card working ${statusFilter === "in-progress" ? "active" : ""}`}
            onClick={() =>
              setStatusFilter(
                statusFilter === "in-progress" ? "all" : "in-progress",
              )
            }
          >
            <span className="summary-icon">↻</span>
            <span>
              <b>{progressCount}</b>
              <small>{t.inProgress}</small>
            </span>
            <i>→</i>
          </button>
          <button
            className={`summary-card done ${statusFilter === "completed" ? "active" : ""}`}
            onClick={() =>
              setStatusFilter(
                statusFilter === "completed" ? "all" : "completed",
              )
            }
          >
            <span className="summary-icon">✓</span>
            <span>
              <b>{completeCount}</b>
              <small>{t.completed}</small>
            </span>
            <i>→</i>
          </button>
        </section>

        <div className="dashboard-grid">
          <section className="room-board">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t.allRooms}</p>
                <h2>{t.roomOverview}</h2>
              </div>
              <label className="search-box">
                <span aria-hidden="true">⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label={t.searchPlaceholder}
                  placeholder={t.searchPlaceholder}
                />
              </label>
            </div>
            <div className="floor-tabs" role="tablist" aria-label="Floors">
              {(["first", "second", "common"] as const).map((item) => (
                <button
                  key={item}
                  role="tab"
                  aria-selected={floor === item}
                  className={floor === item ? "active" : ""}
                  onClick={() => setFloor(item)}
                >
                  {item === "first"
                    ? t.firstFloor
                    : item === "second"
                      ? t.secondFloor
                      : t.commonAreas}
                  {item !== "common" && <small>{rooms[item].length}</small>}
                </button>
              ))}
            </div>
            <div className="room-grid">
              {visibleLocations.map((location) => {
                const issue =
                  (statusFilter !== "all"
                    ? issues.find(
                        (item) =>
                          item.location === location &&
                          item.status === statusFilter,
                      )
                    : undefined) ?? latestByLocation.get(location);
                const status = issue?.status ?? "clear";
                return (
                  <button
                    key={location}
                    className={`room-card ${status}`}
                    onClick={() => {
                      setStatusError("");
                      if (issue) setSelected(issue);
                    }}
                    disabled={!issue}
                    aria-label={`${floor === "common" ? "" : t.room + " "}${locationLabel(location, language)}: ${issue ? t[issue.status === "in-progress" ? "inProgress" : issue.status] : t.noIssues}`}
                  >
                    <span className="room-top">
                      <b>
                        {floor === "common"
                          ? locationLabel(location, language)
                          : `${t.room} ${location}`}
                      </b>
                      <i />
                    </span>
                    <small>
                      {issue
                        ? (categoryLabels[issue.category]?.[language] ??
                          issue.category)
                        : t.noIssues}
                    </small>
                    {issue && (
                      <span className="room-status">
                        {
                          t[
                            issue.status === "in-progress"
                              ? "inProgress"
                              : issue.status
                          ]
                        }{" "}
                        <b>→</b>
                      </span>
                    )}
                  </button>
                );
              })}
              {visibleLocations.length === 0 && (
                <div className="empty-state">{t.activityEmpty}</div>
              )}
            </div>
            <div className="status-legend">
              <strong>{t.statusKey}</strong>
              <span>
                <i className="urgent-dot" />
                {t.unaddressed}
              </span>
              <span>
                <i className="working-dot" />
                {t.inProgress}
              </span>
              <span>
                <i className="done-dot" />
                {t.completed}
              </span>
              <span>
                <i className="clear-dot" />
                {t.noIssues}
              </span>
            </div>
          </section>

          <aside className="activity-panel">
            <div className="activity-head">
              <div>
                <p className="eyebrow">{t.latestActivity}</p>
                <h2>{isMaintenance ? t.workQueue : t.openRepairs}</h2>
              </div>
              <span>{activity.length}</span>
            </div>
            <div className="activity-list">
              {activity.length === 0 && (
                <p className="empty-state">{t.activityEmpty}</p>
              )}
              {activity.map((issue) => (
                <button
                  key={issue.id}
                  className="activity-item"
                  onClick={() => {
                    setStatusError("");
                    setSelected(issue);
                  }}
                >
                  <span className={`activity-status ${issue.status}`} />
                  <span className="activity-copy">
                    <span>
                      <b>
                        {issue.locationType === "room"
                          ? `${t.room} ${issue.location}`
                          : locationLabel(issue.location, language)}
                      </b>
                      <small>{relativeTime(issue.updatedAt, language)}</small>
                    </span>
                    <strong>
                      {categoryLabels[issue.category]?.[language] ??
                        issue.category}
                    </strong>
                    <p>{issue.description}</p>
                    <em className={issue.status}>
                      {
                        t[
                          issue.status === "in-progress"
                            ? "inProgress"
                            : issue.status
                        ]
                      }
                    </em>
                  </span>
                  <span className="item-arrow">›</span>
                </button>
              ))}
            </div>
            <button
              className="view-all"
              onClick={() => {
                setStatusFilter("all");
                setSearch("");
                setShowAll(true);
              }}
            >
              {t.all} {t.issues} <span>→</span>
            </button>
          </aside>
        </div>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button
          className="active"
          onClick={() => {
            setStatusFilter("all");
            setSearch("");
            setShowAll(false);
            window.scrollTo({ top: 0 });
          }}
        >
          <span>▦</span>
          {isMaintenance ? t.workQueue : t.roomOverview}
        </button>
        <button onClick={() => setReportOpen(true)}>
          <span className="mobile-add">＋</span>
          {t.reportIssue}
        </button>
        <button onClick={() => setProfileOpen(!profileOpen)}>
          <span>●</span>
          {session.name.split(" ")[0]}
        </button>
      </nav>

      {reportOpen && (
        <ReportModal
          language={language}
          account={session}
          onClose={() => setReportOpen(false)}
          onCreated={(issue) => {
            setIssues((current) => [issue, ...current]);
            setReportOpen(false);
            setFloor(
              issue.locationType === "common"
                ? "common"
                : Number(issue.location) < 200
                  ? "first"
                  : "second",
            );
            setStatusFilter("all");
            setSearch("");
            setToast(
              session.demo
                ? language === "en"
                  ? "Practice report added"
                  : "Reporte de práctica agregado"
                : t.reportSent,
            );
          }}
        />
      )}
      {selected && (
        <IssueModal
          issue={issues.find((issue) => issue.id === selected.id) ?? selected}
          account={session}
          language={language}
          onClose={() => setSelected(null)}
          busy={statusBusy}
          error={statusError}
          onStatus={async (status) => {
            if (statusBusy) return;
            setStatusBusy(true);
            setStatusError("");
            try {
              let updated: Issue;
              if (session.demo) {
                const current = issues.find(
                  (issue) => issue.id === selected.id,
                )!;
                const now = new Date().toISOString();
                updated = {
                  ...current,
                  status,
                  assigneeName:
                    status === "unaddressed"
                      ? null
                      : status === "in-progress"
                        ? session.name
                        : current.assigneeName,
                  updatedAt: now,
                  completedAt: status === "completed" ? now : null,
                  updates: [
                    ...(current.updates ?? [
                      {
                        status: "unaddressed" as Status,
                        actorName: current.reporterName,
                        createdAt: current.createdAt,
                      },
                    ]),
                    { status, actorName: session.name, createdAt: now },
                  ],
                };
              } else {
                const current = issues.find(
                  (issue) => issue.id === selected.id,
                )!;
                const response = await fetch("/api/issues", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: selected.id,
                    status,
                    expectedStatus: current.status,
                  }),
                });
                if (!response.ok) {
                  if (response.status === 409) setRefresh((value) => value + 1);
                  throw new Error();
                }
                updated = ((await response.json()) as { issue: Issue }).issue;
              }
              setIssues((current) =>
                current.map((issue) =>
                  issue.id === updated.id ? updated : issue,
                ),
              );
              setToast(t.saved);
              if (!session.demo) setRefresh((value) => value + 1);
            } catch {
              setStatusError(
                language === "en"
                  ? "Status was not saved. Refresh and try again."
                  : "El estado no se guardó. Actualice e inténtelo de nuevo.",
              );
            } finally {
              setStatusBusy(false);
            }
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      )}
    </main>
  );
}

function ReportModal({
  language,
  account,
  onClose,
  onCreated,
}: {
  language: Language;
  account: Account;
  onClose: () => void;
  onCreated: (issue: Issue) => void;
}) {
  const t = copy[language];
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<(File | null)[]>([null, null, null]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState([false, false, false]);
  const requestId = useRef(crypto.randomUUID());
  const busy = submitting || processing.some(Boolean);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (
      !location ||
      !category ||
      description.trim().length < 8 ||
      photos.some((photo) => !photo)
    ) {
      setError(t.required);
      return;
    }
    setSubmitting(true);
    try {
      let issue: Issue;
      if (account.demo) {
        const previews = await Promise.all(
          photos.map(
            (photo) =>
              new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = reject;
                reader.readAsDataURL(photo!);
              }),
          ),
        );
        const now = new Date().toISOString();
        issue = {
          id: `FXQ-${requestId.current}`,
          location,
          locationType: /^\d{3}$/.test(location) ? "room" : "common",
          category,
          description: description.trim(),
          status: "unaddressed",
          reporterName: account.name,
          reporterPhone: account.phone,
          assigneeName: null,
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          photos: previews,
        };
      } else {
        const data = new FormData();
        data.set("requestId", requestId.current);
        data.set("location", location);
        data.set("category", category);
        data.set("description", description.trim());
        photos.forEach((photo) => data.append("photos", photo!));
        const response = await fetch("/api/issues", {
          method: "POST",
          body: data,
        });
        if (!response.ok) throw new Error();
        issue = ((await response.json()) as { issue: Issue }).issue;
      }
      onCreated(issue);
    } catch {
      setError(
        language === "en"
          ? "Your report was not sent. Your photos and description are still here. Please try again."
          : "Su reporte no se envió. Sus fotos y descripción siguen aquí. Inténtelo de nuevo.",
      );
      setSubmitting(false);
    }
  }

  return (
    <ModalFrame
      className="report-modal"
      titleId="report-title"
      onClose={onClose}
      busy={busy}
    >
      <header className="modal-header">
        <div>
          <p className="eyebrow">Fyxinn Quick</p>
          <h2 id="report-title">{t.reportIssue}</h2>
        </div>
        <button
          className="close-button"
          disabled={busy}
          onClick={onClose}
          aria-label={t.close}
        >
          ×
        </button>
      </header>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label>
            <span>{t.location} *</span>
            <select
              disabled={busy}
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            >
              <option value="">{t.selectLocation}</option>
              <optgroup label={t.firstFloor}>
                {rooms.first.map((room) => (
                  <option key={room} value={room}>
                    {t.room} {room}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t.secondFloor}>
                {rooms.second.map((room) => (
                  <option key={room} value={room}>
                    {t.room} {room}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t.commonAreas}>
                {commonAreas.map((area) => (
                  <option key={area} value={area}>
                    {locationLabel(area, language)}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label>
            <span>{t.category} *</span>
            <select
              disabled={busy}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">{t.selectCategory}</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label[language]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="description-field">
          <span>{t.description} *</span>
          <textarea
            disabled={busy}
            minLength={8}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t.descriptionHint}
            maxLength={240}
          />
          <small>
            {language === "en"
              ? "At least 8 characters"
              : "Mínimo 8 caracteres"}{" "}
            · {description.length}/240
          </small>
        </label>
        <div className="photos-head">
          <div>
            <strong>{t.addPhotos} *</strong>
            <small>{t.photoHelp}</small>
          </div>
          <span>{photos.filter(Boolean).length}/3</span>
        </div>
        <div className="photo-grid">
          {photos.map((photo, index) => (
            <PhotoPicker
              key={index}
              language={language}
              index={index}
              file={photo}
              disabled={submitting}
              onChange={(file) =>
                setPhotos((current) =>
                  current.map((item, i) => (i === index ? file : item)),
                )
              }
              onBusy={(value) =>
                setProcessing((current) =>
                  current.map((item, i) => (i === index ? value : item)),
                )
              }
            />
          ))}
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <footer className="modal-footer">
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={onClose}
          >
            {t.cancel}
          </button>
          <button type="submit" className="primary-button" disabled={busy}>
            {submitting ? t.submitting : t.submitReport} <span>→</span>
          </button>
        </footer>
      </form>
    </ModalFrame>
  );
}

function IssueModal({
  issue,
  account,
  language,
  onClose,
  onStatus,
  busy,
  error,
}: {
  issue: Issue;
  account: Account;
  language: Language;
  onClose: () => void;
  onStatus: (status: Status) => void;
  busy: boolean;
  error: string;
}) {
  const t = copy[language];
  const statusKey =
    issue.status === "in-progress" ? "inProgress" : issue.status;
  const isMaintenance = account.role === "maintenance";
  return (
    <ModalFrame
      className="issue-modal"
      titleId="issue-title"
      onClose={onClose}
      busy={busy}
    >
      <header className="modal-header issue-modal-head">
        <div>
          <p className="eyebrow" title={issue.id}>
            {issue.id.length > 16
              ? issue.id.slice(0, 12).toUpperCase()
              : issue.id}
          </p>
          <h2 id="issue-title">
            {issue.locationType === "room"
              ? `${t.room} ${issue.location}`
              : locationLabel(issue.location, language)}
          </h2>
        </div>
        <button
          className="close-button"
          disabled={busy}
          onClick={onClose}
          aria-label={t.close}
        >
          ×
        </button>
      </header>
      <div className="issue-hero">
        <span className={`large-status ${issue.status}`}>{t[statusKey]}</span>
        <span className="category-tag">
          {categoryLabels[issue.category]?.[language] ?? issue.category}
        </span>
        <h3>{issue.description}</h3>
        <div className="issue-meta">
          <span>
            <small>{t.reportedBy}</small>
            <b>{issue.reporterName}</b>
          </span>
          <span>
            <small>{t.reported}</small>
            <b>{relativeTime(issue.createdAt, language)}</b>
          </span>
          <span>
            <small>{t.assignedTo}</small>
            <b>{issue.assigneeName ?? "—"}</b>
          </span>
        </div>
      </div>
      <div className="issue-body">
        <section>
          <h4>{t.reportedPhotos}</h4>
          <div className="detail-photos">
            {[0, 1, 2].map((index) =>
              issue.photos[index] ? (
                <img
                  key={index}
                  src={issue.photos[index]}
                  alt={`${t.photo} ${index + 1}`}
                />
              ) : (
                <div key={index}>
                  <span>▧</span>
                  <small>{t.noPhotoPreview}</small>
                </div>
              ),
            )}
          </div>
        </section>
        <section>
          <h4>{t.issueLog}</h4>
          <div className="timeline">
            {(issue.updates?.length
              ? issue.updates
              : [
                  {
                    status: "unaddressed" as Status,
                    actorName: issue.reporterName,
                    createdAt: issue.createdAt,
                  },
                ]
            ).map((update, index) => (
              <div
                className="timeline-item"
                key={`${update.createdAt}-${index}`}
              >
                <i />
                <span>
                  <b>
                    {index === 0 && update.status === "unaddressed"
                      ? t.reported
                      : update.status === "unaddressed"
                        ? t.reopen
                        : update.status === "in-progress"
                          ? t.repairStarted
                          : t.repairCompleted}
                  </b>
                  <small>
                    {update.actorName} ·{" "}
                    {relativeTime(update.createdAt, language)}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
      {error && (
        <p className="form-error issue-error" role="alert">
          {error}
        </p>
      )}
      <footer className="modal-footer">
        <button className="secondary-button" disabled={busy} onClick={onClose}>
          {t.close}
        </button>
        {isMaintenance && issue.status === "unaddressed" && (
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => onStatus("in-progress")}
          >
            {t.startRepair} <span>→</span>
          </button>
        )}
        {isMaintenance && issue.status === "in-progress" && (
          <button
            className="primary-button complete-button"
            disabled={busy}
            onClick={() => onStatus("completed")}
          >
            ✓ {t.markComplete}
          </button>
        )}
        {isMaintenance && issue.status === "completed" && (
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => onStatus("unaddressed")}
          >
            {t.reopen}
          </button>
        )}
      </footer>
    </ModalFrame>
  );
}
