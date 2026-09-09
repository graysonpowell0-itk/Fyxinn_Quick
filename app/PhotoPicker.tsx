"use client";
import { useEffect, useRef, useState } from "react";
import ModalFrame from "./ModalFrame";
const words = {
  en: {
    photo: "Photo",
    camera: "Use camera",
    upload: "Choose photo",
    replace: "Replace photo",
    title: "Take a photo",
    capture: "Capture photo",
    retake: "Retake",
    use: "Use this photo",
    close: "Cancel",
    loading: "Starting camera…",
    denied:
      "Camera access was blocked. Allow camera access in your browser settings or choose a photo.",
    missing: "No camera is available. Connect a camera or choose a photo.",
    failed:
      "The camera could not start. Close other apps using it and try again, or choose a photo.",
    unsupported:
      "Live camera is unavailable in this browser. Open the device camera or choose a photo.",
    native: "Open device camera",
    invalid: "Choose a JPEG, PNG, or WebP photo under 20 MB.",
    processing: "Preparing photo…",
    decode: "This photo could not be opened. Try a different photo.",
    switch: "Switch camera",
  },
  es: {
    photo: "Foto",
    camera: "Usar cámara",
    upload: "Elegir foto",
    replace: "Cambiar foto",
    title: "Tomar una foto",
    capture: "Capturar foto",
    retake: "Volver a tomar",
    use: "Usar esta foto",
    close: "Cancelar",
    loading: "Iniciando cámara…",
    denied:
      "El acceso a la cámara está bloqueado. Permita el acceso en su navegador o elija una foto.",
    missing: "No hay cámara disponible. Conecte una cámara o elija una foto.",
    failed:
      "No se pudo iniciar la cámara. Cierre otras aplicaciones que la usan e inténtelo de nuevo, o elija una foto.",
    unsupported:
      "La cámara en vivo no está disponible en este navegador. Abra la cámara del dispositivo o elija una foto.",
    native: "Abrir cámara del dispositivo",
    invalid: "Elija una foto JPEG, PNG o WebP de menos de 20 MB.",
    processing: "Preparando foto…",
    decode: "No se pudo abrir esta foto. Pruebe con otra foto.",
    switch: "Cambiar cámara",
  },
};
async function preparePhoto(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(
      1,
      1600 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error();
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) throw new Error();
    return new File([blob], "repair-photo.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
export default function PhotoPicker({
  language,
  index,
  file,
  onChange,
  disabled,
  onBusy,
}: {
  language: "en" | "es";
  index: number;
  file: File | null;
  onChange: (file: File) => void;
  disabled: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const t = words[language];
  const [camera, setCamera] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const native = useRef<HTMLInputElement>(null);
  async function choose(photo?: File) {
    if (!photo) return;
    setError("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(photo.type) ||
      !photo.size ||
      photo.size > 20000000
    ) {
      setError(t.invalid);
      return;
    }
    setBusy(true);
    onBusy(true);
    try {
      onChange(await preparePhoto(photo));
    } catch {
      setError(t.decode);
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <div className="photo-choice">
      <div className={`photo-slot ${file ? "filled" : ""}`}>
        {file ? (
          <PhotoPreview file={file} alt={`${t.photo} ${index + 1}`} />
        ) : (
          <>
            <b aria-hidden="true">＋</b>
            <span>
              {t.photo} {index + 1}
            </span>
          </>
        )}
      </div>
      <button
        type="button"
        className="secondary-button photo-action"
        disabled={disabled || busy}
        onClick={() => setCamera(true)}
        aria-label={`${t.camera} ${index + 1}`}
      >
        {t.camera}
      </button>
      <button
        type="button"
        className="text-button photo-action"
        disabled={disabled || busy}
        onClick={() => input.current?.click()}
        aria-label={`${file ? t.replace : t.upload} ${index + 1}`}
      >
        {file ? t.replace : t.upload}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => {
          void choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={native}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          void choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {busy && <small role="status">{t.processing}</small>}
      {error && (
        <small className="form-error" role="alert">
          {error}
        </small>
      )}
      {camera && (
        <Camera
          language={language}
          onClose={() => setCamera(false)}
          onPhoto={(photo) => {
            setCamera(false);
            void choose(photo);
          }}
          onNative={() => {
            setCamera(false);
            native.current?.click();
          }}
          onUpload={() => {
            setCamera(false);
            input.current?.click();
          }}
        />
      )}
    </div>
  );
}
function Camera({
  language,
  onClose,
  onPhoto,
  onNative,
  onUpload,
}: {
  language: "en" | "es";
  onClose: () => void;
  onPhoto: (photo: File) => void;
  onNative: () => void;
  onUpload: () => void;
}) {
  const t = words[language];
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [capturing, setCapturing] = useState(false);
  useEffect(() => {
    if (photo) return;
    let cancelled = false;
    const stop = () => {
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
    };
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t.unsupported);
        return;
      }
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1600 },
            height: { ideal: 1200 },
          },
        });
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = media;
        const element = video.current;
        if (!element) {
          stop();
          return;
        }
        element.srcObject = media;
        await element.play();
        if (!cancelled) setReady(true);
      } catch (reason) {
        if (cancelled) return;
        stop();
        const name = (reason as DOMException).name;
        setError(
          name === "NotAllowedError" || name === "SecurityError"
            ? t.denied
            : name === "NotFoundError"
              ? t.missing
              : t.failed,
        );
      }
    }
    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [facing, photo, t]);
  async function capture() {
    const element = video.current;
    if (!element?.videoWidth || !ready || capturing) return;
    setCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = element.videoWidth;
      canvas.height = element.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      context.drawImage(element, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error();
      setPhoto(new File([blob], "camera-photo.jpg", { type: "image/jpeg" }));
    } catch {
      setError(t.failed);
    } finally {
      setCapturing(false);
    }
  }
  return (
    <ModalFrame
      className="camera-modal"
      titleId="camera-title"
      onClose={onClose}
    >
      <header className="modal-header">
        <h2 id="camera-title">{t.title}</h2>
        <button
          type="button"
          className="close-button"
          aria-label={t.close}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="camera-body">
        {photo ? (
          <PhotoPreview className="camera-preview" file={photo} alt={t.photo} />
        ) : (
          <video
            hidden={Boolean(error)}
            ref={video}
            className="camera-preview"
            autoPlay
            muted
            playsInline
          />
        )}
        {!ready && !photo && !error && <p role="status">{t.loading}</p>}
        {error && (
          <>
            <p role="alert" className="form-error">
              {error}
            </p>
            <div className="camera-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={onNative}
              >
                {t.native}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={onUpload}
              >
                {t.upload}
              </button>
            </div>
          </>
        )}
      </div>
      <footer className="modal-footer camera-actions">
        {photo ? (
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setReady(false);
                setError("");
                setPhoto(null);
              }}
            >
              {t.retake}
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => onPhoto(photo)}
            >
              {t.use}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="secondary-button"
              disabled={!ready || capturing}
              onClick={() => {
                setReady(false);
                setError("");
                setFacing(facing === "environment" ? "user" : "environment");
              }}
            >
              {t.switch}
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={!ready || capturing}
              onClick={() => void capture()}
            >
              {t.capture}
            </button>
          </>
        )}
      </footer>
    </ModalFrame>
  );
}

function PhotoPreview({file,alt,className}: {file:File;alt:string;className?:string}) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(()=>{const url=URL.createObjectURL(file);ref.current!.src=url;return()=>URL.revokeObjectURL(url);},[file]);
  return <img ref={ref} alt={alt} className={className}/>;
}
