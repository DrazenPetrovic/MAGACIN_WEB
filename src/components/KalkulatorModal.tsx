import { useState } from "react";
import { X, Mic } from "lucide-react";
import { theme } from "../theme";

interface ISpeechRec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
const getSpeechRecognition = (): (new () => ISpeechRec) | undefined => {
  const w = window as Window & {
    SpeechRecognition?: new () => ISpeechRec;
    webkitSpeechRecognition?: new () => ISpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

const PRIMARY   = theme.primary;
const SECONDARY = theme.secondary;

type BtnType = "num" | "op" | "eq" | "clear" | "back";
interface BtnCfg { label: string; onPress: () => void; type: BtnType; span?: number; }

const getBg = (type: BtnType) => {
  if (type === "op")    return PRIMARY;
  if (type === "eq")    return SECONDARY;
  if (type === "clear") return "rgb(254 226 226)";
  if (type === "back")  return "rgb(254 243 199)";
  return "rgb(243 244 246)";
};
const getFg = (type: BtnType) => {
  if (type === "op" || type === "eq") return "white";
  if (type === "clear") return "rgb(185 28 28)";
  if (type === "back")  return "rgb(180 83 9)";
  return "rgb(17 24 39)";
};

export function KalkulatorModal({ onClose }: { onClose: () => void }) {
  const [display,    setDisplay]    = useState("0");
  const [firstOp,    setFirstOp]    = useState<number | null>(null);
  const [pendingOp,  setPendingOp]  = useState<string | null>(null);
  const [fresh,      setFresh]      = useState(false);
  const [listening,  setListening]  = useState(false);

  const startVoice = () => {
    const SRCtor = getSpeechRecognition();
    if (!SRCtor) { alert("Preglednik ne podržava glasovni unos."); return; }
    const rec = new SRCtor();
    rec.lang = "bs-BA";
    rec.continuous = false;
    rec.interimResults = false;
    setListening(true);
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      const num = text.replace(",", ".").replace(/[^0-9.]/g, "");
      if (num && !isNaN(parseFloat(num))) {
        setDisplay(num);
        setFresh(false);
      }
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);
    rec.start();
  };

  const pushDigit = (d: string) => {
    if (fresh) { setDisplay(d); setFresh(false); }
    else setDisplay(p => p === "0" ? d : p.length < 13 ? p + d : p);
  };

  const pushDot = () => {
    if (fresh) { setDisplay("0."); setFresh(false); return; }
    setDisplay(p => p.includes(".") ? p : p + ".");
  };

  const compute = (a: number, b: number, o: string) =>
    o === "+" ? a + b : o === "-" ? a - b : a * b;

  const pushOp = (o: string) => {
    const val = parseFloat(display);
    if (firstOp !== null && !fresh) {
      const res = parseFloat(compute(firstOp, val, pendingOp!).toFixed(10));
      setDisplay(String(res));
      setFirstOp(res);
    } else {
      setFirstOp(val);
    }
    setPendingOp(o);
    setFresh(true);
  };

  const pushEq = () => {
    if (firstOp === null || pendingOp === null) return;
    const res = parseFloat(compute(firstOp, parseFloat(display), pendingOp).toFixed(10));
    setDisplay(String(res));
    setFirstOp(null);
    setPendingOp(null);
    setFresh(true);
  };

  const clear = () => { setDisplay("0"); setFirstOp(null); setPendingOp(null); setFresh(false); };
  const back  = () => setDisplay(p => p.length > 1 ? p.slice(0, -1) : "0");

  const buttons: BtnCfg[] = [
    { label: "C",  onPress: clear,                 type: "clear", span: 2 },
    { label: "⌫",  onPress: back,                  type: "back"  },
    { label: "×",  onPress: () => pushOp("*"),     type: "op"    },
    { label: "7",  onPress: () => pushDigit("7"),  type: "num"   },
    { label: "8",  onPress: () => pushDigit("8"),  type: "num"   },
    { label: "9",  onPress: () => pushDigit("9"),  type: "num"   },
    { label: "−",  onPress: () => pushOp("-"),     type: "op"    },
    { label: "4",  onPress: () => pushDigit("4"),  type: "num"   },
    { label: "5",  onPress: () => pushDigit("5"),  type: "num"   },
    { label: "6",  onPress: () => pushDigit("6"),  type: "num"   },
    { label: "+",  onPress: () => pushOp("+"),     type: "op"    },
    { label: "1",  onPress: () => pushDigit("1"),  type: "num"   },
    { label: "2",  onPress: () => pushDigit("2"),  type: "num"   },
    { label: "3",  onPress: () => pushDigit("3"),  type: "num"   },
    { label: "=",  onPress: pushEq,                type: "eq"    },
    { label: "0",  onPress: () => pushDigit("0"),  type: "num",  span: 3 },
    { label: ".",  onPress: pushDot,               type: "num"   },
  ];

  const opLabel = (o: string | null) => o === "*" ? "×" : o ?? "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full rounded-t-3xl shadow-2xl"
        style={{ padding: "1rem 1rem 0 1rem", paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Naslov + mic + X */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-bold" style={{ color: PRIMARY }}>Kalkulator</span>
          <div className="flex items-center gap-2">
            <button
              onClick={startVoice}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all active:scale-95"
              style={{
                backgroundColor: listening ? "rgb(254 226 226)" : `${PRIMARY}15`,
                color: listening ? "rgb(185 28 28)" : PRIMARY,
              }}
              title="Glasovni unos broja"
            >
              <Mic className={`w-4 h-4 ${listening ? "animate-pulse" : ""}`} />
              <span className="text-xs">{listening ? "Slušam..." : "Glasovni unos"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Displej */}
        <div
          className="rounded-2xl px-5 py-4 mb-4 text-right"
          style={{ backgroundColor: "rgb(249 250 251)", border: "2px solid rgb(229 231 235)" }}
        >
          <div className="h-5 flex items-center justify-end gap-1.5 text-sm text-gray-400 mb-1">
            {firstOp !== null && <span>{firstOp}</span>}
            {pendingOp && (
              <span className="font-bold" style={{ color: PRIMARY }}>
                {opLabel(pendingOp)}
              </span>
            )}
          </div>
          <div
            className="font-bold text-gray-900 leading-none truncate"
            style={{ fontSize: display.length > 10 ? "1.6rem" : display.length > 7 ? "2rem" : "2.5rem" }}
          >
            {display}
          </div>
        </div>

        {/* Grid tipki */}
        <div className="grid grid-cols-4 gap-2.5">
          {buttons.map(({ label, onPress, type, span }, i) => (
            <button
              key={i}
              onClick={onPress}
              className="flex items-center justify-center rounded-2xl font-bold active:scale-95 transition-transform select-none"
              style={{
                backgroundColor: getBg(type),
                color: getFg(type),
                fontSize: type === "back" ? "1.1rem" : "1.35rem",
                height: "3.75rem",
                gridColumn: span ? `span ${span}` : undefined,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
