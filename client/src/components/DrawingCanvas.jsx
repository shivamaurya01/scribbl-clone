
import { useEffect, useRef, useState } from "react";
import { socket } from "../socket";
import "./DrawingCanvas.css";

const W = 800;
const H = 600;

const COLORS = [
  "#000000", "#64748b", "#ffffff", "#7f1d1d",
  "#ef4444", "#f97316", "#facc15", "#84cc16",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  "#1d4ed8", "#6366f1", "#8b5cf6", "#a855f7",
  "#ec4899", "#f43f5e", "#92400e", "#a16207",
];

const SIZES = [
  { label: "XS", value: 2 },
  { label: "S", value: 4 },
  { label: "M", value: 8 },
  { label: "L", value: 16 },
  { label: "XL", value: 28 },
];

function paint(ctx, stroke) {
  if (!stroke?.points?.length) return;

  const [first, ...rest] = stroke.points;

  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (!rest.length) {
    ctx.beginPath();
    ctx.arc(
      first.x * W,
      first.y * H,
      stroke.size / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(first.x * W, first.y * H);

  rest.forEach((p) => {
    ctx.lineTo(p.x * W, p.y * H);
  });

  ctx.stroke();
}

export default function DrawingCanvas({ canDraw }) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const drawingRef = useRef(false);
  const canDrawRef = useRef(canDraw);

  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(8);
  const [eraser, setEraser] = useState(false);
  const [cursor, setCursor] = useState(null);

  const [showShortcuts, setShowShortcuts] = useState(false);

  const ctx = () => canvasRef.current?.getContext("2d");

  const redraw = () => {
    const context = ctx();
    if (!context) return;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, W, H);

    strokesRef.current.forEach((stroke) => {
      paint(context, stroke);
    });
  };

  const applyStart = (data) => {
    strokesRef.current.push({
      color: data.color,
      size: data.size,
      points: [{ x: data.x, y: data.y }],
    });

    paint(
      ctx(),
      strokesRef.current[strokesRef.current.length - 1]
    );
  };

  const applyMove = (data) => {
    const stroke =
      strokesRef.current[strokesRef.current.length - 1];

    if (!stroke) return;

    const previous = stroke.points[stroke.points.length - 1];

    stroke.points.push({
      x: data.x,
      y: data.y,
    });

    paint(ctx(), {
      color: stroke.color,
      size: stroke.size,
      points: [
        previous,
        { x: data.x, y: data.y },
      ],
    });
  };

  // SOCKET EVENTS
  useEffect(() => {
    redraw();

    const onData = (data) => {
      if (data.type === "start") {
        applyStart(data);
      }

      if (data.type === "move") {
        applyMove(data);
      }
    };

    const onClear = () => {
      strokesRef.current = [];
      redraw();
    };

    const onRedraw = ({ strokes: list }) => {
      strokesRef.current = Array.isArray(list) ? list : [];
      redraw();
    };

    socket.on("draw_data", onData);
    socket.on("canvas_clear", onClear);
    socket.on("canvas_redraw", onRedraw);

    return () => {
      socket.off("draw_data", onData);
      socket.off("canvas_clear", onClear);
      socket.off("canvas_redraw", onRedraw);
    };
  }, []);

  useEffect(() => {
    canDrawRef.current = canDraw;

    if (!canDraw && drawingRef.current) {
      drawingRef.current = false;
      socket.emit("draw_end");
    }
  }, [canDraw]);

  // POINTER POSITION
  const getPosition = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();

    return {
      x: Math.min(
        1,
        Math.max(0, (e.clientX - rect.left) / rect.width)
      ),
      y: Math.min(
        1,
        Math.max(0, (e.clientY - rect.top) / rect.height)
      ),
    };
  };

  const down = (e) => {
    if (!canDraw || drawingRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    e.preventDefault();

    canvasRef.current.setPointerCapture(e.pointerId);

    drawingRef.current = true;

    const data = {
      ...getPosition(e),
      color: eraser ? "#ffffff" : color,
      size: eraser ? size * 2 : size,
    };

    applyStart(data);
    socket.emit("draw_start", data);
  };

  const move = (e) => {
    if (!drawingRef.current) return;

    e.preventDefault();

    const position = getPosition(e);

    applyMove(position);
    socket.emit("draw_move", position);
  };

  const up = () => {
    if (!drawingRef.current) return;

    drawingRef.current = false;
    socket.emit("draw_end");
  };

  // TOOLS
  const selectColor = (selectedColor) => {
    setColor(selectedColor);
    setEraser(false);
  };

  const undo = () => {
    if (!canDrawRef.current) return;
    socket.emit("draw_undo");
  };

  const clear = () => {
    if (!canDrawRef.current) return;

    const confirmed = window.confirm(
      "Are you sure you want to clear the drawing?"
    );

    if (confirmed) {
      socket.emit("canvas_clear");
    }
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");

    link.download = "draw-and-guess.png";
    link.href = canvas.toDataURL("image/png");

    link.click();
  };

  // KEYBOARD SHORTCUTS
  useEffect(() => {
    const handleKey = (e) => {
      if (!canDrawRef.current) return;

      const target = e.target;

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && key === "z") {
        e.preventDefault();
        undo();
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (key === "b") setEraser(false);
      if (key === "e") setEraser(true);

      if (key === "[") {
        setSize((prev) => Math.max(2, prev - 2));
      }

      if (key === "]") {
        setSize((prev) => Math.min(40, prev + 2));
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  const activeColor = eraser ? "#ffffff" : color;
  const activeSize = eraser ? size * 2 : size;

  return (
    <div className="dc-studio">

      {/* CANVAS */}
      <div className="dc-canvas-container">

        <div
          className="dc-canvas-surface"
          onPointerLeave={() => setCursor(null)}
        >
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className={`dc-canvas ${
              canDraw ? "dc-can-draw" : ""
            }`}
            onPointerDown={down}
            onPointerMove={(e) => {
              if (canDraw && e.pointerType === "mouse") {
                const rect =
                  canvasRef.current.getBoundingClientRect();

                setCursor({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  width: rect.width,
                });
              }

              move(e);
            }}
            onPointerUp={up}
            onPointerCancel={up}
            onLostPointerCapture={up}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Multiplayer drawing canvas"
          />

          {/* BRUSH CURSOR */}
          {canDraw && cursor && (
            <div
              className="dc-brush-cursor"
              style={{
                left: cursor.x,
                top: cursor.y,
                width: Math.max(
                  4,
                  (activeSize / W) * cursor.width
                ),
                height: Math.max(
                  4,
                  (activeSize / W) * cursor.width
                ),
                borderColor: eraser
                  ? "#ef4444"
                  : activeColor,
              }}
            />
          )}

          {!canDraw && (
            <div className="dc-viewer-badge">
              👀 Watching Drawing
            </div>
          )}
        </div>
      </div>

      {/* DRAWING TOOLS */}
      {canDraw && (
        <div className="dc-toolbar">

          <div className="dc-toolbar-top">

            <div className="dc-toolbar-title">
              <span>🖌️</span>

              <div>
                <strong>Drawing Tools</strong>
                <small>Make your masterpiece!</small>
              </div>
            </div>

            <div className="dc-toolbar-actions">

              <button
                type="button"
                className="dc-action"
                onClick={undo}
                title="Undo (Ctrl + Z)"
              >
                ↶ Undo
              </button>

              <button
                type="button"
                className="dc-action"
                onClick={download}
                title="Save drawing as PNG"
              >
                ↓ Save
              </button>

              <button
                type="button"
                className="dc-action dc-danger"
                onClick={clear}
              >
                🗑 Clear
              </button>

            </div>
          </div>

          <div className="dc-toolbar-body">

            {/* PEN / ERASER */}
            <div className="dc-tool-section">

              <span className="dc-label">TOOLS</span>

              <div className="dc-tool-buttons">

                <button
                  type="button"
                  className={`dc-tool ${
                    !eraser ? "dc-active" : ""
                  }`}
                  onClick={() => setEraser(false)}
                  title="Brush (B)"
                >
                  ✏️ Pen
                </button>

                <button
                  type="button"
                  className={`dc-tool ${
                    eraser ? "dc-active" : ""
                  }`}
                  onClick={() => setEraser(true)}
                  title="Eraser (E)"
                >
                  ◻ Eraser
                </button>

              </div>

            </div>

            {/* BRUSH SIZES */}
            <div className="dc-tool-section">

              <span className="dc-label">BRUSH SIZE</span>

              <div className="dc-size-options">

                {SIZES.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    className={`dc-size-btn ${
                      size === item.value ? "dc-active" : ""
                    }`}
                    onClick={() => setSize(item.value)}
                    title={`${item.value}px`}
                  >
                    {item.label}
                  </button>
                ))}

              </div>

              <div className="dc-size-slider">

                <input
                  type="range"
                  min="2"
                  max="40"
                  value={size}
                  onChange={(e) =>
                    setSize(Number(e.target.value))
                  }
                />

                <span>{size}px</span>

              </div>

            </div>

            {/* COLORS */}
            <div className="dc-tool-section dc-colors-section">

              <span className="dc-label">COLOR PALETTE</span>

              <div className="dc-color-grid">

                {COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={`dc-swatch ${
                      !eraser && color === c
                        ? "dc-selected"
                        : ""
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => selectColor(c)}
                    title={c}
                    aria-label={`Select color ${c}`}
                    aria-pressed={!eraser && color === c}
                  />
                ))}

                <label
                  className="dc-custom-color"
                  title="Choose custom color"
                >
                  <span>+</span>

                  <input
                    type="color"
                    value={color}
                    onChange={(e) =>
                      selectColor(e.target.value)
                    }
                    aria-label="Custom brush color"
                  />

                </label>

              </div>

            </div>

          </div>

          {/* TOOLBAR FOOTER */}
          <div className="dc-toolbar-footer">

            <div className="dc-current-tool">

              <span
                className="dc-current-color"
                style={{
                  backgroundColor: activeColor,
                }}
              />

              <span>
                {eraser ? "Eraser" : "Pen"} • {activeSize}px
              </span>

            </div>

            <button
              type="button"
              className="dc-shortcut-btn"
              onClick={() =>
                setShowShortcuts(!showShortcuts)
              }
            >
              ⌨ Shortcuts
            </button>

          </div>

          {showShortcuts && (
            <div className="dc-shortcuts">
              <span><kbd>B</kbd> Brush</span>
              <span><kbd>E</kbd> Eraser</span>
              <span><kbd>[</kbd> Smaller</span>
              <span><kbd>]</kbd> Larger</span>
              <span><kbd>Ctrl + Z</kbd> Undo</span>
            </div>
          )}

        </div>
      )}

    </div>
  );
}






































// import { useEffect, useRef, useState } from 'react';
// import { socket } from '../socket';

// const W = 800;
// const H = 600;
// const COLORS = ['#000000', '#7f7f7f', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#6d4c41', '#ec407a'];
// const SIZES = [
//   { label: 'Thin', v: 3 },
//   { label: 'Medium', v: 8 },
//   { label: 'Thick', v: 18 },
// ];

// // Draw one stroke (a list of points, each 0..1) on the canvas
// function paint(ctx, stroke) {
//   const [first, ...rest] = stroke.points;
//   ctx.strokeStyle = stroke.color;
//   ctx.lineWidth = stroke.size;
//   ctx.lineCap = 'round';
//   ctx.lineJoin = 'round';
//   ctx.beginPath();
//   ctx.moveTo(first.x * W, first.y * H);
//   if (!rest.length) ctx.lineTo(first.x * W + 0.01, first.y * H); // single click = dot
//   rest.forEach((p) => ctx.lineTo(p.x * W, p.y * H));
//   ctx.stroke();
// }

// export default function DrawingCanvas({ canDraw }) {
//   const ref = useRef(null);
//   const strokes = useRef([]); // everything drawn so far (our local copy)
//   const drawing = useRef(false);
//   const [color, setColor] = useState('#000000');
//   const [size, setSize] = useState(8);
//   const [eraser, setEraser] = useState(false);

//   const ctx = () => ref.current.getContext('2d');
//   const redraw = () => {
//     const c = ctx();
//     c.fillStyle = '#ffffff';
//     c.fillRect(0, 0, W, H);
//     strokes.current.forEach((s) => paint(c, s));
//   };
//   const last = () => strokes.current[strokes.current.length - 1];

//   // apply* are used for BOTH my own drawing and strokes coming from the server
//   const applyStart = (d) => {
//     strokes.current.push({ color: d.color, size: d.size, points: [{ x: d.x, y: d.y }] });
//     paint(ctx(), last());
//   };
//   const applyMove = (d) => {
//     const s = last();
//     if (!s) return;
//     const prev = s.points[s.points.length - 1];
//     s.points.push({ x: d.x, y: d.y });
//     paint(ctx(), { color: s.color, size: s.size, points: [prev, { x: d.x, y: d.y }] }); // only the new segment
//   };

//   useEffect(() => {
//     redraw();
//     const onData = (d) => {
//       if (d.type === 'start') applyStart(d);
//       else if (d.type === 'move') applyMove(d);
//     };
//     const onClear = () => {
//       strokes.current = [];
//       redraw();
//     };
//     const onRedraw = ({ strokes: list }) => {
//       strokes.current = list;
//       redraw();
//     };
//     socket.on('draw_data', onData);
//     socket.on('canvas_clear', onClear);
//     socket.on('canvas_redraw', onRedraw);
//     return () => {
//       socket.off('draw_data', onData);
//       socket.off('canvas_clear', onClear);
//       socket.off('canvas_redraw', onRedraw);
//     };
//   }, []);

//   // mouse/finger position -> fraction of canvas (0..1)
//   const pos = (e) => {
//     const r = ref.current.getBoundingClientRect();
//     return {
//       x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
//       y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
//     };
//   };
//   const down = (e) => {
//     if (!canDraw) return;
//     ref.current.setPointerCapture(e.pointerId);
//     drawing.current = true;
//     const d = { ...pos(e), color: eraser ? '#ffffff' : color, size: eraser ? size * 2 : size };
//     applyStart(d);
//     socket.emit('draw_start', d);
//   };
//   const move = (e) => {
//     if (!drawing.current) return;
//     const p = pos(e);
//     applyMove(p);
//     socket.emit('draw_move', p);
//   };
//   const up = () => {
//     if (!drawing.current) return;
//     drawing.current = false;
//     socket.emit('draw_end');
//   };

//   return (
//     <div className="canvas-wrap">
//       <canvas
//         ref={ref}
//         width={W}
//         height={H}
//         className={canDraw ? 'canvas can-draw' : 'canvas'}
//         onPointerDown={down}
//         onPointerMove={move}
//         onPointerUp={up}
//         onPointerCancel={up}
//       />
//       {canDraw && (
//         <div className="toolbar">
//           {COLORS.map((c) => (
//             <button
//               key={c}
//               className={`swatch ${!eraser && color === c ? 'active' : ''}`}
//               style={{ background: c }}
//               onClick={() => {
//                 setColor(c);
//                 setEraser(false);
//               }}
//             />
//           ))}
//           {SIZES.map((s) => (
//             <button key={s.v} className={size === s.v ? 'small active' : 'small'} onClick={() => setSize(s.v)}>{s.label}</button>
//           ))}
//           <button className={eraser ? 'small active' : 'small'} onClick={() => setEraser(!eraser)}>Eraser</button>
//           <button className="small" onClick={() => socket.emit('draw_undo')}>Undo</button>
//           <button className="small danger" onClick={() => socket.emit('canvas_clear')}>Clear</button>
//         </div>
//       )}
//     </div>
//   );
// }
