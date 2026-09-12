import { cloneElement, useEffect, useId, useRef, type ReactElement, type ReactNode } from "react";
import type { Muscle } from "../contracts";

export const label = (value: string) => value.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase());
export function Icon({
  name,
  size = 20,
}: {
  readonly name: "grid" | "plan" | "settings" | "plus" | "arrow" | "search" | "close" | "swap" | "check";
  readonly size?: number;
}) {
  const paths = {
    grid: "M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z",
    plan: "M8 3h8v4H8zM6 5H4v16h16V5h-2M8 12h8M8 16h5",
    settings: "M4 7h16M4 17h16M8 4v6M16 14v6",
    plus: "M12 5v14M5 12h14",
    arrow: "M5 12h14M13 6l6 6-6 6",
    search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    close: "M6 6l12 12M6 18L18 6",
    swap: "M3 7h17l-4-4M21 17H4l4 4",
    check: "m5 12 4 4L19 6",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function MuscleMap({
  primary,
  large = false,
}: {
  readonly primary: readonly Muscle[];
  readonly large?: boolean;
}) {
  const active = (group: string) => (primary.some((muscle) => muscle === group) ? "muscle-active" : "");
  return (
    <svg className={`muscle-map ${large ? "large" : ""}`} viewBox="0 0 100 150" aria-hidden="true">
      <circle cx="50" cy="15" r="10" className="body-base" />
      <path
        className="body-base"
        d="M39 28h22l13 8 12 41-9 4-16-32 1 36-1 48-10 1-2-42-2 42-10-1-1-48 1-36-16 32-9-4 12-41z"
      />
      <path className={active("chest")} d="m38 34 11 2v16l-13-3zm13 2 11-2 2 15-13 3z" />
      <path className={active("shoulders")} d="m28 34 8-4-2 18-11 1zm36-4 8 4 5 15-11-1z" />
      <path className={active("biceps")} d="m24 51 9 1-7 17-7-2zm43 1 9-1 5 16-7 2z" />
      <path className={active("triceps")} d="m19 48 4 3-6 20-4-2zm58 3 4-3 6 21-4 2z" />
      <path className={active("core")} d="M39 55h9v10h-9zm13 0h9v10h-9zM40 68h8v11h-8zm12 0h8v11h-8z" />
      <path className={active("back")} d="m34 51 4 3 1 25-5-14zm28 3 4-3v14l-5 14z" />
      <path className={active("glutes")} d="M37 81h11v9H36zm15 0h11l1 9H52z" />
      <path className={active("quads")} d="m37 94 10 1-2 23-7-1zm16 1 10-1-1 23-7 1z" />
      <path className={active("hamstrings")} d="m34 92 3 2 1 22-4-1zm29 2 3-2v23l-4 1z" />
      <path className={active("calves")} d="m38 121 7 1-1 15-6-1zm17 1 7-1v15l-6 1z" />
      <path className={active("adductors")} d="m47 92 2 2-1 20-2-8zm4 2 2-2 1 14-2 8z" />
    </svg>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  readonly title: string;
  readonly children: ReactNode;
  readonly onClose: () => void;
  readonly wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "dialog wide" : "dialog"}
      aria-labelledby={id}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
        );
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        close.current();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close.current();
      }}
    >
      <div className="dialog-content">
        <header className="dialog-header">
          <h2 id={id}>{title}</h2>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
export function Field({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{title}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
export function Notice({ children, error = false }: { readonly children: ReactNode; readonly error?: boolean }) {
  return (
    <p className={`notice ${error ? "error" : ""}`} role={error ? "alert" : "status"}>
      {children}
    </p>
  );
}
