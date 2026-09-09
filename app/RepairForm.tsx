"use client";
import { useRef, useState, type FormEvent } from "react";
import PhotoPicker from "./PhotoPicker";
import type { Issue, Account } from "./FyxinnQuick";
export default function RepairForm({
  issue,
  account,
  language,
  onSaved,
  onBusy,
}: {
  issue: Issue;
  account: Account;
  language: "en" | "es";
  onSaved: (issue: Issue) => void;
  onBusy: (busy: boolean) => void;
}) {
  const es = language === "es";
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<(File | null)[]>([null, null, null]);
  const [processing, setProcessing] = useState([false, false, false]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(crypto.randomUUID());
  const processingRef = useRef([false, false, false]);
  const busy = saving || processing.some(Boolean);
  function photoBusy(index: number, value: boolean) {
    const next = processingRef.current.map((x, i) => (i === index ? value : x));
    processingRef.current = next;
    setProcessing(next);
    onBusy(saving || next.some(Boolean));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (comment.trim().length < 8 || photos.some((p) => !p)) {
      setError(
        es
          ? "Agregue un comentario de al menos 8 caracteres y las 3 fotos de la reparación."
          : "Add a repair comment of at least 8 characters and all 3 repair photos.",
      );
      return;
    }
    setSaving(true);
    onBusy(true);
    try {
      let updated: Issue;
      if (account.demo) {
        const urls = await Promise.all(
          photos.map(
            (file) =>
              new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = reject;
                reader.readAsDataURL(file!);
              }),
          ),
        );
        const now = new Date().toISOString();
        updated = {
          ...issue,
          status: "awaiting-review",
          updatedAt: now,
          latestSubmissionId: requestId.current,
          repairs: [
            {
              id: requestId.current,
              comment: comment.trim(),
              submittedBy: account.name,
              submittedAt: now,
              reviewStatus: "pending",
              reviewNote: null,
              reviewedBy: null,
              reviewedAt: null,
              photos: urls,
            },
            ...(issue.repairs ?? []),
          ],
          updates: [
            ...(issue.updates ?? []),
            {
              status: "awaiting-review",
              actorName: account.name,
              createdAt: now,
              note: comment.trim(),
            },
          ],
        };
      } else {
        const data = new FormData();
        data.set("requestId", requestId.current);
        data.set("issueId", issue.id);
        data.set("expectedUpdatedAt", issue.updatedAt);
        data.set("comment", comment.trim());
        photos.forEach((p) => data.append("photos", p!));
        const response = await fetch("/api/repairs", {
          method: "POST",
          body: data,
        });
        if (!response.ok)
          throw new Error(response.status === 409 ? "conflict" : "save");
        updated = ((await response.json()) as { issue: Issue }).issue;
      }
      onBusy(false);
      onSaved(updated);
    } catch (reason) {
      setError(
        (reason as Error).message === "conflict"
          ? es
            ? "El ticket cambió. Cierre y vuelva a abrirlo para revisar su estado."
            : "This ticket changed. Close and reopen it to review its status."
          : es
            ? "No se envió la reparación. Sus fotos y comentario siguen aquí; reintente."
            : "The repair was not submitted. Your photos and comment are still here; please retry.",
      );
      setSaving(false);
      onBusy(false);
    }
  }
  return (
    <form className="repair-form" onSubmit={submit}>
      <h4>{es ? "Finalizar reparación" : "Finish repair"}</h4>
      <p className="muted">
        {es
          ? "Agregue 3 fotos del trabajo terminado y explique la reparación. El administrador revisará el ticket antes de completarlo."
          : "Add 3 photos of the finished work and explain the repair. The administrator will review the ticket before completing it."}
      </p>
      <label className="description-field">
        <span>{es ? "Comentario de la reparación" : "Repair comment"} *</span>
        <textarea
          value={comment}
          disabled={busy}
          maxLength={1000}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            es
              ? "¿Qué se reparó y cómo se comprobó?"
              : "What was repaired and how was it checked?"
          }
        />
      </label>
      <div className="photos-head">
        <strong>{es ? "Fotos de la reparación" : "Repair photos"} *</strong>
        <span>{photos.filter(Boolean).length}/3</span>
      </div>
      <div className="photo-grid">
        {photos.map((file, index) => (
          <PhotoPicker
            key={index}
            language={language}
            index={index}
            file={file}
            disabled={saving}
            onChange={(file) =>
              setPhotos((previous) =>
                previous.map((p, i) => (i === index ? file : p)),
              )
            }
            onBusy={(value) => photoBusy(index, value)}
          />
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="primary-button" type="submit" disabled={busy}>
        {saving
          ? es
            ? "Enviando…"
            : "Submitting…"
          : es
            ? "Marcar terminado y enviar a revisión"
            : "Mark finished & submit for review"}
      </button>
    </form>
  );
}
