"use client";
import { useEffect, useState } from "react";
import ModalFrame from "./ModalFrame";
type User = {
  id: string;
  name: string;
  phone: string;
  role: "staff" | "maintenance";
  approvalStatus: "pending" | "approved" | "removed";
};
export default function UserManagement({
  language,
  onClose,
}: {
  language: "en" | "es";
  onClose: () => void;
}) {
  const es = language === "es";
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [confirm, setConfirm] = useState<User | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    fetch("/api/users", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return (await r.json()) as { users: User[] };
      })
      .then((data) => {
        if (active) {
          setUsers(data.users);
          setError("");
        }
      })
      .catch(() => {
        if (active)
          setError(
            es
              ? "No se pudieron cargar los usuarios. Reintente."
              : "Users could not be loaded. Please retry.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh, es]);
  async function update(user: User, action: "approve" | "remove" | "restore") {
    if (busy) return;
    setBusy(user.id);
    setError("");
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          action,
          expectedStatus: user.approvalStatus,
        }),
      });
      if (!response.ok) throw new Error();
      setConfirm(null);
      setRefresh((v) => v + 1);
    } catch {
      setError(
        es
          ? "No se guardó el cambio. Actualice y reintente."
          : "The change was not saved. Refresh and try again.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <ModalFrame
      className="users-modal"
      titleId="users-title"
      onClose={onClose}
      busy={Boolean(busy)}
    >
      <header className="modal-header">
        <div>
          <p className="eyebrow">{es ? "Administración" : "Administration"}</p>
          <h2 id="users-title">
            {es ? "Administrar usuarios" : "Manage users"}
          </h2>
        </div>
        <button
          className="close-button"
          disabled={Boolean(busy)}
          onClick={onClose}
          aria-label={es ? "Cerrar" : "Close"}
        >
          ×
        </button>
      </header>
      <div className="users-body">
        <p className="muted">
          {es
            ? "Solo usted puede aprobar usuarios. Retirar el acceso cierra sus sesiones y conserva el historial de reparaciones."
            : "Only you can approve users. Removing access signs them out and preserves the repair history."}
        </p>
        <button
          className="secondary-button"
          disabled={Boolean(busy)}
          onClick={() => setRefresh((v) => v + 1)}
        >
          {es ? "Actualizar lista" : "Refresh list"}
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}{" "}
            <button
              className="text-button"
              onClick={() => setRefresh((v) => v + 1)}
            >
              {es ? "Actualizar" : "Refresh"}
            </button>
          </p>
        )}
        {loading ? (
          <p role="status">{es ? "Cargando…" : "Loading…"}</p>
        ) : (
          (["pending", "approved", "removed"] as const).map((status) => (
            <section key={status} className="user-group">
              <h3>
                {status === "pending"
                  ? es
                    ? "Pendientes de aprobación"
                    : "Pending approval"
                  : status === "approved"
                    ? es
                      ? "Usuarios aprobados"
                      : "Approved users"
                    : es
                      ? "Acceso retirado"
                      : "Removed access"}{" "}
                <span>
                  ({users.filter((u) => u.approvalStatus === status).length})
                </span>
              </h3>
              {users.filter((u) => u.approvalStatus === status).length ===
                0 && (
                <p className="muted">
                  {es
                    ? "No hay usuarios en esta sección."
                    : "No users in this section."}
                </p>
              )}
              {users
                .filter((u) => u.approvalStatus === status)
                .map((user) => (
                  <div className="user-row" key={user.id}>
                    <div>
                      <strong>{user.name}</strong>
                      <small>
                        {user.phone} ·{" "}
                        {user.role === "maintenance"
                          ? es
                            ? "Mantenimiento"
                            : "Maintenance"
                          : es
                            ? "Personal"
                            : "Staff"}
                      </small>
                    </div>
                    <div className="user-actions">
                      {status === "pending" && (
                        <button
                          className="primary-button"
                          disabled={Boolean(busy)}
                          onClick={() => void update(user, "approve")}
                        >
                          {es ? "Aprobar" : "Approve"}
                        </button>
                      )}
                      {status !== "removed" ? (
                        <button
                          className="secondary-button"
                          disabled={Boolean(busy)}
                          onClick={() => setConfirm(user)}
                        >
                          {es ? "Retirar acceso" : "Remove access"}
                        </button>
                      ) : (
                        <button
                          className="secondary-button"
                          disabled={Boolean(busy)}
                          onClick={() => void update(user, "restore")}
                        >
                          {es ? "Restaurar acceso" : "Restore access"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </section>
          ))
        )}
      </div>
      {confirm && (
        <ModalFrame
          className="confirm-modal"
          titleId="remove-title"
          onClose={() => setConfirm(null)}
          busy={Boolean(busy)}
        >
          <div className="users-body">
            <h2 id="remove-title">
              {es ? "¿Retirar acceso?" : "Remove access?"}
            </h2>
            <p>
              {confirm.name}{" "}
              {es
                ? "perderá acceso al app de inmediato. Puede restaurarlo más adelante."
                : "will lose access to the app immediately. You can restore access later."}
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="user-actions">
              <button
                className="secondary-button"
                disabled={Boolean(busy)}
                onClick={() => setConfirm(null)}
              >
                {es ? "Cancelar" : "Cancel"}
              </button>
              <button
                className="primary-button"
                disabled={Boolean(busy)}
                onClick={() => void update(confirm, "remove")}
              >
                {es ? "Retirar acceso" : "Remove access"}
              </button>
            </div>
          </div>
        </ModalFrame>
      )}
    </ModalFrame>
  );
}
