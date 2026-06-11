import { X } from "lucide-react";
import { theme } from "../theme";

const PRIMARY   = theme.primary;
const SECONDARY = theme.secondary;

interface Props {
  value: string;
  label?: string;
  onChange: (val: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function NumericKeyboard({ value, label, onChange, onConfirm, onClose }: Props) {
  const display = value === "-1.000" ? "" : value;

  const pushDigit = (d: string) => {
    if (value === "-1.000" || value === "") {
      onChange(d);
    } else {
      if (value.length >= 10) return;
      onChange(value + d);
    }
  };

  const pushDot = () => {
    if (value === "-1.000" || value === "") { onChange("0."); return; }
    if (!value.includes(".")) onChange(value + ".");
  };

  const pushBack = () => {
    if (value === "-1.000" || value === "" || value.length <= 1) { onChange(""); return; }
    onChange(value.slice(0, -1));
  };

  const pushMinusOne = () => onChange("-1.000");

  type BtnKind = "num" | "back" | "minusone" | "ok";

  const bg: Record<BtnKind, string> = {
    num:      "rgb(243 244 246)",
    back:     "rgb(254 243 199)",
    minusone: "rgb(254 226 226)",
    ok:       SECONDARY,
  };
  const fg: Record<BtnKind, string> = {
    num:      "rgb(17 24 39)",
    back:     "rgb(180 83 9)",
    minusone: "rgb(185 28 28)",
    ok:       "white",
  };

  const buttons: { label: string; onPress: () => void; kind: BtnKind; span?: number }[] = [
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
    { label: "OK", onPress: onConfirm,             kind: "ok" },
    { label: "0",  onPress: () => pushDigit("0"), kind: "num", span: 2 },
    { label: ".",  onPress: pushDot,               kind: "num" },
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
          <span
            className="text-sm font-semibold truncate flex-1 mr-2"
            style={{ color: PRIMARY }}
          >
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
          className="rounded-2xl px-5 py-4 mb-4 text-right"
          style={{
            backgroundColor: "rgb(249 250 251)",
            border: `2px solid ${display ? PRIMARY : "rgb(229 231 235)"}`,
          }}
        >
          <div
            className="font-bold leading-none"
            style={{
              fontSize: display.length > 8 ? "1.8rem" : "2.5rem",
              color: display ? PRIMARY : "rgb(209 213 219)",
            }}
          >
            {display || "0"}
          </div>
        </div>

        {/* Dugmad */}
        <div className="grid grid-cols-4 gap-2.5">
          {buttons.map(({ label: btn, onPress, kind, span }, i) => (
            <button
              key={i}
              onPointerDown={(e) => { e.preventDefault(); onPress(); }}
              className="flex items-center justify-center rounded-2xl font-bold active:scale-95 transition-transform select-none"
              style={{
                backgroundColor: bg[kind],
                color: fg[kind],
                fontSize: kind === "ok" || kind === "minusone" ? "1.1rem" : "1.35rem",
                height: "3.75rem",
                gridColumn: span ? `span ${span}` : undefined,
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
