import React, { useEffect, useReducer, useState } from "react";
import ReactDOM from "react-dom/client";
import { Download, Mail, Phone } from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
// import { registerSW } from "virtual:pwa-register";
import bodyFatRangeIcon from "../SAMPLES/ICONS/Body_Fat_Range_Icon-removebg-preview.png";
import bodyWaterRangeIcon from "../SAMPLES/ICONS/Body_Water_Range_Icon-removebg-preview.png";
import muscleMassIcon from "../SAMPLES/ICONS/Muscle_Mass_Icon-removebg-preview.png";
import physiqueRatingsIcon from "../SAMPLES/ICONS/BMR_Icon-removebg-preview.png";
import basalMetabolicAgeIcon from "../SAMPLES/ICONS/Basal_Metabolic_Age_Icon-removebg-preview.png";
import boneMassIcon from "../SAMPLES/ICONS/Bone_Mass_Icon-removebg-preview.png";
import visceralFatIcon from "../SAMPLES/ICONS/Visceral_Fat_Icon-removebg-preview.png";
import wellnessLogo from "../SAMPLES/LOGO-removebg-preview.png";

const STORAGE_KEY = "wellness-form-state-v1";
const OFFLINE_QUEUE_KEY = "wellness-offline-queue-v1";
const ADMIN_SESSION_KEY = "wellness-admin-uid";
const COACH_SESSION_KEY = "wellness-coach-id";
const COACH_NAME_KEY = "wellness-coach-name";
const UNDO_DELETE_WINDOW_MS = 5 * 60 * 1000;
const MAX_HISTORY = 100;
const APPOINTMENT_COUNT = 26;
const CURRENT_COACH_ID = "coach-test-1";

const createEmptyAppointments = () =>
  Array.from({ length: APPOINTMENT_COUNT }, () => ({
    age: "",
    height: "",
    weight: "",
    bodyFat: "",
    water: "",
    muscle: "",
    physique: "",
    bmr: "",
    basal: "",
    bone: "",
    visceral: ""
  }));

const defaultEvaluation = {
  bodyFat: "",
  bodyWater: "",
  muscleMass: "",
  visceralFat: "",
  questionnaire: ""
};

const defaultPage2Data = {
  date: "",
  name: "",
  coach: "",
  age: ""
};

const defaultFormState = {
  appointments: createEmptyAppointments(),
  evaluation: defaultEvaluation,
  page2Data: defaultPage2Data,
  clientId: "",
  phone: "",
  email: ""
};

const normalizeAppointments = (appointments) => {
  const base = createEmptyAppointments();
  if (!Array.isArray(appointments)) return base;
  return base.map((row, index) => ({ ...row, ...(appointments[index] || {}) }));
};

const loadStoredState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFormState;
    const parsed = JSON.parse(raw);
    return {
      appointments: normalizeAppointments(parsed.appointments),
      evaluation: { ...defaultEvaluation, ...(parsed.evaluation || {}) },
      page2Data: { ...defaultPage2Data, ...(parsed.page2Data || {}) },
      phone: parsed.phone || "",
      email: parsed.email || "",
      clientId: parsed.clientId || ""
    };
  } catch (error) {
    return defaultFormState;
  }
};

const commitHistory = (state, next) => {
  if (state.present === next) return state;
  const past = [...state.past, state.present];
  if (past.length > MAX_HISTORY) {
    past.shift();
  }
  return {
    past,
    present: next,
    future: []
  };
};

const reducer = (state, action) => {
  switch (action.type) {
    case "UPDATE": {
      const next = action.updater(state.present);
      return commitHistory(state, next);
    }
    case "UNDO": {
      if (!state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future]
      };
    }
    case "REDO": {
      if (!state.future.length) return state;
      const [next, ...rest] = state.future;
      return {
        past: [...state.past, state.present],
        present: next,
        future: rest
      };
    }
    case "CLEAR": {
      const next = {
        ...defaultFormState,
        page2Data: {
          ...defaultFormState.page2Data,
          coach: state.present.page2Data.coach
        }
      };
      return commitHistory(state, next);
    }
    default:
      return state;
  }
};

const WellnessForm = () => {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => ({
      past: [],
      present: loadStoredState(),
      future: []
    })
  );
  const [saveNotice, setSaveNotice] = useState("");
  const [activeTab, setActiveTab] = useState("form");
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [expandedClientId, setExpandedClientId] = useState(null);
  const [clientsSort, setClientsSort] = useState("updatedAtDesc");
  const [clientsSearch, setClientsSearch] = useState("");
  const [lastDeleted, setLastDeleted] = useState(null);
  const [clientsView, setClientsView] = useState("all");
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [clientsByDate, setClientsByDate] = useState("");
  const [session, setSession] = useState({
    role: null,
    coachId: "",
    adminUid: "",
    coachName: "",
    isCoreAdmin: false,
    adminStatus: ""
  });
  const [authView, setAuthView] = useState("initial");
  const [authError, setAuthError] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminRegisterName, setAdminRegisterName] = useState("");
  const [adminRegisterEmail, setAdminRegisterEmail] = useState("");
  const [adminRegisterPassword, setAdminRegisterPassword] = useState("");
  const [showAdminRegisterPassword, setShowAdminRegisterPassword] = useState(false);
  const [coachName, setCoachName] = useState("");
  const [coachPhone, setCoachPhone] = useState("");
  const [coachLoginName, setCoachLoginName] = useState("");
  const [coachLoginPhone, setCoachLoginPhone] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [pendingAdminsLoading, setPendingAdminsLoading] = useState(false);
  const [pendingAdminsError, setPendingAdminsError] = useState("");

  const { appointments, evaluation, page2Data, phone, email } = state.present;
  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;
  const currentRole = session.role || "coach";
  const currentCoachId = session.role === "coach" ? session.coachId : "";

  useEffect(() => {
// registerSW({ immediate: true });
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      const adminUid = localStorage.getItem(ADMIN_SESSION_KEY) || "";
      const coachId = localStorage.getItem(COACH_SESSION_KEY) || "";
      if (adminUid) {
        try {
          const profileSnap = await getDoc(doc(db, "user", adminUid));
          const profile = profileSnap.exists() ? profileSnap.data() : null;
          if (profile && profile.role === "admin") {
            if (profile.status && profile.status !== "approved" && !profile.isCoreAdmin) {
              setAuthError("Awaiting admin approval");
              setAuthView("admin");
              localStorage.removeItem(ADMIN_SESSION_KEY);
            } else {
              setSession({
                role: "admin",
                adminUid,
                coachId: "",
                coachName: "",
                isCoreAdmin: Boolean(profile.isCoreAdmin),
                adminStatus: profile.status || ""
              });
              setAuthLoading(false);
              return;
            }
            setAuthLoading(false);
            return;
          }
        } catch (error) {
          // ignore and fall through
        }
        localStorage.removeItem(ADMIN_SESSION_KEY);
      }
      if (coachId) {
        try {
          const coachSnap = await getDoc(doc(db, "user", coachId));
          const coach = coachSnap.exists() ? coachSnap.data() : null;
          if (coach && coach.role === "coach") {
            setSession({
              role: "coach",
              coachId,
              adminUid: "",
              coachName: coach.name || localStorage.getItem(COACH_NAME_KEY) || "",
              isCoreAdmin: false,
              adminStatus: ""
            });
            setAuthLoading(false);
            return;
          }
        } catch (error) {
          // ignore and fall through
        }
        localStorage.removeItem(COACH_SESSION_KEY);
        localStorage.removeItem(COACH_NAME_KEY);
      }
      setSession({
        role: null,
        coachId: "",
        adminUid: "",
        coachName: "",
        isCoreAdmin: false,
        adminStatus: ""
      });
      setAuthLoading(false);
    };
    loadSession();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setSession({
          role: null,
          coachId: "",
          adminUid: "",
          coachName: "",
          isCoreAdmin: false,
          adminStatus: ""
        });
        localStorage.removeItem(ADMIN_SESSION_KEY);
        localStorage.removeItem(COACH_SESSION_KEY);
        localStorage.removeItem(COACH_NAME_KEY);
        setActiveTab("form");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "user", user.uid));
        if (!snap.exists()) {
          setSession({
            role: null,
            coachId: "",
            adminUid: "",
            coachName: "",
            isCoreAdmin: false,
            adminStatus: ""
          });
          return;
        }

        const profile = snap.data();
        if (profile.role === "admin" && profile.status && profile.status !== "approved" && !profile.isCoreAdmin) {
          setAuthError("Awaiting admin approval");
          setAuthView("admin");
          localStorage.removeItem(ADMIN_SESSION_KEY);
          await signOut(auth);
          return;
        }

        setSession({
          role: profile.role,
          adminUid: profile.role === "admin" ? user.uid : "",
          coachId: profile.role === "coach" ? user.uid : "",
          coachName: profile.name || "",
          isCoreAdmin: Boolean(profile.isCoreAdmin),
          adminStatus: profile.status || ""
        });

        handleTabChange("clients");
      } catch (err) {
        console.error("Session restore failed", err);
        setSession({
          role: null,
          coachId: "",
          adminUid: "",
          coachName: "",
          isCoreAdmin: false,
          adminStatus: ""
        });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const syncOfflineQueue = async () => {
      const rawQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!rawQueue) return;
      let queue = [];
      try {
        queue = JSON.parse(rawQueue) || [];
      } catch (error) {
        return;
      }
      if (!queue.length) return;

      const remaining = [];
      for (const item of queue) {
        try {
          if (item.action === "delete") {
            const docRef = doc(db, "clients", item.clientId);
            await updateDoc(docRef, {
              deletedAt: serverTimestamp(),
              syncStatus: "deleted"
            });
          } else if (item.action === "undelete") {
            const docRef = doc(db, "clients", item.clientId);
            await updateDoc(docRef, {
              deletedAt: deleteField(),
              syncStatus: deleteField()
            });
          } else if (item.clientId) {
            const docRef = doc(db, "clients", item.clientId);
            await updateDoc(docRef, {
              ...item.data,
              updatedAt: serverTimestamp()
            });
          } else {
            await addDoc(collection(db, "clients"), {
              ...item.data,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        } catch (error) {
          remaining.push(item, ...queue.slice(queue.indexOf(item) + 1));
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
          return;
        }
      }

      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    };

    const handleOnline = () => {
      syncOfflineQueue();
    };

    window.addEventListener("online", handleOnline);
    if (typeof navigator !== "undefined" && navigator.onLine) {
      syncOfflineQueue();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.present));
  }, [state.present]);

  useEffect(() => {
    if (activeTab !== "clients") return;
    if (!session.role) return;
    loadClients();
  }, [activeTab, session.role, currentCoachId]);

  const updateAppointment = (index, field, value) => {
    dispatch({
      type: "UPDATE",
      updater: (prev) => {
        const nextAppointments = [...prev.appointments];
        nextAppointments[index] = { ...nextAppointments[index], [field]: value };
        return { ...prev, appointments: nextAppointments };
      }
    });
  };

  const updateEvaluation = (key, value) => {
    dispatch({
      type: "UPDATE",
      updater: (prev) => ({
        ...prev,
        evaluation: { ...prev.evaluation, [key]: value }
      })
    });
  };

  const updatePage2Data = (field, value) => {
    dispatch({
      type: "UPDATE",
      updater: (prev) => ({
        ...prev,
        page2Data: { ...prev.page2Data, [field]: value }
      })
    });
  };

  const updateTopLevel = (field, value) => {
    dispatch({
      type: "UPDATE",
      updater: (prev) => ({
        ...prev,
        [field]: value
      })
    });
  };
  const toTitleCase = (value) =>
    value
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" ");
  const formatEvaluationValue = (value) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed ? toTitleCase(trimmed) : "-";
    }
    return String(value);
  };

  const formatDateForFilename = (value) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";

    const dashMatch = trimmed.match(/^(\d{2})-([A-Za-z]+)-(\d{4})$/);
    if (dashMatch) {
      const [, day, month, year] = dashMatch;
      return `${day}-${toTitleCase(month)} ${year}`;
    }

    const slashMatch = trimmed.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      const monthName = toTitleCase(
        new Date(Number(year), Number(month) - 1, 1).toLocaleString("en-US", { month: "long" })
      );
      return `${day}-${monthName} ${year}`;
    }

    return trimmed.replace(/\s+/g, " ");
  };

  const buildPdfTitle = () => {
    const name = page2Data.name.trim();
    const coachValue = page2Data.coach.trim();
    const coach = coachValue.startsWith("Coach ") ? coachValue : coachValue ? `Coach ${coachValue}` : "";
    const date = formatDateForFilename(page2Data.date);
    const parts = [];
    if (name) parts.push(name);
    if (date) parts.push(date);
    if (coach) parts.push(coach);
    const title = parts.length ? parts.join(" ") : "Personal Wellness Pass";
    return title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
  };

  const exportToPDF = () => {
    const originalTitle = document.title;
    const nextTitle = buildPdfTitle();
    const appliedTitle = nextTitle || originalTitle;
    document.title = appliedTitle;
    const titleEl = document.querySelector("title");
    if (titleEl) titleEl.textContent = appliedTitle;

    const handleAfterPrint = () => {
      document.title = originalTitle;
      if (titleEl) titleEl.textContent = originalTitle;
      window.removeEventListener("afterprint", handleAfterPrint);
    };

    window.addEventListener("afterprint", handleAfterPrint);
    setTimeout(() => {
      window.print();
      // Fallback in case afterprint doesn't fire on some browsers.
      setTimeout(handleAfterPrint, 2000);
    }, 0);
  };

  const buildPdfContainer = () => {
    const sections = document.querySelectorAll(".print-section");
    if (!sections.length) return null;
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-10000px";
    container.style.top = "0";
    container.style.background = "#fff";
    sections.forEach((section) => {
      const clone = section.cloneNode(true);
      container.appendChild(clone);
    });
    document.body.appendChild(container);
    return container;
  };

  const handleSharePdf = async () => {
    const filename = `${buildPdfTitle() || "Personal Wellness Pass"}.pdf`;
    if (!navigator?.share) {
      exportToPDF();
      return;
    }
    const container = buildPdfContainer();
    if (!container) {
      exportToPDF();
      return;
    }
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const worker = html2pdf()
        .set({
          margin: 0.3,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
        })
        .from(container)
        .toPdf();
      const pdf = await worker.get("pdf");
      const blob = pdf.output("blob");
      const file = new File([blob], filename, { type: "application/pdf" });
      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        exportToPDF();
        return;
      }
      await navigator.share({
        title: buildPdfTitle() || "Personal Wellness Pass",
        files: [file]
      });
    } catch (error) {
      exportToPDF();
    } finally {
      container.remove();
    }
  };

  const formatDateToDisplay = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const monthName = toTitleCase(date.toLocaleString("en-US", { month: "long" }));
    const year = date.getFullYear();
    return `${day}-${monthName}-${year}`;
  };

  const formatClientDate = (value) => {
    if (!value) return "";
    const trimmed = String(value).trim();
    if (!trimmed) return "";
    const match = trimmed.match(/^(\d{2})-([A-Za-z]+)-(\d{4})$/);
    if (!match) return trimmed;
    const [, day, month, year] = match;
    return `${day}-${toTitleCase(month)}-${year}`;
  };

  const parseClientDate = (value) => {
    if (!value) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(\d{2})-([A-Za-z]+)-(\d{4})$/);
    if (!match) return null;
    const [, day, monthName, year] = match;
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
    if (Number.isNaN(monthIndex)) return null;
    return new Date(Number(year), monthIndex, Number(day));
  };

  const getWeekRange = (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    const diff = (day + 6) % 7; // Monday as start of week
    start.setDate(start.getDate() - diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const getClientsReportTitle = () => {
    switch (clientsView) {
      case "thisWeek":
        return "Clients This Week";
      case "thisMonth":
        return "Clients This Month";
      case "byCoach":
        return "Clients By Coach";
      case "all":
      default:
        return "All Clients";
    }
  };

  const downloadClientsPdf = () => {
    const title = getClientsReportTitle();
    const generatedAt = new Date().toLocaleString("en-US");
    const columns = ["Name", "Phone", "Email", "Coach", "Date"];
    const makeRow = (client) => [
      client.clientName || "",
      client.phone || "",
      client.email || "",
      client.coach || "",
      formatClientDate(client.date) || ""
    ];

    const renderTable = (rows) => `
      <table>
        <thead>
          <tr>${columns.map((col) => `<th>${escapeHtml(col)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) =>
                `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;

    let bodyHtml = "";
    if (clientsView === "byCoach") {
      const grouped = sortedClients.reduce((acc, client) => {
        const coachName = client.coach || "Unassigned";
        if (!acc[coachName]) acc[coachName] = [];
        acc[coachName].push(client);
        return acc;
      }, {});
      bodyHtml = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([coachName, coachClients]) => {
          const rows = coachClients.map(makeRow);
          return `
            <h2>${escapeHtml(coachName)}</h2>
            ${renderTable(rows)}
          `;
        })
        .join("");
    } else {
      const rows = sortedClients.map(makeRow);
      bodyHtml = renderTable(rows);
    }

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 20px; margin: 0 0 6px; }
            h2 { font-size: 14px; margin: 18px 0 6px; }
            .meta { font-size: 12px; margin-bottom: 16px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { border: 1px solid #222; padding: 6px 8px; font-size: 12px; text-align: left; }
            th { background: #f3f3f3; }
            @media print { @page { margin: 12mm; } }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
          ${bodyHtml || "<div>No clients found.</div>"}
        </body>
      </html>
    `);
    doc.close();

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (win) {
        win.focus();
        win.print();
      }
      setTimeout(() => iframe.remove(), 1000);
    };
  };

  const downloadClientFullPdf = (client) => {
    const generatedAt = new Date().toLocaleString("en-US");
    const toTitleCase = (value) =>
      String(value)
        .toLowerCase()
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(" ");
    const formatValue = (value) => {
      if (value === null || value === undefined) return "";
      const text = String(value);
      if (text.includes("@")) return text;
      if (/^\s*[\d+\-() ]+\s*$/.test(text)) return text.trim();
      return toTitleCase(text);
    };
    const headerItems = [
      ["Name", formatValue(client.clientName || "")],
      ["Phone", client.phone || ""],
      ["Email", client.email || ""],
      ["Coach", formatValue(client.coach || "")],
      ["Date", formatClientDate(client.date) || ""]
    ];
    const page2Entries = Object.entries(client.page2Data || {});
    const appointments = Array.isArray(client.appointments) ? client.appointments : [];
    const evaluation = client.evaluation || {};

    const escapeHtml = (value) =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const renderTable = (headers, rows) => `
      <table>
        <thead>
          <tr>${headers.map((col) => `<th>${escapeHtml(col)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) =>
                `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;

    const appointmentHeaders = [
      "Age",
      "Height",
      "Weight",
      "Body Fat",
      "Water",
      "Muscle",
      "Physique",
      "BMR",
      "Basal",
      "Bone",
      "Visceral"
    ];
    const appointmentRows = appointments.map((apt) => [
      apt.age || "",
      apt.height || "",
      apt.weight || "",
      apt.bodyFat || "",
      apt.water || "",
      apt.muscle || "",
      apt.physique || "",
      apt.bmr || "",
      apt.basal || "",
      apt.bone || "",
      apt.visceral || ""
    ]);

    const evaluationRows = Object.entries(evaluation).map(([key, value]) => [
      toTitleCase(key),
      formatValue(value ?? "")
    ]);

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>${escapeHtml(client.clientName || "Client Report")}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 20px; margin: 0 0 6px; }
            h2 { font-size: 14px; margin: 18px 0 6px; }
            .meta { font-size: 12px; margin-bottom: 16px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { border: 1px solid #222; padding: 6px 8px; font-size: 12px; text-align: left; }
            th { background: #f3f3f3; }
            .kv { display: grid; grid-template-columns: 140px 1fr; gap: 6px 12px; font-size: 12px; }
            .kv div { padding: 2px 0; }
            @media print { @page { margin: 12mm; } }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(client.clientName || "Client Report")}</h1>
          <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
          <div class="kv">
            ${headerItems
              .map(([label, value]) => `<div><strong>${escapeHtml(label)}:</strong></div><div>${escapeHtml(value)}</div>`)
              .join("")}
          </div>
          <h2>Page 2 Data</h2>
          <div class="kv">
            ${page2Entries
              .map(([label, value]) => `<div><strong>${escapeHtml(toTitleCase(label))}:</strong></div><div>${escapeHtml(formatValue(value ?? ""))}</div>`)
              .join("")}
          </div>
          <h2>Appointments</h2>
          ${renderTable(appointmentHeaders, appointmentRows)}
          <h2>Evaluation</h2>
          ${evaluationRows.length ? renderTable(["Field", "Value"], evaluationRows) : "<div>No evaluation data.</div>"}
        </body>
      </html>
    `);
    doc.close();

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (win) {
        win.focus();
        win.print();
      }
      setTimeout(() => iframe.remove(), 1000);
    };
  };

  const getOfflineDeletedIds = () => {
    try {
      const rawQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!rawQueue) return new Set();
      const queue = JSON.parse(rawQueue) || [];
      const lastAction = new Map();
      for (const item of queue) {
        if (!item.clientId) continue;
        if (item.action === "delete" || item.action === "undelete") {
          lastAction.set(item.clientId, item.action);
        }
      }
      return new Set(
        Array.from(lastAction.entries())
          .filter(([, action]) => action === "delete")
          .map(([clientId]) => clientId)
      );
    } catch (error) {
      return new Set();
    }
  };

  const getDeletedClients = () => {
    const isAdmin = currentRole === "admin";
    const offlineDeletedIds = getOfflineDeletedIds();
    return clients.filter((client) => {
      if (!isAdmin && client.assignedCoachId !== currentCoachId) return false;
      const isDeleted =
        client.deletedAt ||
        client.syncStatus === "deleted" ||
        offlineDeletedIds.has(client.id);
      return isDeleted;
    });
  };

  const getVisibleClientsForReports = () => {
    const isAdmin = currentRole === "admin";
    const offlineDeletedIds = getOfflineDeletedIds();
    return clients.filter((client) => {
      if (!isAdmin && client.assignedCoachId !== currentCoachId) return false;
      const isDeleted =
        client.deletedAt ||
        client.syncStatus === "deleted" ||
        offlineDeletedIds.has(client.id);
      return !isDeleted;
    });
  };

  const restoreClient = async (client) => {
    if (currentRole !== "admin" && client.assignedCoachId !== currentCoachId) {
      showSaveNotice("Action not allowed.");
      return;
    }
    const updateLocal = () => {
      setClients((prev) =>
        prev.map((item) =>
          item.id === client.id
            ? { ...item, deletedAt: undefined, syncStatus: undefined }
            : item
        )
      );
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const queueItem = {
        clientId: client.id,
        action: "undelete",
        timestamp: Date.now(),
        syncStatus: "pending"
      };
      try {
        const rawQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue = rawQueue ? JSON.parse(rawQueue) : [];
        queue.push(queueItem);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      } catch (error) {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([queueItem]));
      }
      updateLocal();
      if (lastDeleted?.clientId === client.id) {
        setLastDeleted(null);
      }
      showSaveNotice("Client restored (offline).");
      return;
    }

    const docRef = doc(db, "clients", client.id);
    await updateDoc(docRef, {
      deletedAt: deleteField(),
      syncStatus: deleteField()
    });
    updateLocal();
    if (lastDeleted?.clientId === client.id) {
      setLastDeleted(null);
    }
    showSaveNotice("Client restored.");
  };

  const restoreAllDeletedClients = async () => {
    const deletedClients = getDeletedClients();
    if (!deletedClients.length) return;

    const updateLocal = () => {
      setClients((prev) =>
        prev.map((item) =>
          deletedClients.some((client) => client.id === item.id)
            ? { ...item, deletedAt: undefined, syncStatus: undefined }
            : item
        )
      );
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      try {
        const rawQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue = rawQueue ? JSON.parse(rawQueue) : [];
        deletedClients.forEach((client) => {
          queue.push({
            clientId: client.id,
            action: "undelete",
            timestamp: Date.now(),
            syncStatus: "pending"
          });
        });
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      } catch (error) {
        const queue = deletedClients.map((client) => ({
          clientId: client.id,
          action: "undelete",
          timestamp: Date.now(),
          syncStatus: "pending"
        }));
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      }
      updateLocal();
      setLastDeleted(null);
      showSaveNotice("All clients restored (offline).");
      return;
    }

    await Promise.all(
      deletedClients.map((client) =>
        updateDoc(doc(db, "clients", client.id), {
          deletedAt: deleteField(),
          syncStatus: deleteField()
        })
      )
    );
    updateLocal();
    setLastDeleted(null);
    showSaveNotice("All clients restored.");
  };

  const emptyRecycleBin = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const deletedClients = getDeletedClients();
    if (!deletedClients.length) return;
    await Promise.all(
      deletedClients.map((client) => deleteDoc(doc(db, "clients", client.id)))
    );
    setClients((prev) =>
      prev.filter((item) => !deletedClients.some((client) => client.id === item.id))
    );
    setLastDeleted(null);
    showSaveNotice("Recycle Bin emptied.");
  };

  const sortedClients = (() => {
    const isAdmin = currentRole === "admin";
    const queryText = clientsSearch.trim().toLowerCase();
    const offlineDeletedIds = getOfflineDeletedIds();
    const visibleClients = clients.filter((client) => {
      if (!isAdmin && client.assignedCoachId !== currentCoachId) return false;
      const isDeleted =
        client.deletedAt ||
        client.syncStatus === "deleted" ||
        offlineDeletedIds.has(client.id);
      return clientsView === "recycleBin" ? isDeleted : !isDeleted;
    });
    const now = new Date();
    const selectedDate = clientsByDate ? new Date(clientsByDate) : null;
    const isSameDay = (left, right) =>
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate();
    const { start, end } = getWeekRange(now);
    const viewFiltered = visibleClients.filter((client) => {
      if (clientsView === "recycleBin") return true;
      if (clientsView === "all" || clientsView === "byCoach") return true;
      const parsed = parseClientDate(client.date);
      if (!parsed) return false;
      if (clientsView === "today") {
        return isSameDay(parsed, now);
      }
      if (clientsView === "thisWeek") {
        return parsed >= start && parsed <= end;
      }
      if (clientsView === "thisMonth") {
        return (
          parsed.getFullYear() === now.getFullYear() &&
          parsed.getMonth() === now.getMonth()
        );
      }
      if (clientsView === "byDate") {
        if (!selectedDate || Number.isNaN(selectedDate.getTime())) return false;
        return isSameDay(parsed, selectedDate);
      }
      return true;
    });
    const list = queryText
      ? viewFiltered.filter((client) => {
        const haystack = [
          client.phone,
          client.email,
          client.clientName,
          client.coach,
          client.date,
          ...Object.values(client.evaluation || {})
        ]
          .filter((value) => value !== null && value !== undefined)
          .map((value) => String(value).toLowerCase());
        return haystack.some((value) => value.includes(queryText));
      })
      : [...viewFiltered];

    switch (clientsSort) {
      case "nameAsc":
        return list.sort((a, b) => (a.clientName || "").localeCompare(b.clientName || ""));
      case "nameDesc":
        return list.sort((a, b) => (b.clientName || "").localeCompare(a.clientName || ""));
      case "dateAsc":
        return list.sort((a, b) => {
          const aDate = parseClientDate(a.date);
          const bDate = parseClientDate(b.date);
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          return aDate - bDate;
        });
      case "dateDesc":
        return list.sort((a, b) => {
          const aDate = parseClientDate(a.date);
          const bDate = parseClientDate(b.date);
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          return bDate - aDate;
        });
      case "coachAsc":
        return list.sort((a, b) => (a.coach || "").localeCompare(b.coach || ""));
      case "updatedAtDesc":
      default:
        return list.sort((a, b) => {
          const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
          const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
          return bTime - aTime;
        });
    }
  })();

  const setTodayDate = () => {
    updatePage2Data("date", formatDateToDisplay(new Date()));
  };

  const showSaveNotice = (message) => {
    setSaveNotice(message);
    setTimeout(() => setSaveNotice(""), 3000);
  };

  const loadClients = async () => {
    setClientsLoading(true);
    const q = currentRole === "admin"
      ? query(collection(db, "clients"), orderBy("updatedAt", "desc"))
      : query(
          collection(db, "clients"),
          where("assignedCoachId", "==", currentCoachId)
        );
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    setClients(items);
    setClientsLoading(false);
  };

  const toggleClient = (clientId) => {
    setExpandedClientId((prev) => (prev === clientId ? null : clientId));
  };

  const loadPendingAdmins = async () => {
    setPendingAdminsLoading(true);
    setPendingAdminsError("");
    try {
      const pendingQuery = query(
        collection(db, "user"),
        where("role", "==", "admin"),
        where("status", "==", "pending")
      );
      const snap = await getDocs(pendingQuery);
      const items = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setPendingAdmins(items);
    } catch (error) {
      console.error("PENDING ADMINS ERROR:", error?.code, error?.message);
      const message =
        error?.code === "permission-denied"
          ? "Permission denied loading pending admins."
          : error?.message?.includes("blocked")
            ? "Request blocked by client. Disable ad blocker for firestore.googleapis.com."
            : "Failed to load pending admins.";
      setPendingAdminsError(message);
    } finally {
      setPendingAdminsLoading(false);
    }
  };

  const handleApproveAdmin = async (adminId) => {
    try {
      await updateDoc(doc(db, "user", adminId), { status: "approved" });
      setPendingAdmins((prev) => prev.filter((item) => item.id !== adminId));
    } catch (error) {
      console.error("APPROVE ADMIN ERROR:", error?.code, error?.message);
      setPendingAdminsError("Failed to approve admin.");
    }
  };

  const handleRejectAdmin = async (adminId) => {
    try {
      await deleteDoc(doc(db, "user", adminId));
      setPendingAdmins((prev) => prev.filter((item) => item.id !== adminId));
    } catch (error) {
      console.error("REJECT ADMIN ERROR:", error?.code, error?.message);
      setPendingAdminsError("Failed to reject admin.");
    }
  };

  const getLatestAppointment = (appointments = []) => {
    if (!Array.isArray(appointments)) return null;
    for (let i = appointments.length - 1; i >= 0; i -= 1) {
      const item = appointments[i];
      if (!item) continue;
      const hasValue = Object.values(item).some(
        (value) => value !== null && value !== undefined && String(value).trim() !== ""
      );
      if (hasValue) return item;
    }
    return null;
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "clients") {
      loadClients();
    }
    if (tab === "adminManagement") {
      loadPendingAdmins();
    }
  };

  const openClientInForm = (client) => {
    dispatch({
      type: "UPDATE",
      updater: (prev) => ({
        ...prev,
        clientId: client.id || "",
        page2Data: {
          ...defaultPage2Data,
          ...(client.page2Data || {}),
          name: client.clientName ?? client.page2Data?.name ?? "",
          coach: client.coach ?? client.page2Data?.coach ?? "",
          date: client.date ?? client.page2Data?.date ?? "",
          age: client.page2Data?.age ?? client.age ?? ""
        },
        phone: client.phone ?? "",
        email: client.email ?? "",
        appointments: normalizeAppointments(client.appointments),
        evaluation: { ...defaultEvaluation, ...(client.evaluation || {}) }
      })
    });
    setActiveTab("form");
  };

  const undoDeleteClient = async () => {
    if (!lastDeleted) return;
    if (Date.now() - lastDeleted.deletedAtMs > UNDO_DELETE_WINDOW_MS) return;

    const updateLocal = () => {
      setClients((prev) =>
        prev.map((item) =>
          item.id === lastDeleted.clientId
            ? { ...item, deletedAt: undefined, syncStatus: undefined }
            : item
        )
      );
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const queueItem = {
        clientId: lastDeleted.clientId,
        action: "undelete",
        timestamp: Date.now(),
        syncStatus: "pending"
      };
      try {
        const rawQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue = rawQueue ? JSON.parse(rawQueue) : [];
        queue.push(queueItem);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      } catch (error) {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([queueItem]));
      }
      updateLocal();
      setLastDeleted(null);
      showSaveNotice("Delete undone (offline).");
      return;
    }

    const docRef = doc(db, "clients", lastDeleted.clientId);
    await updateDoc(docRef, {
      deletedAt: deleteField(),
      syncStatus: deleteField()
    });
    updateLocal();
    setLastDeleted(null);
    showSaveNotice("Delete undone.");
  };

  const deleteClient = async (client) => {
    if (currentRole !== "admin" && client.assignedCoachId !== currentCoachId) {
      showSaveNotice("Action not allowed.");
      return;
    }
    const deletedAtMs = Date.now();
    const updateLocal = () => {
      setClients((prev) =>
        prev.map((item) =>
          item.id === client.id
            ? { ...item, deletedAt: deletedAtMs, syncStatus: "deleted" }
            : item
        )
      );
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const queueItem = {
        clientId: client.id,
        action: "delete",
        timestamp: deletedAtMs,
        syncStatus: "pending"
      };
      try {
        const rawQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue = rawQueue ? JSON.parse(rawQueue) : [];
        queue.push(queueItem);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      } catch (error) {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([queueItem]));
      }
      updateLocal();
      setLastDeleted({
        clientId: client.id,
        clientName: client.clientName || "Unnamed client",
        deletedAtMs
      });
      showSaveNotice("Client deleted (offline).");
      return;
    }

    const docRef = doc(db, "clients", client.id);
    await updateDoc(docRef, {
      deletedAt: serverTimestamp(),
      syncStatus: "deleted"
    });
    updateLocal();
    setLastDeleted({
      clientId: client.id,
      clientName: client.clientName || "Unnamed client",
      deletedAtMs
    });
    showSaveNotice("Client deleted.");
  };

  const handleSave = async ({ skipDuplicateCheck = false } = {}) => {
    const { page2Data, appointments, evaluation } = state.present;
    const payload = {
      clientName: page2Data?.name ?? "",
      phone: state.present.phone ?? "",
      email: state.present.email ?? "",
      coach: page2Data?.coach ?? "",
      date: page2Data?.date ?? "",
      age: page2Data?.age ?? "",
      page2Data,
      appointments,
      evaluation
    };
    const assignedCoachId = currentCoachId || CURRENT_COACH_ID;

    if (!skipDuplicateCheck && !state.present.clientId) {
      const normalizeValue = (value) => String(value ?? "").trim().toLowerCase();
      const offlineDeletedIds = getOfflineDeletedIds();
      const activeClients = clients.filter(
        (client) =>
          !client.deletedAt &&
          client.syncStatus !== "deleted" &&
          !offlineDeletedIds.has(client.id)
      );
      const normalizedPhone = normalizeValue(payload.phone);
      const normalizedEmail = normalizeValue(payload.email);
      const normalizedName = normalizeValue(payload.clientName);
      let strongMatch = null;
      let strongMatchType = "";

      if (normalizedPhone) {
        strongMatch = activeClients.find(
          (client) => normalizeValue(client.phone) === normalizedPhone
        );
        if (strongMatch) strongMatchType = "phone";
      }
      if (!strongMatch && normalizedEmail) {
        strongMatch = activeClients.find(
          (client) => normalizeValue(client.email) === normalizedEmail
        );
        if (strongMatch) strongMatchType = "email";
      }

      if (strongMatch) {
        setDuplicateWarning({
          type: "strong",
          match: strongMatch,
          matchType: strongMatchType
        });
        return;
      }

      if (!normalizedPhone && !normalizedEmail && normalizedName) {
        const nameMatch = activeClients.find(
          (client) => normalizeValue(client.clientName) === normalizedName
        );
        if (nameMatch) {
          setDuplicateWarning({
            type: "name",
            match: nameMatch
          });
          return;
        }
      }
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const queueItem = {
        clientId: state.present.clientId || "",
        action: state.present.clientId ? "update" : "create",
        data: state.present.clientId
          ? payload
          : { ...payload, assignedCoachId },
        timestamp: Date.now(),
        syncStatus: "pending"
      };
      try {
        const rawQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue = rawQueue ? JSON.parse(rawQueue) : [];
        queue.push(queueItem);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      } catch (error) {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([queueItem]));
      }
      showSaveNotice("Saved offline. Will sync when online.");
      return;
    }

    if (state.present.clientId) {
      const docRef = doc(db, "clients", state.present.clientId);
      await updateDoc(docRef, {
        ...payload,
        updatedAt: serverTimestamp()
      });
      showSaveNotice("Client saved successfully");
      return;
    }

    const docRef = await addDoc(collection(db, "clients"), {
      ...payload,
      assignedCoachId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    dispatch({
      type: "UPDATE",
      updater: (prev) => ({ ...prev, clientId: docRef.id })
    });
    showSaveNotice("Client saved successfully");
  };

  const handleAdminLogin = async () => {
    const emailValue = adminEmail.trim();
    const passwordValue = adminPassword;
    if (!emailValue || !passwordValue) {
      setAuthError("Enter email and password.");
      return;
    }
    setAuthError("");
    try {
      const result = await signInWithEmailAndPassword(auth, emailValue, passwordValue);
      const profileSnap = await getDoc(doc(db, "user", result.user.uid));
      const profile = profileSnap.exists() ? profileSnap.data() : null;
      if (!profile || profile.role !== "admin") {
        setAuthError("Access denied.");
        return;
      }
      if (profile.status && profile.status !== "approved" && !profile.isCoreAdmin) {
        setAuthError("Awaiting admin approval");
        await signOut(auth);
        return;
      }
      localStorage.setItem(ADMIN_SESSION_KEY, result.user.uid);
      setSession({
        role: "admin",
        adminUid: result.user.uid,
        coachId: "",
        coachName: "",
        isCoreAdmin: Boolean(profile.isCoreAdmin),
        adminStatus: profile.status || ""
      });
      handleTabChange("clients");
    } catch (error) {
      setAuthError("Login failed.");
    }
  };

  const handleAdminRegister = async () => {
    const nameValue = adminRegisterName.trim();
    const emailValue = adminRegisterEmail.trim();
    const passwordValue = adminRegisterPassword;
    if (!nameValue || !emailValue || !passwordValue) {
      setAuthError("Enter name, email, and password.");
      return;
    }
    setAuthError("");
    try {
      const created = await createUserWithEmailAndPassword(auth, emailValue, passwordValue);
      await setDoc(doc(db, "user", created.user.uid), {
        name: nameValue,
        email: emailValue,
        role: "admin",
        status: "pending",
        isCoreAdmin: false,
        createdAt: serverTimestamp()
      });
      await signOut(auth);
      setAdminRegisterName("");
      setAdminRegisterEmail("");
      setAdminRegisterPassword("");
      setAuthView("admin");
      setAuthError("Awaiting admin approval");
    } catch (error) {
      const messageByCode = {
        "auth/email-already-in-use": "Email already in use.",
        "auth/invalid-email": "Enter a valid email.",
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/operation-not-allowed": "Email/password sign-up is disabled."
      };
      setAuthError(messageByCode[error.code] || "Registration failed.");
    }
  };

  const handleCoachRegister = async () => {
    const nameValue = coachName.trim();
    const phoneValue = coachPhone.trim();
    if (!nameValue || !phoneValue) {
      setAuthError("Enter name and phone.");
      return;
    }
    setAuthError("");
    let createdUser = null;
    try {
      const tempEmail = `${phoneValue}@coach.local`;
      const tempPassword = "coach1234";
      const created = await createUserWithEmailAndPassword(auth, tempEmail, tempPassword);
      createdUser = created.user;
      await createdUser.getIdToken(true);
      await setDoc(doc(db, "user", createdUser.uid), {
        name: nameValue,
        phone: phoneValue,
        role: "coach",
        createdAt: serverTimestamp()
      });
      localStorage.setItem(COACH_SESSION_KEY, createdUser.uid);
      localStorage.setItem(COACH_NAME_KEY, nameValue);
      setSession({
        role: "coach",
        coachId: createdUser.uid,
        adminUid: "",
        coachName: nameValue,
        isCoreAdmin: false,
        adminStatus: ""
      });
      handleTabChange("clients");
    } catch (error) {
      console.error("COACH REG ERROR:", error.code, error.message);
      if (createdUser) {
        try {
          await deleteUser(createdUser);
        } catch (cleanupError) {
          // ignore cleanup errors
        }
      }
      setAuthError("Registration failed.");
    }
  };

  const handleCoachLogin = async () => {
    const nameValue = coachLoginName.trim();
    const phoneValue = coachLoginPhone.trim();
    if (!nameValue || !phoneValue) {
      setAuthError("Enter name and phone.");
      return;
    }
    setAuthError("");
    try {
      const tempEmail = `${phoneValue}@coach.local`;
      const tempPassword = "coach1234";
      const result = await signInWithEmailAndPassword(auth, tempEmail, tempPassword);
      const coachSnap = await getDoc(doc(db, "user", result.user.uid));
      if (!coachSnap.exists()) {
        setAuthError("Coach not found.");
        await signOut(auth);
        return;
      }
      const coachData = coachSnap.data() || {};
      if (coachData.role !== "coach" || coachData.phone !== phoneValue) {
        setAuthError("Coach not found.");
        await signOut(auth);
        return;
      }
      localStorage.setItem(COACH_SESSION_KEY, result.user.uid);
      localStorage.setItem(COACH_NAME_KEY, coachData.name || nameValue);
    } catch (error) {
      console.error("COACH LOGIN ERROR:", error.code, error.message);
      setAuthError("Login failed.");
    }
  };

  const handleLogout = async () => {
    try {
      if (session.role === "admin" || session.role === "coach") {
        await signOut(auth);
      }
    } catch (error) {
      // ignore logout errors
    }
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(COACH_SESSION_KEY);
    localStorage.removeItem(COACH_NAME_KEY);
    setSession({
      role: null,
      coachId: "",
      adminUid: "",
      coachName: "",
      isCoreAdmin: false,
      adminStatus: ""
    });
    setAuthView("initial");
    setAuthError("");
    setAdminEmail("");
    setAdminPassword("");
    setAdminRegisterName("");
    setAdminRegisterEmail("");
    setAdminRegisterPassword("");
    setCoachName("");
    setCoachPhone("");
    setCoachLoginName("");
    setCoachLoginPhone("");
    setActiveTab("form");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center text-sm text-gray-600">
        Loading...
      </div>
    );
  }

  if (!session.role) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded border bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col items-center text-center">
            <img
              src={wellnessLogo}
              alt="Herbalife"
              className="h-16 w-auto object-contain"
            />
            <div className="mt-3 text-lg font-bold text-[#2f4f1f]">PERSONAL</div>
            <div className="text-2xl font-bold text-[#2f4f1f]">WELLNESS PASS</div>
          </div>
          {authView === "initial" ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setAuthError("");
                  setAuthView("admin");
                }}
                className="w-full rounded border px-4 py-2 text-sm font-semibold bg-white hover:bg-gray-100"
              >
                Login as Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthError("");
                  setAuthView("adminRegister");
                }}
                className="w-full rounded border px-4 py-2 text-sm font-semibold bg-white hover:bg-gray-100"
              >
                Register as Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthError("");
                  setAuthView("coachLogin");
                }}
                className="w-full rounded border px-4 py-2 text-sm font-semibold bg-white hover:bg-gray-100"
              >
                Login as Coach
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthError("");
                  setAuthView("coach");
                }}
                className="w-full rounded border px-4 py-2 text-sm font-semibold bg-white hover:bg-gray-100"
              >
                Register as Coach
              </button>
            </div>
          ) : null}
          {authView === "admin" ? (
            <div className="space-y-3">
              <div className="text-lg font-semibold text-gray-800">Admin Login</div>
              <input
                type="email"
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
              <div className="relative">
                <input
                  type={showAdminPassword ? "text" : "password"}
                  className="w-full rounded border px-3 py-2 text-sm pr-10"
                  placeholder="Password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500"
                >
                  {showAdminPassword ? "Hide" : "Show"}
                </button>
              </div>
              {authError ? <div className="text-sm text-red-600">{authError}</div> : null}
              <button
                type="button"
                onClick={handleAdminLogin}
                className="w-full rounded border px-4 py-2 text-sm font-semibold bg-white hover:bg-gray-100"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthError("");
                  setAuthView("initial");
                }}
                className="w-full text-xs text-gray-500 hover:underline"
              >
                Back
              </button>
            </div>
          ) : null}
          {authView === "adminRegister" ? (
            <div className="space-y-3">
              <div className="text-lg font-semibold text-gray-800">Admin Registration</div>
              <input
                type="text"
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Name"
                value={adminRegisterName}
                onChange={(e) => setAdminRegisterName(e.target.value)}
              />
              <input
                type="email"
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Email"
                value={adminRegisterEmail}
                onChange={(e) => setAdminRegisterEmail(e.target.value)}
              />
              <div className="relative">
                <input
                  type={showAdminRegisterPassword ? "text" : "password"}
                  className="w-full rounded border px-3 py-2 text-sm pr-10"
                  placeholder="Password"
                  value={adminRegisterPassword}
                  onChange={(e) => setAdminRegisterPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminRegisterPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500"
                >
                  {showAdminRegisterPassword ? "Hide" : "Show"}
                </button>
              </div>
              {authError ? <div className="text-sm text-red-600">{authError}</div> : null}
              <button
                type="button"
                onClick={handleAdminRegister}
                className="w-full rounded border px-4 py-2 text-sm font-semibold bg-white hover:bg-gray-100"
              >
                Register
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthError("");
                  setAuthView("initial");
                }}
                className="w-full text-xs text-gray-500 hover:underline"
              >
                Back
              </button>
            </div>
          ) : null}
          {authView === "coachLogin" ? (
            <div className="space-y-3">
              <div className="text-lg font-semibold text-gray-800">Coach Login</div>
              <input
                type="text"
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Name"
                value={coachLoginName}
                onChange={(e) => setCoachLoginName(e.target.value)}
              />
              <input
                type="tel"
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Phone"
                value={coachLoginPhone}
                onChange={(e) => setCoachLoginPhone(e.target.value)}
              />
              {authError ? <div className="text-sm text-red-600">{authError}</div> : null}
              <button
                type="button"
                onClick={handleCoachLogin}
                className="w-full rounded border px-4 py-2 text-sm font-semibold bg-white hover:bg-gray-100"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthError("");
                  setAuthView("initial");
                }}
                className="w-full text-xs text-gray-500 hover:underline"
              >
                Back
              </button>
            </div>
          ) : null}
          {authView === "coach" ? (
            <div className="space-y-3">
              <div className="text-lg font-semibold text-gray-800">Coach Registration</div>
              <input
                type="text"
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Name"
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
              />
              <input
                type="tel"
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Phone"
                value={coachPhone}
                onChange={(e) => setCoachPhone(e.target.value)}
              />
              {authError ? <div className="text-sm text-red-600">{authError}</div> : null}
              <button
                type="button"
                onClick={handleCoachRegister}
                className="w-full rounded border px-4 py-2 text-sm font-semibold bg-white hover:bg-gray-100"
              >
                Register
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthError("");
                  setAuthView("initial");
                }}
                className="w-full text-xs text-gray-500 hover:underline"
              >
                Back
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      {saveNotice ? (
        <div className="fixed top-4 right-4 z-50 rounded border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 shadow-lg">
          {saveNotice}
        </div>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3 p-4 print:hidden">
        <button
          onClick={() => handleTabChange("form")}
          className={`px-4 py-2 rounded border text-sm font-semibold ${
            activeTab === "form" ? "bg-white" : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          Form
        </button>
        <button
          onClick={() => handleTabChange("clients")}
          className={`px-4 py-2 rounded border text-sm font-semibold ${
            activeTab === "clients" ? "bg-white" : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          Clients
        </button>
        {currentRole === "admin" ? (
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2 rounded border text-sm font-semibold ${
              activeTab === "reports" ? "bg-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Reports
          </button>
        ) : null}
        {currentRole === "admin" && session.isCoreAdmin ? (
          <button
            onClick={() => handleTabChange("adminManagement")}
            className={`px-4 py-2 rounded border text-sm font-semibold ${
              activeTab === "adminManagement" ? "bg-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Admin Management
          </button>
        ) : null}
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded border text-sm font-semibold bg-white hover:bg-gray-100"
        >
          Logout
        </button>
      </div>
      {activeTab === "form" ? (
        <div className="flex flex-wrap justify-center gap-3 px-4 pb-4 print:hidden">
          <button
            onClick={() => dispatch({ type: "CLEAR" })}
            className="px-4 py-2 rounded border text-sm font-semibold bg-white hover:bg-gray-100"
          >
            Add New Client
          </button>
          <button
            onClick={() => dispatch({ type: "UNDO" })}
            disabled={!canUndo}
            className={`px-4 py-2 rounded border text-sm font-semibold ${
              canUndo ? "bg-white hover:bg-gray-100" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Undo
          </button>
          <button
            onClick={() => dispatch({ type: "REDO" })}
            disabled={!canRedo}
            className={`px-4 py-2 rounded border text-sm font-semibold ${
              canRedo ? "bg-white hover:bg-gray-100" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Redo
          </button>
          <button
            onClick={exportToPDF}
            className="bg-[#2f4f1f] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#243c18]"
          >
            <Download size={20} />
            Export as PDF
          </button>
          <button
            onClick={handleSharePdf}
            className="bg-[#2f4f1f] text-white px-4 py-2 rounded hover:bg-[#243c18]"
          >
            Share PDF
          </button>
          <button
            onClick={handleSave}
            className="bg-[#2f4f1f] text-white px-4 py-2 rounded hover:bg-[#243c18]"
          >
            Save
          </button>
        </div>
      ) : null}

      {activeTab === "clients" ? (
        <div className="max-w-5xl mx-auto bg-white shadow-lg p-6 print:hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#2f4f1f]">Clients</h2>
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700" htmlFor="clients-sort">
                Sort
              </label>
              <select
                id="clients-sort"
                className="border rounded px-2 py-1 text-sm bg-white"
                value={clientsSort}
                onChange={(e) => setClientsSort(e.target.value)}
              >
                <option value="updatedAtDesc">Date (Newest first)</option>
                <option value="dateDesc">Date (Newest first - client date)</option>
                <option value="dateAsc">Date (Oldest first)</option>
                <option value="nameAsc">Name A-Z</option>
                <option value="nameDesc">Name Z-A</option>
                <option value="coachAsc">Coach A-Z</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setClientsView("all");
                  loadClients();
                }}
                className={`px-4 py-2 rounded border text-sm font-semibold ${
                  clientsView === "all" ? "bg-white" : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                All Clients
              </button>
              <button
                onClick={loadClients}
                className="px-4 py-2 rounded border text-sm font-semibold bg-white hover:bg-gray-100"
              >
                Refresh Clients
              </button>
              <button
                type="button"
                onClick={downloadClientsPdf}
                className="px-4 py-2 rounded border text-sm font-semibold bg-white hover:bg-gray-100"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={() =>
                  setClientsView((prev) => (prev === "recycleBin" ? "all" : "recycleBin"))
                }
                className={`px-4 py-2 rounded border text-sm font-semibold ${
                  clientsView === "recycleBin" ? "bg-white" : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                Recycle Bin
              </button>
            </div>
          </div>
          {clientsView !== "recycleBin" ? (
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setClientsView("today")}
                  className={`px-3 py-1 rounded border text-xs font-semibold ${
                    clientsView === "today" ? "bg-white" : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setClientsView("thisWeek")}
                  className={`px-3 py-1 rounded border text-xs font-semibold ${
                    clientsView === "thisWeek" ? "bg-white" : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => setClientsView("thisMonth")}
                  className={`px-3 py-1 rounded border text-xs font-semibold ${
                    clientsView === "thisMonth" ? "bg-white" : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => setClientsView("byDate")}
                  className={`px-3 py-1 rounded border text-xs font-semibold ${
                    clientsView === "byDate" ? "bg-white" : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  By Date
                </button>
                {clientsView === "byDate" ? (
                  <input
                    type="date"
                    className="border rounded px-2 py-1 text-xs bg-white"
                    value={clientsByDate}
                    onChange={(e) => {
                      setClientsByDate(e.target.value);
                      setClientsView("byDate");
                    }}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => setClientsView("byCoach")}
                  className={`px-3 py-1 rounded border text-xs font-semibold ${
                    clientsView === "byCoach" ? "bg-white" : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  By Coach
                </button>
              </div>
              <div className="flex items-center gap-2 rounded border bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm">
                <span>Total Clients</span>
                <span className="text-sm font-bold text-[#2f4f1f]">
                  {getVisibleClientsForReports().length}
                </span>
              </div>
            </div>
          ) : null}
          {clientsView === "recycleBin" ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={restoreAllDeletedClients}
                className="px-3 py-1 rounded border text-xs font-semibold bg-white hover:bg-gray-100"
              >
                Restore All
              </button>
              <button
                type="button"
                onClick={emptyRecycleBin}
                disabled={typeof navigator !== "undefined" && !navigator.onLine}
                className={`px-3 py-1 rounded border text-xs font-semibold ${
                  typeof navigator !== "undefined" && !navigator.onLine
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                Empty Recycle Bin
              </button>
            </div>
          ) : null}
          <div className="mb-4">
            <input
              type="text"
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="Search Clients by Name, Coach, Date, or Evaluation Values"
              value={clientsSearch}
              onChange={(e) => setClientsSearch(e.target.value)}
            />
          </div>
          {lastDeleted && Date.now() - lastDeleted.deletedAtMs <= UNDO_DELETE_WINDOW_MS ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <div>
                Client deleted: {lastDeleted.clientName}
              </div>
              <button
                type="button"
                onClick={undoDeleteClient}
                className="px-3 py-1 rounded border text-xs font-semibold bg-white hover:bg-gray-100"
              >
                Undo
              </button>
            </div>
          ) : null}
          {clientsLoading ? (
            <div className="text-sm text-gray-600">Loading...</div>
          ) : sortedClients.length === 0 ? (
            <div className="text-sm text-gray-600">No clients found.</div>
          ) : (
            <div className="space-y-3">
              {clientsView === "byCoach" ? (
                Object.entries(
                  sortedClients.reduce((acc, client) => {
                    const coachName = client.coach || "Unassigned";
                    if (!acc[coachName]) acc[coachName] = [];
                    acc[coachName].push(client);
                    return acc;
                  }, {})
                )
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([coachName, coachClients]) => (
                    <div key={coachName}>
                      <div className="text-sm font-semibold text-gray-700 mb-2">
                        {coachName}
                      </div>
                      <div className="space-y-3">
                        {coachClients.map((client, index) => (
                          <div
                            key={client.id}
                            className="border rounded p-3 cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleClient(client.id)}
                          >
                            <div className="font-semibold text-[#2f4f1f]">
                              {index + 1}. {client.clientName || "Unnamed client"}
                            </div>
                            <div className="flex flex-col gap-2 text-xs text-gray-700 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 break-all">
                                <span>Age: {client.age || client.page2Data?.age || "-"}</span>
                                <span>|</span>
                                <span>Coach: {client.coach || "-"}</span>
                                <span>|</span>
                                <span>Date: {formatClientDate(client.date) || "-"}</span>
                                {client.phone ? (
                                  <>
                                    <span>|</span>
                                    <a
                                      href={`tel:${client.phone}`}
                                      className="text-[#2f4f1f] hover:underline"
                                    >
                                      Phone: {client.phone}
                                    </a>
                                  </>
                                ) : null}
                                {client.email ? (
                                  <>
                                    <span>|</span>
                                    <a
                                      href={`mailto:${client.email}`}
                                      className="text-[#2f4f1f] hover:underline break-all"
                                    >
                                      Email: {client.email}
                                    </a>
                                  </>
                                ) : null}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {(client.phone || client.email) ? (
                                  <div className="flex items-center gap-2">
                                    {client.phone ? (
                                      <>
                                        <a
                                          href={`tel:${client.phone}`}
                                          className="rounded border border-gray-200 bg-white p-1 text-[#2f4f1f] hover:bg-gray-100"
                                          aria-label="Call"
                                          title="Call"
                                        >
                                          <Phone size={16} />
                                        </a>
                                        <a
                                          href={`https://wa.me/${client.phone}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="rounded border border-gray-200 bg-white p-1 text-[#2f4f1f] hover:bg-gray-100"
                                          aria-label="WhatsApp"
                                          title="WhatsApp"
                                        >
                                          <svg
                                            viewBox="0 0 32 32"
                                            width="16"
                                            height="16"
                                            fill="currentColor"
                                            aria-hidden="true"
                                          >
                                            <path d="M16 3C9.4 3 4 8.3 4 14.9c0 2.6.9 5 2.4 7l-1.6 5.8 6-1.6c1.8 1 3.8 1.5 5.9 1.5 6.6 0 12-5.3 12-11.9S22.6 3 16 3zm0 2.1c5.5 0 9.9 4.4 9.9 9.8s-4.4 9.8-9.9 9.8c-2.1 0-4.1-.6-5.8-1.7l-.4-.2-3.5.9.9-3.4-.2-.3c-1.1-1.6-1.7-3.5-1.7-5.6C6.1 9.5 10.5 5.1 16 5.1zm-4.2 6.1c-.2 0-.4 0-.6.1-.2.1-.4.3-.6.6-.2.3-.8 1-.8 2.4s.9 2.7 1 2.9c.1.2 1.7 2.7 4.2 3.6 2.1.8 2.5.6 2.9.6.5 0 1.5-.6 1.7-1.2.2-.6.2-1 .2-1.1s-.1-.2-.2-.3-.5-.2-1-.4-1.2-.6-1.4-.6c-.2-.1-.4-.1-.6.1-.2.2-.7.8-.9 1-.2.2-.3.2-.6.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.6-1.4-1.9-.1-.2 0-.4.1-.5.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.6 0-.2-.5-1.3-.7-1.7-.2-.4-.4-.4-.6-.4z" />
                                          </svg>
                                        </a>
                                      </>
                                    ) : null}
                                    {client.email ? (
                                      <a
                                        href={`mailto:${client.email}`}
                                        className="rounded border border-gray-200 bg-white p-1 text-[#2f4f1f] hover:bg-gray-100"
                                        aria-label="Email"
                                        title="Email"
                                      >
                                        <Mail size={16} />
                                      </a>
                                    ) : null}
                                  </div>
                                ) : null}
                                <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap">
                                  {clientsView === "recycleBin" ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        restoreClient(client);
                                      }}
                                      className="px-3 py-1 rounded border text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                    >
                                      Restore
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openClientInForm(client);
                                        }}
                                        className="px-3 py-1 rounded border text-xs font-semibold bg-white hover:bg-gray-100"
                                      >
                                        Open Form
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          downloadClientFullPdf(client);
                                        }}
                                        className="px-3 py-1 rounded border text-xs font-semibold bg-white hover:bg-gray-100"
                                      >
                                        ⬇ Download Full PDF
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteClient(client);
                                        }}
                                        className="px-3 py-1 rounded border text-xs font-semibold bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                      >
                                        Delete Client
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            {expandedClientId === client.id ? (
                              <div className="mt-3 text-sm text-gray-800 border-t pt-3">
                                {client.phone ? (
                                  <div><span className="font-semibold">Phone:</span> {client.phone}</div>
                                ) : null}
                                {client.email ? (
                                  <div><span className="font-semibold">Email:</span> {client.email}</div>
                                ) : null}
                                {(() => {
                                  const latestAppointment = getLatestAppointment(client.appointments);
                                  if (!latestAppointment) {
                                    return <div className="pt-2 text-gray-600">No appointment data.</div>;
                                  }
                                  return (
                                    <div className="pt-2">
                                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <div className="space-y-1">
                                          <div><span className="font-semibold">Age:</span> {client.age || client.page2Data?.age || "-"}</div>
                                          <div><span className="font-semibold">Next appointment:</span> {formatClientDate(client.date) || "-"}</div>
                                          <div><span className="font-semibold">Height (Cm):</span> {latestAppointment.height || "-"}</div>
                                          <div><span className="font-semibold">Weight (Kg):</span> {latestAppointment.weight || "-"}</div>
                                        </div>
                                        <div className="space-y-1">
                                          <div><span className="font-semibold">Body Fat Range:</span> {latestAppointment.bodyFat || "-"}</div>
                                          <div><span className="font-semibold">% Body Water Range:</span> {latestAppointment.water || "-"}</div>
                                          <div><span className="font-semibold">Muscle Mass:</span> {latestAppointment.muscle || "-"}</div>
                                          <div><span className="font-semibold">Physique Ratings:</span> {latestAppointment.physique || "-"}</div>
                                        </div>
                                        <div className="space-y-1">
                                          <div><span className="font-semibold">BMR:</span> {latestAppointment.bmr || "-"}</div>
                                          <div><span className="font-semibold">Basal Metabolic Age:</span> {latestAppointment.basal || "-"}</div>
                                          <div><span className="font-semibold">Bone Mass:</span> {latestAppointment.bone || "-"}</div>
                                          <div><span className="font-semibold">Visceral Fat:</span> {latestAppointment.visceral || "-"}</div>
                                        </div>
                                      </div>
                                      <div className="mt-3">
                                        <div className="font-semibold text-gray-700">Evaluation</div>
                                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                          <div><span className="font-semibold">Body Fat:</span> {formatEvaluationValue(client.evaluation?.bodyFat)}</div>
                                          <div><span className="font-semibold">Muscle Mass:</span> {formatEvaluationValue(client.evaluation?.muscleMass)}</div>
                                          <div><span className="font-semibold">Questionnaire:</span> {formatEvaluationValue(client.evaluation?.questionnaire)}</div>
                                          <div><span className="font-semibold">Body Water:</span> {formatEvaluationValue(client.evaluation?.bodyWater)}</div>
                                          <div><span className="font-semibold">Visceral Fat:</span> {formatEvaluationValue(client.evaluation?.visceralFat)}</div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              ) : (
                sortedClients.map((client, index) => (
                  <div
                    key={client.id}
                    className="border rounded p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleClient(client.id)}
                  >
                    <div className="font-semibold text-[#2f4f1f]">
                      {index + 1}. {client.clientName || "Unnamed client"}
                    </div>
                    <div className="flex flex-col gap-2 text-xs text-gray-700 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 break-all">
                        <span>Age: {client.age || client.page2Data?.age || "-"}</span>
                        <span>|</span>
                        <span>Coach: {client.coach || "-"}</span>
                        <span>|</span>
                        <span>Date: {formatClientDate(client.date) || "-"}</span>
                        {client.phone ? (
                          <>
                            <span>|</span>
                            <a
                              href={`tel:${client.phone}`}
                              className="text-[#2f4f1f] hover:underline"
                            >
                              Phone: {client.phone}
                            </a>
                          </>
                        ) : null}
                        {client.email ? (
                          <>
                            <span>|</span>
                            <a
                              href={`mailto:${client.email}`}
                              className="text-[#2f4f1f] hover:underline break-all"
                            >
                              Email: {client.email}
                            </a>
                          </>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {(client.phone || client.email) ? (
                          <div className="flex items-center gap-2">
                            {client.phone ? (
                              <>
                                <a
                                  href={`tel:${client.phone}`}
                                  className="rounded border border-gray-200 bg-white p-1 text-[#2f4f1f] hover:bg-gray-100"
                                  aria-label="Call"
                                  title="Call"
                                >
                                  <Phone size={16} />
                                </a>
                                <a
                                  href={`https://wa.me/${client.phone}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded border border-gray-200 bg-white p-1 text-[#2f4f1f] hover:bg-gray-100"
                                  aria-label="WhatsApp"
                                  title="WhatsApp"
                                >
                                  <svg
                                    viewBox="0 0 32 32"
                                    width="16"
                                    height="16"
                                    fill="currentColor"
                                    aria-hidden="true"
                                  >
                                    <path d="M16 3C9.4 3 4 8.3 4 14.9c0 2.6.9 5 2.4 7l-1.6 5.8 6-1.6c1.8 1 3.8 1.5 5.9 1.5 6.6 0 12-5.3 12-11.9S22.6 3 16 3zm0 2.1c5.5 0 9.9 4.4 9.9 9.8s-4.4 9.8-9.9 9.8c-2.1 0-4.1-.6-5.8-1.7l-.4-.2-3.5.9.9-3.4-.2-.3c-1.1-1.6-1.7-3.5-1.7-5.6C6.1 9.5 10.5 5.1 16 5.1zm-4.2 6.1c-.2 0-.4 0-.6.1-.2.1-.4.3-.6.6-.2.3-.8 1-.8 2.4s.9 2.7 1 2.9c.1.2 1.7 2.7 4.2 3.6 2.1.8 2.5.6 2.9.6.5 0 1.5-.6 1.7-1.2.2-.6.2-1 .2-1.1s-.1-.2-.2-.3-.5-.2-1-.4-1.2-.6-1.4-.6c-.2-.1-.4-.1-.6.1-.2.2-.7.8-.9 1-.2.2-.3.2-.6.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.6-1.4-1.9-.1-.2 0-.4.1-.5.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.6 0-.2-.5-1.3-.7-1.7-.2-.4-.4-.4-.6-.4z" />
                                  </svg>
                                </a>
                              </>
                            ) : null}
                            {client.email ? (
                              <a
                                href={`mailto:${client.email}`}
                                className="rounded border border-gray-200 bg-white p-1 text-[#2f4f1f] hover:bg-gray-100"
                                aria-label="Email"
                                title="Email"
                              >
                                <Mail size={16} />
                              </a>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap">
                          {clientsView === "recycleBin" ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                restoreClient(client);
                              }}
                              className="px-3 py-1 rounded border text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            >
                              Restore
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openClientInForm(client);
                                }}
                                className="px-3 py-1 rounded border text-xs font-semibold bg-white hover:bg-gray-100"
                              >
                                Open Form
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadClientFullPdf(client);
                                }}
                                className="px-3 py-1 rounded border text-xs font-semibold bg-white hover:bg-gray-100"
                              >
                                ⬇ Download Full PDF
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteClient(client);
                                }}
                                className="px-3 py-1 rounded border text-xs font-semibold bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                              >
                                Delete Client
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {expandedClientId === client.id ? (
                      <div className="mt-3 text-sm text-gray-800 border-t pt-3">
                        {(() => {
                          const latestAppointment = getLatestAppointment(client.appointments);
                          if (!latestAppointment) {
                            return <div className="pt-2 text-gray-600">No appointment data.</div>;
                          }
                          return (
                            <div className="pt-2">
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="space-y-1">
                                  <div><span className="font-semibold">Age:</span> {client.age || client.page2Data?.age || "-"}</div>
                                  <div><span className="font-semibold">Next appointment:</span> {formatClientDate(client.date) || "-"}</div>
                                  <div><span className="font-semibold">Height (Cm):</span> {latestAppointment.height || "-"}</div>
                                  <div><span className="font-semibold">Weight (Kg):</span> {latestAppointment.weight || "-"}</div>
                                </div>
                                <div className="space-y-1">
                                  <div><span className="font-semibold">Body Fat Range:</span> {latestAppointment.bodyFat || "-"}</div>
                                  <div><span className="font-semibold">% Body Water Range:</span> {latestAppointment.water || "-"}</div>
                                  <div><span className="font-semibold">Muscle Mass:</span> {latestAppointment.muscle || "-"}</div>
                                  <div><span className="font-semibold">Physique Ratings:</span> {latestAppointment.physique || "-"}</div>
                                </div>
                                <div className="space-y-1">
                                  <div><span className="font-semibold">BMR:</span> {latestAppointment.bmr || "-"}</div>
                                  <div><span className="font-semibold">Basal Metabolic Age:</span> {latestAppointment.basal || "-"}</div>
                                  <div><span className="font-semibold">Bone Mass:</span> {latestAppointment.bone || "-"}</div>
                                  <div><span className="font-semibold">Visceral Fat:</span> {latestAppointment.visceral || "-"}</div>
                                </div>
                              </div>
                              <div className="mt-3">
                                <div className="font-semibold text-gray-700">Evaluation</div>
                                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                  <div><span className="font-semibold">Body Fat:</span> {formatEvaluationValue(client.evaluation?.bodyFat)}</div>
                                  <div><span className="font-semibold">Muscle Mass:</span> {formatEvaluationValue(client.evaluation?.muscleMass)}</div>
                                  <div><span className="font-semibold">Questionnaire:</span> {formatEvaluationValue(client.evaluation?.questionnaire)}</div>
                                  <div><span className="font-semibold">Body Water:</span> {formatEvaluationValue(client.evaluation?.bodyWater)}</div>
                                  <div><span className="font-semibold">Visceral Fat:</span> {formatEvaluationValue(client.evaluation?.visceralFat)}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "adminManagement" && currentRole === "admin" && session.isCoreAdmin ? (
        <div className="max-w-5xl mx-auto bg-white shadow-lg p-6 print:hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#2f4f1f]">Admin Management</h2>
            <button
              type="button"
              onClick={loadPendingAdmins}
              className="rounded border px-3 py-1 text-sm font-semibold bg-white hover:bg-gray-100"
            >
              Refresh
            </button>
          </div>
          {pendingAdminsLoading ? (
            <div className="text-sm text-gray-600">Loading pending admins...</div>
          ) : null}
          {pendingAdminsError ? (
            <div className="text-sm text-red-600">{pendingAdminsError}</div>
          ) : null}
          {!pendingAdminsLoading && !pendingAdminsError && !pendingAdmins.length ? (
            <div className="text-sm text-gray-600">No pending admins.</div>
          ) : null}
          {!pendingAdminsLoading && !pendingAdminsError && pendingAdmins.length ? (
            <div className="space-y-3">
              {pendingAdmins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border p-3"
                >
                  <div>
                    <div className="font-semibold text-gray-800">{admin.name || "Unnamed"}</div>
                    <div className="text-sm text-gray-600">{admin.email || "-"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApproveAdmin(admin.id)}
                      className="rounded border px-3 py-1 text-sm font-semibold bg-white hover:bg-gray-100"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectAdmin(admin.id)}
                      className="rounded border px-3 py-1 text-sm font-semibold bg-white hover:bg-gray-100"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "reports" ? (
        <div className="max-w-5xl mx-auto bg-white shadow-lg p-6 print:hidden">
          {(() => {
            const visibleClients = getVisibleClientsForReports();
            const coachMap = new Map();
            visibleClients.forEach((client) => {
              const coachName = client.coach || "Unassigned";
              coachMap.set(coachName, (coachMap.get(coachName) || 0) + 1);
            });
            const coachEntries = Array.from(coachMap.entries()).sort(([a], [b]) =>
              a.localeCompare(b)
            );
            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded border bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-gray-600">Total Clients</div>
                    <div className="mt-2 text-2xl font-bold text-[#2f4f1f]">
                      {visibleClients.length}
                    </div>
                  </div>
                  <div className="rounded border bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-gray-600">Active Coaches</div>
                    <div className="mt-2 text-2xl font-bold text-[#2f4f1f]">
                      {coachEntries.length}
                    </div>
                  </div>
                </div>
                <div className="rounded border bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-gray-600">Clients per Coach</div>
                  {coachEntries.length ? (
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {coachEntries.map(([coachName, count]) => (
                        <div key={coachName} className="flex items-center justify-between rounded border px-3 py-2">
                          <span className="font-semibold text-gray-700">{coachName}</span>
                          <span className="font-semibold text-[#2f4f1f]">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-gray-600">No clients found.</div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      ) : null}

      {activeTab === "form" ? (
        <>
          <div className="max-w-7xl mx-auto px-4 pt-2">
            <div className="text-sm font-semibold text-gray-700">
              {state.present.clientId
                ? `Editing client: ${page2Data.name || "Unnamed client"}`
                : "New client"}
            </div>
            {duplicateWarning ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                <div className={`w-full max-w-md rounded border px-4 py-4 text-sm shadow-lg ${
                  duplicateWarning.type === "strong"
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-yellow-200 bg-yellow-50 text-yellow-900"
                }`}>
                  <div className="font-semibold">
                    {duplicateWarning.type === "strong"
                      ? "Possible duplicate client (phone/email match)"
                      : "Possible duplicate by name"}
                  </div>
                  <div className="mt-1">
                    {duplicateWarning.type === "strong"
                      ? `This ${duplicateWarning.matchType} matches an existing client.`
                      : "This may be a different person with the same name."}
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-semibold">Existing:</span>{" "}
                    {duplicateWarning.match?.clientName || "Unnamed client"} | Coach:{" "}
                    {duplicateWarning.match?.coach || "-"} | Date:{" "}
                    {formatClientDate(duplicateWarning.match?.date) || "-"}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!duplicateWarning.match) return;
                        setDuplicateWarning(null);
                        openClientInForm(duplicateWarning.match);
                      }}
                      className="px-3 py-1 rounded border text-xs font-semibold bg-white hover:bg-gray-100"
                    >
                      Open existing client
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDuplicateWarning(null);
                        handleSave({ skipDuplicateCheck: true });
                      }}
                      className="px-3 py-1 rounded border text-xs font-semibold bg-white hover:bg-gray-100"
                    >
                      Continue anyway
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
      <div className="max-w-7xl mx-auto bg-white shadow-lg page-break print-section">
        <div className="grid grid-cols-1 lg:grid-cols-2 print-split">
          <div className="p-4 text-xs leading-relaxed order-2 lg:order-2 print-col print-break tight-print">
            <div className="mb-4 space-y-3">
              <div className="grid grid-cols-[40px_1fr] gap-3 items-center">
                <div className="flex justify-center">
                  <img src={physiqueRatingsIcon} alt="Physique ratings" className="h-9 w-9 object-contain" />
                </div>
                <p className="font-bold">What is Physique Rating?</p>
              </div>
              <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                <div />
                <p>Offers you the opportunity to set a desired Physique Rating from which you can tailor your health/fitness programme accordingly</p>
              </div>
              <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                <div />
                <div>
                  <p className="font-bold mb-1">Why is monitoring Physique Rating important?</p>
                  <p>When a person increases their activity level their weight may not change but their balance of body fat and muscle may alter which will change the overall physique or body shape. The physique rating helps accurately guide through a diet and fitness programme</p>
                </div>
              </div>

              <div className="grid grid-cols-[40px_1fr] gap-3 items-center">
                <div className="flex justify-center">
                  <img src={basalMetabolicAgeIcon} alt="Basal metabolic rate" className="h-9 w-9 object-contain" />
                </div>
                <p className="font-bold">What is Basal Metabolic Rate Indicator?</p>
              </div>
              <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                <div />
                <p>The Basal Metabolic Rate (BMR) is the number of calories the body needs when at rest.</p>
              </div>
              <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                <div />
                <div>
                  <p className="font-bold mb-1">Why is monitoring the Basal Metabolic Rate important?</p>
                  <p>Understanding the Basal Metabolic Rate will allow you to monitor the number of calories your body requires according to your Physique and lifestyle. The more muscle or general activity you take the more calories you require. The Basal Metabolic Rate level also decreases as the body ages</p>
                </div>
              </div>

              <div className="grid grid-cols-[40px_1fr] gap-3 items-center">
                <div className="flex justify-center">
                  <img src={basalMetabolicAgeIcon} alt="Basal metabolic age" className="h-9 w-9 object-contain" />
                </div>
                <p className="font-bold">What is Metabolic Age Rating?</p>
              </div>
              <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                <div />
                <p>Basal Metabolic Rate starts to decrease after the age of 16/17 years old. Your Metabolic Age Rating indicates what age level your body is currently rated at</p>
              </div>
              <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                <div />
                <div>
                  <p className="font-bold mb-1">Why is the Metabolic Age Rating important?</p>
                  <p>If the age indicated is higher than your actual age then you need to improve your Basal Metabolic Rate. Increasing exercise levels will build healthier muscle tissue which burn more calories, consequently improving your Metabolic Age Rating</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="grid grid-cols-[40px_1fr] gap-3 items-center mb-2">
                <div className="flex justify-center">
                  <img src={boneMassIcon} alt="Bone mass" className="h-9 w-9 object-contain" />
                </div>
                <div className="font-bold">Bone Mass:</div>
              </div>

              <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                <div />
                <div className="overflow-x-auto print-fit-table phone-fit-table">
                  <table className="w-full min-w-[360px] border-2 border-black text-xs mb-2">
                    <thead>
                      <tr className="bg-yellow-200">
                        <th className="border border-black p-1" colSpan="3">Women</th>
                      </tr>
                      <tr>
                        <th className="border border-black p-1">Less than 50 Kg</th>
                        <th className="border border-black p-1">50 Kg to 75 Kg</th>
                        <th className="border border-black p-1">More than 75 Kg</th>
                      </tr>
                      <tr>
                        <td className="border border-black p-1 text-center">1.95 Kg</td>
                        <td className="border border-black p-1 text-center">2.4 Kg</td>
                        <td className="border border-black p-1 text-center">2.95 Kg</td>
                      </tr>
                      <tr className="bg-blue-900 text-white">
                        <th className="border border-black p-1" colSpan="3">Men</th>
                      </tr>
                      <tr>
                        <th className="border border-black p-1">Less than 65 Kg</th>
                        <th className="border border-black p-1">65 Kg to 95 Kg</th>
                        <th className="border border-black p-1">More than 95 Kg</th>
                      </tr>
                      <tr>
                        <td className="border border-black p-1 text-center">2.65 Kg</td>
                        <td className="border border-black p-1 text-center">3.29 Kg</td>
                        <td className="border border-black p-1 text-center">3.69 Kg</td>
                      </tr>
                    </thead>
                  </table>
                </div>
              </div>
            </div>

            <div>
              <div className="grid grid-cols-[40px_1fr] gap-3 items-center mb-2">
                <div className="flex justify-center">
                  <img src={visceralFatIcon} alt="Visceral fat" className="h-9 w-9 object-contain" />
                </div>
                <div className="font-bold">Visceral Fat:</div>
              </div>

              <div className="mb-2 text-xs">
                <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                  <div />
                  <div className="grid grid-cols-[13ch_1fr] gap-y-1 pl-[13ch] font-bold">
                    <div className="text-[#1f7a1f]">1-4</div>
                    <div className="text-[#1f7a1f]">Excellent</div>
                    <div className="text-[#b35a00]">5-8</div>
                    <div className="text-[#b35a00]">Healthy</div>
                    <div className="text-[#e6c600]">9-12</div>
                    <div className="text-[#e6c600]">Bad</div>
                    <div className="text-[#a00]">Over 13</div>
                    <div className="text-[#a00]">Alarming</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                <div />
                <div>
                  <p className="font-bold mb-1">What is Visceral Fat?</p>
                  <p>Fat that surrounds the vital organs in the trunk/ stomach area of the body.</p>
                  <p className="font-bold mb-1">Why is monitoring Visceral Fat important?</p>
                  <p>High Visceral Fat levels increase the risk of high blood pressure, heart disease and type 2 diabetes. Lowering your Visceral Fat levels can stabilise insulin action substantially, reducing your risk of diabetes and other related illnesses.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative h-full order-1 lg:order-1 print-col print-break cover-shell">
            <div className="absolute inset-0 bg-white cover-layer">
              <div className="flex flex-col h-full">
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <img src={wellnessLogo} alt="Herbalife logo" className="mx-auto mb-3 max-w-[220px]" />
                    <h1 className="text-4xl sm:text-5xl font-bold mb-2 text-[#2f4f1f]">PERSONAL</h1>
                    <h2 className="text-5xl sm:text-6xl font-bold text-[#2f4f1f]">WELLNESS PASS</h2>
                  </div>
                </div>

                <div className="bg-white/95 p-6 m-4 sm:m-8">
                  <div className="mb-6">
                    <label className="block font-bold mb-2">Date:</label>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        className="flex-1 border-b-2 border-[#2f4f1f] p-2"
                        value={page2Data.date}
                        onChange={(e) => updatePage2Data("date", e.target.value)}
                        placeholder="DD-MONTH-YYYY"
                      />
                      <button
                        type="button"
                        onClick={setTodayDate}
                        className="border-2 border-[#2f4f1f] text-[#2f4f1f] px-3 py-2 text-xs font-bold uppercase tracking-wide hover:bg-[#e7edd5]"
                      >
                        Today
                      </button>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block font-bold mb-2">Name</label>
                    <input
                      type="text"
                      className="w-full border-b-2 border-[#2f4f1f] p-2"
                      value={page2Data.name}
                      onChange={(e) => updatePage2Data("name", e.target.value)}
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block font-bold mb-2">Phone Number</label>
                    <input
                      type="tel"
                      className="w-full border-b-2 border-[#2f4f1f] p-2"
                      value={phone}
                      onChange={(e) => updateTopLevel("phone", e.target.value)}
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block font-bold mb-2">Email</label>
                    <input
                      type="email"
                      className="w-full border-b-2 border-[#2f4f1f] p-2"
                      value={email}
                      onChange={(e) => updateTopLevel("email", e.target.value)}
                    />
                  </div>

                  <div className="border-2 border-[#2f4f1f] p-4 text-center">
                    <label className="block font-bold mb-2">Your Personal Wellness Coach</label>
                    <input
                      type="text"
                      className="w-full text-center p-2"
                      value={page2Data.coach}
                      onChange={(e) => updatePage2Data("coach", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white shadow-lg p-4 sm:p-6 page-break print-section">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch print-split">
          <div className="border-2 border-black flex flex-col h-full order-2 xl:order-2 print-col">
            <div className="border-b-2 border-black p-2 font-bold text-center text-sm">
              Please bring along this Pass to your next appointment
            </div>

            <div className="overflow-x-auto xl:overflow-x-visible print-fit-table phone-fit-table">
              <div className="min-w-[880px] xl:min-w-0 print-min-w-0 phone-fit-inner">
                <div className="grid grid-cols-11 text-xs border-b border-black">
                  <div className="border-r border-black p-1 text-center font-semibold">
                    <div>Age</div>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      className="mt-1 w-full text-center bg-white"
                      value={page2Data.age}
                      onChange={(e) => updatePage2Data("age", e.target.value)}
                    />
                  </div>
                  <div className="border-r border-black p-1 text-center">Height<br/>cm</div>
                  <div className="border-r border-black p-1 text-center">Weight<br/>KG</div>
                  <div className="border-r border-black p-1 text-center">Body Fat<br/>Range</div>
                  <div className="border-r border-black p-1 text-center">% Body<br/>Water<br/>Range</div>
                  <div className="border-r border-black p-1 text-center">Muscle<br/>Mass</div>
                  <div className="border-r border-black p-1 text-center">Physique<br/>Ratings</div>
                  <div className="border-r border-black p-1 text-center">BMR</div>
                  <div className="border-r border-black p-1 text-center">Basal<br/>Metabolic<br/>Age</div>
                  <div className="border-r border-black p-1 text-center">Bone<br/>Mass</div>
                  <div className="p-1 text-center">Visceral<br/>Fat</div>
                </div>

                <div className="grid grid-cols-11 text-xs border-b border-black bg-gray-50">
                  <div className="border-r border-black p-1 text-center text-xs">Your next<br/>appoint-<br/>ment</div>
                  <div className="border-r border-black p-1 text-center">Height<br/>cm</div>
                  <div className="border-r border-black p-1 text-center">Weight<br/>KG</div>
                  <div className="border-r border-black p-1 flex justify-center items-center">
                    <img src={bodyFatRangeIcon} alt="Body fat range" className="h-9 w-9 object-contain" />
                  </div>
                  <div className="border-r border-black p-1 flex justify-center items-center">
                    <img src={bodyWaterRangeIcon} alt="Body water range" className="h-9 w-9 object-contain" />
                  </div>
                  <div className="border-r border-black p-1 flex justify-center items-center">
                    <img src={muscleMassIcon} alt="Muscle mass" className="h-9 w-9 object-contain" />
                  </div>
                  <div className="border-r border-black p-1 flex justify-center items-center">
                    <img src={physiqueRatingsIcon} alt="Physique ratings" className="h-9 w-9 object-contain" />
                  </div>
                  <div className="border-r border-black p-1 flex justify-center items-center">
                    <img src={basalMetabolicAgeIcon} alt="Basal metabolic rate" className="h-9 w-9 object-contain" />
                  </div>
                  <div className="border-r border-black p-1 flex justify-center items-center">
                    <img src={basalMetabolicAgeIcon} alt="Basal metabolic age" className="h-9 w-9 object-contain" />
                  </div>
                  <div className="border-r border-black p-1 flex justify-center items-center">
                    <img src={boneMassIcon} alt="Bone mass" className="h-9 w-9 object-contain" />
                  </div>
                  <div className="p-1 flex justify-center items-center">
                    <img src={visceralFatIcon} alt="Visceral fat" className="h-9 w-9 object-contain" />
                  </div>
                </div>

                {appointments.map((apt, idx) => (
                  <div key={idx} className="grid grid-cols-11 text-xs border-b border-gray-300">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      className="border-r border-black p-0.5 text-center w-full text-xs bg-white relative z-10 pointer-events-auto"
                      value={apt.age}
                      onChange={(e) => updateAppointment(idx, "age", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.height}
                      onChange={(e) => updateAppointment(idx, "height", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.weight}
                      onChange={(e) => updateAppointment(idx, "weight", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.bodyFat}
                      onChange={(e) => updateAppointment(idx, "bodyFat", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.water}
                      onChange={(e) => updateAppointment(idx, "water", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.muscle}
                      onChange={(e) => updateAppointment(idx, "muscle", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.physique}
                      onChange={(e) => updateAppointment(idx, "physique", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.bmr}
                      onChange={(e) => updateAppointment(idx, "bmr", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.basal}
                      onChange={(e) => updateAppointment(idx, "basal", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.bone}
                      onChange={(e) => updateAppointment(idx, "bone", e.target.value)}
                    />
                    <input
                      className="p-0.5 text-center w-full text-xs"
                      value={apt.visceral}
                      onChange={(e) => updateAppointment(idx, "visceral", e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto mb-[4px] text-xs">
              <table className="eval-table w-full" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "16.66%" }} />
                  <col style={{ width: "16.66%" }} />
                  <col style={{ width: "16.66%" }} />
                  <col style={{ width: "16.66%" }} />
                  <col style={{ width: "16.66%" }} />
                  <col style={{ width: "16.66%" }} />
                </colgroup>
                <tbody>
                  <tr>
                    <th className="bg-grey font-bold text-left pl-2">Evaluation</th>
                    <th className="font-normal">Excellent</th>
                    <th className="font-normal">Good</th>
                    <th className="font-normal">Medium</th>
                    <th className="font-normal">Bad</th>
                    <th className="font-normal">Alarming</th>
                  </tr>
                  {[
                    { key: "bodyFat", label: "Body Fat" },
                    { key: "bodyWater", label: "Body Water" },
                    { key: "muscleMass", label: "Muscle Mass" },
                    { key: "visceralFat", label: "Visceral Fat" },
                    { key: "questionnaire", label: "Questionnaire" }
                  ].map((row) => (
                    <tr key={row.key}>
                      <td className="bg-grey">{row.label}</td>
                      {[
                        { value: "excellent", className: "bg-excellent" },
                        { value: "good", className: "bg-good" },
                        { value: "medium", className: "bg-medium" },
                        { value: "bad", className: "bg-bad" },
                        { value: "alarming", className: "bg-alarming" }
                      ].map((option) => (
                        <td key={option.value} className={option.className}>
                          <input
                            type="radio"
                            name={`evaluation-${row.key}`}
                            checked={evaluation[row.key] === option.value}
                            onChange={() => updateEvaluation(row.key, option.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col h-full order-1 xl:order-1 print-col print-break">
            <div className="border-2 border-black mb-3">
              <div className="p-2 flex items-center gap-2 text-sm font-normal">
                <img src={bodyFatRangeIcon} alt="Body fat range" className="h-9 w-9 object-contain" />
                <span className="font-bold">Body Fat Range:</span>
              </div>

              <div className="overflow-x-auto print-fit-table phone-fit-table">
                <table className="w-full min-w-[520px] text-[9px] border-collapse text-center mb-2">
                  <thead>
                    <tr className="font-bold" style={{ background: "#ffff99" }}>
                      <th className="border border-black p-1" colSpan="4">Women</th>
                      <th className="border border-black p-1">AGE</th>
                      <th className="border border-black p-1" colSpan="4">Men</th>
                    </tr>
                    <tr className="text-[8px] font-medium">
                      <th className="border border-black p-1 font-normal">Excellent</th>
                      <th className="border border-black p-1 font-normal">Healthy</th>
                      <th className="border border-black p-1 font-normal">Medium</th>
                      <th className="border border-black p-1 font-normal">Obese</th>
                      <th className="border border-black p-1 font-normal" style={{ background: "#ffff99" }}></th>
                      <th className="border border-black p-1 font-normal">Excellent</th>
                      <th className="border border-black p-1 font-normal">Healthy</th>
                      <th className="border border-black p-1 font-normal">Medium</th>
                      <th className="border border-black p-1 font-normal">Obese</th>
                    </tr>
                  </thead>
                  <tbody className="font-medium">
                    <tr>
                      <td className="border border-black p-1">18.2</td>
                      <td className="border border-black p-1">22.1</td>
                      <td className="border border-black p-1">25.0</td>
                      <td className="border border-black p-1">&gt; 29.6</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>20 - 24</td>
                      <td className="border border-black p-1">10.8</td>
                      <td className="border border-black p-1">14.9</td>
                      <td className="border border-black p-1">19.0</td>
                      <td className="border border-black p-1">&gt; 23.3</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">18.9</td>
                      <td className="border border-black p-1">22.0</td>
                      <td className="border border-black p-1">25.4</td>
                      <td className="border border-black p-1">&gt; 29.8</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>25 - 29</td>
                      <td className="border border-black p-1">12.8</td>
                      <td className="border border-black p-1">16.5</td>
                      <td className="border border-black p-1">20.3</td>
                      <td className="border border-black p-1">&gt; 24.3</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">19.7</td>
                      <td className="border border-black p-1">22.7</td>
                      <td className="border border-black p-1">26.4</td>
                      <td className="border border-black p-1">&gt; 30.5</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>30 - 34</td>
                      <td className="border border-black p-1">14.5</td>
                      <td className="border border-black p-1">18.0</td>
                      <td className="border border-black p-1">21.5</td>
                      <td className="border border-black p-1">&gt; 25.2</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">21.1</td>
                      <td className="border border-black p-1">24.0</td>
                      <td className="border border-black p-1">27.7</td>
                      <td className="border border-black p-1">&gt; 31.5</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>35 - 39</td>
                      <td className="border border-black p-1">16.1</td>
                      <td className="border border-black p-1">19.3</td>
                      <td className="border border-black p-1">22.6</td>
                      <td className="border border-black p-1">&gt; 26.1</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">22.6</td>
                      <td className="border border-black p-1">25.6</td>
                      <td className="border border-black p-1">29.3</td>
                      <td className="border border-black p-1">&gt; 32.8</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>40 - 44</td>
                      <td className="border border-black p-1">17.5</td>
                      <td className="border border-black p-1">20.5</td>
                      <td className="border border-black p-1">23.6</td>
                      <td className="border border-black p-1">&gt; 26.9</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">24.3</td>
                      <td className="border border-black p-1">27.3</td>
                      <td className="border border-black p-1">30.9</td>
                      <td className="border border-black p-1">&gt; 34.1</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>45 - 49</td>
                      <td className="border border-black p-1">18.6</td>
                      <td className="border border-black p-1">21.5</td>
                      <td className="border border-black p-1">24.5</td>
                      <td className="border border-black p-1">&gt; 27.6</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">25.2</td>
                      <td className="border border-black p-1">28.2</td>
                      <td className="border border-black p-1">31.8</td>
                      <td className="border border-black p-1">&gt; 35.1</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>50 - 54</td>
                      <td className="border border-black p-1">19.2</td>
                      <td className="border border-black p-1">22.1</td>
                      <td className="border border-black p-1">25.1</td>
                      <td className="border border-black p-1">&gt; 28.2</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">26.6</td>
                      <td className="border border-black p-1">29.7</td>
                      <td className="border border-black p-1">33.1</td>
                      <td className="border border-black p-1">&gt; 36.2</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>55 - 59</td>
                      <td className="border border-black p-1">19.8</td>
                      <td className="border border-black p-1">22.7</td>
                      <td className="border border-black p-1">25.6</td>
                      <td className="border border-black p-1">&gt; 28.7</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">27.4</td>
                      <td className="border border-black p-1">30.7</td>
                      <td className="border border-black p-1">34.0</td>
                      <td className="border border-black p-1">&gt; 37.3</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>60 +</td>
                      <td className="border border-black p-1">20.2</td>
                      <td className="border border-black p-1">23.3</td>
                      <td className="border border-black p-1">26.2</td>
                      <td className="border border-black p-1">&gt; 29.3</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-2 text-xs">
                <p className="mb-1 leading-tight">For Sports people (measured in athletic modus) with a minimum training from 10 hours a week the Index is valid: Women 11 to 18 % / Men: 5 to 15%</p>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-xs italic">(University of Cambridge, 1999)</p>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                      <span className="font-bold">-</span>
                      <span className="border border-black px-3 py-1 text-xs">Under</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-bold">0</span>
                      <span className="border border-black px-3 py-1 text-xs">Healthy</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-bold">+</span>
                      <span className="border border-black px-3 py-1 text-xs">Over</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-bold">++</span>
                      <span className="border border-black px-3 py-1 text-xs">Obese</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-2 border-black mb-3">
              <div className="p-2 flex items-center gap-2 text-sm font-normal">
                <img src={bodyWaterRangeIcon} alt="Body water range" className="h-9 w-9 object-contain" />
                <span className="font-bold">Water Index:</span>
              </div>
              <div className="p-3 text-[10px]">
                <div className="flex justify-between mb-1 font-semibold text-[9px] pl-[68px]">
                  <span>30%</span><span>40%</span><span>50%</span><span>60%</span><span>70%</span><span>80%</span><span>90%</span>
                </div>
                <div className="mb-1 text-[8px] text-[#0b2d5c] font-bold">WHO 2001</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-[60px] font-semibold">Women</div>
                  <div className="relative h-[10px] flex-1 border border-gray-300">
                    <div
                      className="h-full w-full"
                      style={{
                        background: "repeating-linear-gradient(90deg, #99ccff, #99ccff 2px, #fff 2px, #fff 4px)"
                      }}
                    />
                    <div className="absolute top-0 h-full bg-black" style={{ left: "33.33%", width: "6.67%" }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-[60px] font-semibold">Men</div>
                  <div className="relative h-[10px] flex-1 border border-gray-300">
                    <div
                      className="h-full w-full"
                      style={{
                        background: "repeating-linear-gradient(90deg, #99ccff, #99ccff 2px, #fff 2px, #fff 4px)"
                      }}
                    />
                    <div className="absolute top-0 h-full bg-black" style={{ left: "50%", width: "8.33%" }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-[60px] font-semibold">Children</div>
                  <div className="relative h-[10px] flex-1 border border-gray-300">
                    <div
                      className="h-full w-full"
                      style={{
                        background: "repeating-linear-gradient(90deg, #99ccff, #99ccff 2px, #fff 2px, #fff 4px)"
                      }}
                    />
                    <div className="absolute top-0 h-full bg-black" style={{ left: "58.33%", width: "16.67%" }} />
                  </div>
                </div>
              </div>
            </div>

              <div className="border-2 border-black flex-1 flex flex-col">
              <div className="p-2 flex items-center gap-2 text-sm font-normal">
                <img src={muscleMassIcon} alt="Muscle mass" className="h-9 w-9 object-contain" />
                <span className="font-bold">Muscle Index & Physique Ratings:</span>
              </div>
              <div className="p-3 text-xs muscle-section">
                <p className="mb-2">The Muscle Index is given in Kg, the value belonging to it is the Physique Ratings:</p>
                <div className="rating-box">
                  <div className="rating-columns">
                    <div className="col-red">
                      <div style={{ borderBottom: "1px solid #000", marginBottom: "2px" }}>Obese, Untrained</div>
                      1 Hidden Obese<br/>
                      2 Obese<br/>
                      <span style={{ color: "#b35a00" }}>3 Solidly-built</span>
                    </div>
                    <div className="col-green">
                      <div style={{ borderBottom: "1px solid #000", marginBottom: "2px", color: "#a00" }}>Normal</div>
                      <span style={{ color: "#e6c600" }}>4 Under Exercised</span><br/>
                      5 Standard<br/>
                      <span style={{ color: "#1f7a1f" }}>6 Standard Muscular</span>
                    </div>
                    <div className="col-black" style={{ color: "#a00" }}>
                      <div style={{ borderBottom: "1px solid #000", marginBottom: "2px" }}>Excellent</div>
                      <span style={{ color: "#1f7a1f" }}>7 Thin</span><br/>
                      <span style={{ color: "#1f7a1f" }}>8 Thin & Muscular</span><br/>
                      <span style={{ color: "#0f5a0f" }}>9 Very Muscular</span>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: "11px", textAlign: "justify" }}>
                  <strong>Why is monitoring Muscle Mass important?</strong> For every extra Kg of muscle gained the body uses approximately 100 extra calories a day. Everybody who experiences a change in the muscle mass should monitor and adapt the calorie intake accordingly. Because muscle is denser than fat, monitoring your muscle mass gives you a more accurate understanding of your overall body compositions and changes in your total body weight.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      

      <style>{`
        html, body, #root {
          height: auto;
          overflow-y: auto;
        }
        .page-break,
        .max-w-7xl,
        .max-w-4xl,
        .bg-gray-100 {
          overflow: visible;
        }
        @media print {
          @page {
            size: portrait;
            margin: 10mm;
          }
          .print-split {
            display: flex !important;
            flex-direction: column;
          }
          .print-col {
            width: 100% !important;
          }
          .print-break {
            break-after: page;
            page-break-after: always;
          }
          .page-break {
            break-after: auto;
            page-break-after: auto;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print-fit-table {
            overflow: visible !important;
          }
          .print-min-w-0 {
            min-width: 0 !important;
          }
        }
        @media print and (orientation: landscape) {
          @page {
            size: landscape;
            margin: 8mm;
          }
          .print-split {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .print-break {
            break-after: auto;
            page-break-after: auto;
          }
        }
        .tight-print {
          line-height: 1.2;
        }
        .tight-print .mb-4 {
          margin-bottom: 8px;
        }
        .tight-print .mb-3 {
          margin-bottom: 6px;
        }
        .tight-print .mb-2 {
          margin-bottom: 4px;
        }
        @media (max-width: 1023px) {
          .print-split {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .print-col {
            width: 100%;
          }
          .print-break {
            margin-bottom: 16px;
          }
          .cover-shell {
            height: auto;
          }
          .cover-layer {
            position: static;
          }
          .phone-fit-table {
            overflow: visible;
          }
          .phone-fit-table table {
            min-width: 0;
            width: 100%;
            font-size: 9px;
          }
          .phone-fit-inner {
            min-width: 0;
            width: 100%;
          }
          .phone-fit-inner .grid {
            grid-template-columns: repeat(11, minmax(0, 1fr));
          }
          .phone-fit-inner .grid > div,
          .phone-fit-inner input {
            font-size: 9px;
            padding: 2px;
            line-height: 1.2;
          }
        }
        .muscle-section { font-size: 10px; line-height: 1.3; }
        .rating-box { border: 2px solid #a00; padding: 5px; margin: 5px 0; }
        .rating-columns { display: flex; justify-content: space-between; gap: 8px; }
        .col-red { color: #a00; font-weight: bold; }
        .col-green { color: green; font-weight: bold; }
        .col-black { color: black; font-weight: bold; }
        table.eval-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
        table.eval-table th, table.eval-table td { border: 1px solid #000; text-align: center; padding: 4px; }
        .bg-grey { background: transparent; font-weight: normal; }
        .bg-excellent { background: #ffff99; }
        .bg-good { background: #ffcc99; }
        .bg-medium { background: #ff9966; }
        .bg-bad { background: #ff6666; }
        .bg-alarming { background: #cc0000; color: white; }
        .eval-table input[type="radio"],
        .eval-table input[type="checkbox"] {
          accent-color: #000;
        }
      `}</style>

      <div className="flex flex-wrap justify-center gap-3 p-4 print:hidden">
        <button
          onClick={() => dispatch({ type: "CLEAR" })}
          className="px-4 py-2 rounded border text-sm font-semibold bg-white hover:bg-gray-100"
        >
          Add New Client
        </button>
        <button
          onClick={() => dispatch({ type: "UNDO" })}
          disabled={!canUndo}
          className={`px-4 py-2 rounded border text-sm font-semibold ${
            canUndo ? "bg-white hover:bg-gray-100" : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Undo
        </button>
        <button
          onClick={() => dispatch({ type: "REDO" })}
          disabled={!canRedo}
          className={`px-4 py-2 rounded border text-sm font-semibold ${
            canRedo ? "bg-white hover:bg-gray-100" : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Redo
        </button>
        <button
          onClick={exportToPDF}
          className="bg-[#2f4f1f] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#243c18]"
        >
          <Download size={20} />
          Export as PDF
        </button>
        <button
          onClick={handleSharePdf}
          className="bg-[#2f4f1f] text-white px-4 py-2 rounded hover:bg-[#243c18]"
        >
          Share PDF
        </button>
        <button
          onClick={handleSave}
          className="bg-[#2f4f1f] text-white px-4 py-2 rounded hover:bg-[#243c18]"
        >
          Save
        </button>
      </div>
        </>
      ) : null}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<WellnessForm />);

