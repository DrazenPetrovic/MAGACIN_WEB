import { useState } from "react";
import { X } from "lucide-react";
import { theme } from "../theme";

const PRIMARY   = theme.primary;
const SECONDARY = theme.secondary;

interface Props {
  value: string;
  label?: string;
  onChange: (val: string) => void;
  onConfirm: (val?: string) => void;
  onClose: () => void;
}

export function NumericKeyboard({ value, label, onChange, onConfirm, onClose }: Props) {
  const [expr, setExpr] = useState<string>(
    value === "-1.000" || value === "" ? "" : value,
  );

  // ─── Dijelovi izraza ──────────────────────────────────────────────────────
  const lastPlusIdx = expr.lastIndexOf("+");
  const hasPlusOp   = lastPlusIdx >= 0;
  const currentPart = hasPlusOp ? expr.slice(lastPlusIdx + 1) : expr;

  // ─── Evaluacija ───────────────────────────────────────────────────────────
  const evaluate = (): string => {
    const cleaned = expr.endsWith("+") ? expr.slice(0, -1) : expr;
    if (!cleaned) return "-1.000";
    const parts = cleaned.split("+");
    const result = Math.round(parts.reduce((sum, p) => sum + (parseFloat(p) || 0), 0) * 1000) / 1000;
    return String(result);
  };

  // ─── Akcije tipki ─────────────────────────────────────────────────────────
  const pushDigit = (d: string) => {
    if (currentPart.replace(".", "").length >= 9) return;
    setExpr((e) => e + d);
  };

  const pushDot = () => {
    if (currentPart.includes(".")) return;
    setExpr((e) => (currentPart === "" ? e + "0." : e + "."));
  };

  const pushPlus = () => {
    if (!expr || expr === "" || expr.endsWith("+")) return;
    if (expr.endsWith(".")) { setExpr((e) => e.slice(0, -1) + "+"); return; }
    setExpr((e) => e + "+");
  };

  const pushBack = () => {
    setExpr((e) => (e.length <= 1 ? "" : e.slice(0, -1)));
  };

  const pushMinusOne = () => {
    setExpr("-1.000");
    onChange("-1.000");
  };

  const handleConfirm = () => {
    const result = evaluate();
    onChange(result);
    onConfirm(result);
  };

  // ─── Display ──────────────────────────────────────────────────────────────
  const isPreview  = hasPlusOp && !expr.endsWith("+");
  const preview    = isPreview ? `= ${evaluate()}` : "";
  const displayVal = expr || "";
  const fontSize   =
    displayVal.length > 24 ? "1.1rem" :
    displayVal.length > 18 ? "1.3rem" :
    displayVal.length > 14 ? "1.6rem" :
    displayVal.length > 10 ? "1.8rem" :
    displayVal.length > 6  ? "2rem"   : "2.4rem";

  // ─── Boje ─────────────────────────────────────────────────────────────────
  type BtnKind = "num" | "back" | "minusone" | "ok" | "plus" | "eq";
  const bg: Record<BtnKind, string> = {
    num:      "rgb(243 244 246)",
    back:     "rgb(254 243 199)",
    minusone: "rgb(254 226 226)",
    ok:       `${PRIMARY}22`,
    plus:     `${SECONDARY}33`,
    eq:       SECONDARY,
  };
  const fg: Record<BtnKind, string> = {
    num:      "rgb(17 24 39)",
    back:     "rgb(180 83 9)",
    minusone: "rgb(185 28 28)",
    ok:       PRIMARY,
    plus:     SECONDARY,
    eq:       "white",
  };

  const buttons: { label: string; onPress: () => void; kind: BtnKind }[] = [
    { label: "7",  onPress: () => pushDigit("7"), kind: "num" },
    { label: "8",  onPress: () => pushDigit("8"), kind: "num" },
    { label: "9",  onPress: () => pushDigit("9"), kind: "num" },
    { label: "⌫",  onPress: pushBack,             kind: "back" },
    { label: "4",  onPress: () => pushDigit("4"), kind: "num" },
    { label: "5",  onPress: () => pushDigit("5"), kind: "num" },
    { label: "6",  onPress: () => pushDigit("6"), kind: "num" },
    { label: "-1", onPress: pushMinusOne,          kind: "minusone" },
    { label: "1",  onPress: () => pushDigit("1"), kind: "num" },
    { label: "2",  onPress: () => pushDigit("2"), kind: "num" },
    { label: "3",  onPress: () => pushDigit("3"), kind: "num" },
    { label: "OK", onPress: handleConfirm,         kind: "ok" },
    { label: "0",  onPress: () => pushDigit("0"), kind: "num" },
    { label: ".",  onPress: pushDot,               kind: "num" },
    { label: "+",  onPress: pushPlus,              kind: "plus" },
    { label: "=",  onPress: handleConfirm,         kind: "eq" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full rounded-t-3xl shadow-2xl"
        style={{ padding: "1rem 1rem 0 1rem", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold truncate flex-1 mr-2" style={{ color: PRIMARY }}>
            {label || "Unos količine"}
          </span>
          <button
            onPointerDown={(e) => { e.preventDefault(); onClose(); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors flex-none"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Display */}
        <div
          className="rounded-2xl px-5 py-3 mb-4"
          style={{
            backgroundColor: "rgb(249 250 251)",
            border: `2px solid ${displayVal ? PRIMARY : "rgb(229 231 235)"}`,
            minHeight: "5rem",
          }}
        >
          {/* Izraz */}
          <div
            className="font-bold leading-tight text-right"
            style={{
              fontSize,
              color: displayVal ? PRIMARY : "rgb(209 213 219)",
              wordBreak: "break-all",
              whiteSpace: "normal",
            }}
          >
            {displayVal || "0"}
          </div>
          {/* Preview rezultata */}
          {preview && (
            <div
              className="text-right mt-1 font-semibold"
              style={{ fontSize: "1rem", color: SECONDARY }}
            >
              {preview}
            </div>
          )}
        </div>

        {/* Dugmad — 4 kolone, svaka iste širine */}
        <div className="grid grid-cols-4 gap-2.5">
          {buttons.map(({ label: btn, onPress, kind }, i) => (
            <button
              key={i}
              onPointerDown={(e) => { e.preventDefault(); onPress(); }}
              className="flex items-center justify-center rounded-2xl font-bold active:scale-95 transition-transform select-none"
              style={{
                backgroundColor: bg[kind],
                color: fg[kind],
                fontSize: kind === "ok" || kind === "minusone" ? "1rem" : kind === "plus" || kind === "eq" ? "1.4rem" : "1.35rem",
                height: "3.75rem",
              }}
            >
              {btn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
