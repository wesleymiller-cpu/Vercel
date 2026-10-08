"use client"

import { useState, useEffect } from "react"

// Constants
const PREVIEW_FONT_SIZE = 64
// Optional adjustment to the vertical gap between the "Miss" line and the first
// location line (negative = pull the block up). Kept at 0 so all four lines use
// the same, even line spacing, matching the brand reference logos.
const MISS_GAP_ADJUST = 0
// Max width (as a multiple of font size) a location line may reach before the
// next word wraps to its own line. Short two-word combos ("Fall River",
// "Rose Hills") stay together; longer pairs ("Capitol Hill", "Bristol County's")
// break one word per line. A single word longer than this never breaks.
const WRAP_MAX_EM = 4.3

// Brand colors
const COLORS = {
  darkGrey: "#3C3C3C",
  white: "#FFFFFF",
  gold: "#B49B57",
}

type TitleType = "stateMiss" | "stateTeen" | "localMiss" | "localTeen"
type ColorKey = "darkGrey" | "white" | "gold"

export default function LogotypeGenerator() {
  const [titleType, setTitleType] = useState<TitleType>("stateMiss")
  const [location, setLocation] = useState("")
  const [selectedColor, setSelectedColor] = useState<ColorKey>("darkGrey")
  const [exportBg, setExportBg] = useState<"transparent" | "white">("transparent")
  const [locationLines, setLocationLines] = useState<string[]>([])
  // Measured width of every rendered line (Miss, each location line, Teen).
  const [lineWidths, setLineWidths] = useState<number[]>([])
  // Per-line horizontal placement within the widest line's box, indexed the same
  // as the rendered lines. 0 = flush-left under the anchor, 0.5 = centered, 1 = flush-right.
  const [lineBiases, setLineBiases] = useState<number[]>([])

  const getBias = (i: number) => (lineBiases[i] ?? 0.5)
  const setBias = (i: number, val: number) =>
    setLineBiases((prev) => {
      const next = [...prev]
      next[i] = val
      return next
    })

  const isState = titleType === "stateMiss" || titleType === "stateTeen"
  const isTeen = titleType === "stateTeen" || titleType === "localTeen"
  const fontWeight = isState ? 800 : 700
  const fontName = isState ? "Konnect Extra Bold" : "Konnect Bold"
  const color = COLORS[selectedColor]

  // Capitalize each word
  const formatLocation = (str: string) => {
    return str
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
  }

  // Measure rendered text width using a hidden span that matches the preview styling
  const measureSpan = (text: string, weight: number) => {
    const temp = document.createElement("span")
    temp.style.cssText = `position:absolute;visibility:hidden;font-family:Konnect,"Arial Black",Impact,sans-serif;font-size:${PREVIEW_FONT_SIZE}px;font-weight:${weight};letter-spacing:-0.040em;word-spacing:0.080em;white-space:nowrap;`
    temp.textContent = text
    document.body.appendChild(temp)
    const w = temp.getBoundingClientRect().width
    document.body.removeChild(temp)
    return w
  }

  // Add the possessive to the last location line for Teen titles.
  // Ends in "s" -> apostrophe only ("Everglades'"); otherwise "'s" ("County's").
  const possessive = (text: string) => (/s$/i.test(text) ? `${text}\u2019` : `${text}\u2019s`)

  const formattedLocation = formatLocation(location) || "Location"
  const words = formattedLocation.split(" ")

  // The wrapped lines come from the effect below; fall back to one line pre-measure.
  const effectiveLines = locationLines.length ? locationLines : [formattedLocation]

  // For Teen, the possessive attaches to the LAST location line (i.e. the last word).
  const renderedLocationLines = effectiveLines.map((line, i) =>
    isTeen && i === effectiveLines.length - 1 ? possessive(line) : line,
  )

  // Every rendered line in order: Miss, each location line, then Teen (if applicable).
  // Each gets its own alignment slider, indexed identically to lineWidths/lineBiases.
  const titleLines: string[] = ["Miss", ...renderedLocationLines, ...(isTeen ? ["Teen"] : [])]
  const maxLineWidth = lineWidths.length ? Math.max(...lineWidths) : 0
  // Index of the widest line (used only to label it as the default reference).
  const widestIndex = lineWidths.length ? lineWidths.indexOf(maxLineWidth) : 0

  // Compute the left margin of every line from a set of measured widths and the
  // per-line biases. A line shorter than the widest moves within its leftover
  // space (bias 0 = left edge aligned, 1 = right edge aligned). The widest line
  // has no leftover space, so it gets its own movement budget centered on the
  // default flush-left position (bias 0.5 = unchanged) so its slider stays live.
  // Finally the block is normalized so the leftmost line sits at 0.
  const computeMargins = (widths: number[]) => {
    if (!widths.length) return [] as number[]
    const maxW = Math.max(...widths)
    const raw = widths.map((w, i) => {
      const slack = maxW - w
      if (slack < 0.5) return maxW * (getBias(i) - 0.5)
      return slack * getBias(i)
    })
    const minPos = Math.min(...raw)
    return raw.map((r) => r - minPos)
  }

  const lineMargins = computeMargins(lineWidths)
  // Width-based greedy wrap: pack words onto a line until adding the next word
  // would exceed WRAP_MAX_EM, then start a new line. Single long words never break.
  // Exception: a location word shorter than "Miss" is never left alone on a line.
  // If the current line is just one such short word, the next word is pulled up
  // onto it (so e.g. "Mid Wisconsin" stays together instead of stacking).
  useEffect(() => {
    if (!location.trim()) {
      setLocationLines([])
      return
    }
    const maxWidth = PREVIEW_FONT_SIZE * WRAP_MAX_EM
    const missWidth = measureSpan("Miss", fontWeight)
    const out: string[] = []
    let cur = ""
    for (const w of words) {
      const cand = cur ? `${cur} ${w}` : w
      if (cur && measureSpan(cand, fontWeight) > maxWidth) {
        // Normally we'd wrap here. But if the current line is a single word that
        // is shorter than "Miss", keep this next word on the same line so a short
        // word is never stranded by itself.
        const curIsLoneShortWord = !cur.includes(" ") && measureSpan(cur, fontWeight) < missWidth
        if (curIsLoneShortWord) {
          cur = cand
        } else {
          out.push(cur)
          cur = w
        }
      } else {
        cur = cand
      }
    }
    if (cur) out.push(cur)
    setLocationLines(out)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, fontWeight, formattedLocation])

  // Measure every rendered line so each can be positioned within the widest line's
  // box. The widest line anchors flush-left; the rest are placed by their own bias.
  useEffect(() => {
    if (!location.trim()) {
      setLineWidths([])
      return
    }
    setLineWidths(titleLines.map((line) => measureSpan(line, fontWeight)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, isTeen, fontWeight, titleLines.join("|")])

  // Download PNG — always a fixed 1080×1080 transparent square with the logotype
  // drawn at a constant font size and centered both horizontally and vertically.
  const downloadPNG = async () => {
    if (!location.trim()) return

    await document.fonts.ready

    const OUTPUT = 1080 // final square dimension in px
    const MARGIN = 80 // min transparent breathing room on each side
    const SAFE = OUTPUT - MARGIN * 2 // largest area the logo may occupy
    const BASE_FONT_SIZE = 150 // constant font size for normal titles
    const lineHeight = 0.85

    const canvas = document.createElement("canvas")
    canvas.width = OUTPUT
    canvas.height = OUTPUT
    const ctx = canvas.getContext("2d")!

    const applyFont = (fs: number) => {
      ctx.font = `${fontWeight} ${fs}px Konnect, "Arial Black", Impact, sans-serif`
      if ("letterSpacing" in ctx) {
        ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${-0.04 * fs}px`
      }
      if ("wordSpacing" in ctx) {
        ;(ctx as CanvasRenderingContext2D & { wordSpacing: string }).wordSpacing = `${0.08 * fs}px`
      }
    }

    // Measure the whole logotype block at a given font size. The WIDEST line
    // anchors flush-left; every other line is placed within its box by its own
    // bias (same model as the preview).
    const measureBlock = (fs: number) => {
      applyFont(fs)
      const widths = titleLines.map((l) => ctx.measureText(l).width)
      const margins = computeMargins(widths)
      const blockW = Math.max(...widths.map((w, i) => margins[i] + w))
      const capAscent = ctx.measureText("M").actualBoundingBoxAscent
      const descent = ctx.measureText("Mgy").actualBoundingBoxDescent
      const lineAdvance = fs * lineHeight
      const blockH = capAscent + lineAdvance * (titleLines.length - 1) + descent
      return { widths, margins, blockW, blockH, capAscent, lineAdvance }
    }

    // Keep the font size fixed for normal titles; only shrink the rare oversized
    // title so it never clips the 1080 canvas.
    let fontSize = BASE_FONT_SIZE
    let block = measureBlock(fontSize)
    const overflow = Math.max(block.blockW / SAFE, block.blockH / SAFE)
    if (overflow > 1) {
      fontSize = BASE_FONT_SIZE / overflow
      block = measureBlock(fontSize)
    }

    // Center the block in the square.
    const offsetX = (OUTPUT - block.blockW) / 2
    const offsetY = (OUTPUT - block.blockH) / 2

    // Background: transparent (cleared) or a solid white square.
    ctx.clearRect(0, 0, OUTPUT, OUTPUT)
    if (exportBg === "white") {
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(0, 0, OUTPUT, OUTPUT)
    }

    // Draw.
    applyFont(fontSize)
    ctx.fillStyle = color
    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"

    const firstBaseline = offsetY + block.capAscent
    titleLines.forEach((line, i) => {
      const x = offsetX + block.margins[i]
      const y = firstBaseline + i * block.lineAdvance
      ctx.fillText(line, x, y)
    })

    // Download
    const a = document.createElement("a")
    const colorName = selectedColor === "darkGrey" ? "Dark Grey" : selectedColor === "white" ? "White" : "Gold"
    const bgName = exportBg === "white" ? "White BG" : "Transparent"
    a.download = `Miss ${formattedLocation}${isTeen ? "\u2019s Teen" : ""} - ${colorName} - ${bgName}.png`
    a.href = canvas.toDataURL("image/png")
    a.click()
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", padding: "2rem" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img
            src="/miss-america-logo.png"
            alt="Miss America"
            style={{ height: 64, width: "auto", margin: "0 auto 1rem", display: "block" }}
          />
          <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.12em", color: "#888780", fontWeight: 600 }}>
            Logotype Generator
          </div>
          <div style={{ fontSize: 13, color: "#B4B2A9" }}>Miss America Brand Tool</div>
        </div>

        {/* Title Type */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888780", fontWeight: 600, marginBottom: 8 }}>
            Title Type
          </div>
          <div style={{ display: "flex", border: "1px solid #E0DDD6", borderRadius: 10, overflow: "hidden" }}>
            {(["stateMiss", "stateTeen", "localMiss", "localTeen"] as TitleType[]).map((type, i) => (
              <button
                key={type}
                onClick={() => setTitleType(type)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  fontSize: 13,
                  fontWeight: titleType === type ? 600 : 500,
                  color: titleType === type ? "white" : "#888780",
                  background: titleType === type ? "#B49B57" : "white",
                  border: "none",
                  borderRight: i < 3 ? "1px solid #E0DDD6" : "none",
                  cursor: "pointer",
                }}
              >
                {type === "stateMiss" ? "State Miss" : type === "stateTeen" ? "State Teen" : type === "localMiss" ? "Local Miss" : "Local Teen"}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888780", fontWeight: 600, marginBottom: 8 }}>
            Location Name
          </div>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Montana, Anchorage, Hudson Valley"
            style={{
              width: "100%",
              height: 44,
              padding: "0 14px",
              fontSize: 15,
              border: "1px solid #E0DDD6",
              borderRadius: 10,
              outline: "none",
            }}
          />
        </div>

        {/* Color */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888780", fontWeight: 600, marginBottom: 8 }}>
            Brand Color
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {(["darkGrey", "white", "gold"] as ColorKey[]).map((key) => (
              <div
                key={key}
                onClick={() => setSelectedColor(key)}
                style={{
                  flex: 1,
                  padding: "1rem",
                  border: `2px solid ${selectedColor === key ? "#B49B57" : "transparent"}`,
                  borderRadius: 12,
                  background: selectedColor === key ? "#FFFDF7" : "white",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    margin: "0 auto 8px",
                    background: COLORS[key],
                    border: key === "white" ? "1px solid #E0DDD6" : "none",
                    boxShadow: selectedColor === key ? "0 0 0 3px #FFFDF7, 0 0 0 5px #B49B57" : "none",
                  }}
                />
                <div style={{ fontSize: 12, fontWeight: 500, color: "#888780" }}>
                  {key === "darkGrey" ? "Dark Grey" : key === "white" ? "White" : "Gold"}
                </div>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#B4B2A9" }}>{COLORS[key]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Line Alignment */}
        {location.trim() && lineWidths.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888780", fontWeight: 600 }}>
                Line Alignment
              </div>
              <button
                onClick={() => setLineBiases([])}
                style={{
                  fontSize: 11,
                  color: "#B49B57",
                  fontWeight: 600,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Reset all
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {titleLines.map((line, i) => {
                const isWidest = i === widestIndex
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#3C3C3C" }}>{line}</span>
                      {isWidest && (
                        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B4B2A9", fontWeight: 600 }}>
                          Widest
                        </span>
                      )}
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={getBias(i)}
                      onChange={(e) => setBias(i, Number.parseFloat(e.target.value))}
                      style={{ width: "100%", accentColor: "#B49B57", cursor: "pointer" }}
                      aria-label={`Horizontal alignment for the "${line}" line`}
                    />
                  </div>
                )
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#B4B2A9", marginTop: 6 }}>
              <span>Left</span>
              <span>Centered</span>
              <span>Right</span>
            </div>
          </div>
        )}

        {/* Preview */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888780", fontWeight: 600, marginBottom: 8 }}>
            Preview
          </div>
          <div style={{ borderRadius: 14, border: "1px solid #E0DDD6", overflow: "hidden" }}>
            <div
              style={{
                minHeight: 320,
                padding: "3rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: selectedColor === "white" ? "#3C3C3C" : "#F0EFEB",
              }}
            >
              {!location.trim() ? (
                <div style={{ fontSize: 14, fontStyle: "italic", color: selectedColor === "white" ? "#757575" : "#B4B2A9" }}>
                  Type a location name above
                </div>
              ) : (
                <div
                  style={{
                    fontFamily: 'Konnect, "Arial Black", Impact, sans-serif',
                    fontSize: PREVIEW_FONT_SIZE,
                    fontWeight: fontWeight,
                    color: color,
                    letterSpacing: "-0.040em",
                    wordSpacing: "0.080em",
                    lineHeight: 0.85,
                  }}
                >
                  {titleLines.map((line, i) => (
                    <span
                      key={i}
                      style={{
                        display: "block",
                        marginLeft: lineMargins[i] || 0,
                        // Tighten only the gap between "Miss" and the first location line
                        marginTop: i === 1 ? PREVIEW_FONT_SIZE * MISS_GAP_ADJUST : 0,
                      }}
                    >
                      {line}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: "12px 20px", background: "white", borderTop: "1px solid #E0DDD6", fontSize: 12, color: "#B4B2A9" }}>
              {fontName} | {color}
            </div>
          </div>
        </div>

        {/* Export Background */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888780", fontWeight: 600, marginBottom: 8 }}>
            Export Background
          </div>
          <div style={{ display: "flex", border: "1px solid #E0DDD6", borderRadius: 10, overflow: "hidden" }}>
            {(["transparent", "white"] as const).map((bg, i) => (
              <button
                key={bg}
                onClick={() => setExportBg(bg)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  fontSize: 13,
                  fontWeight: exportBg === bg ? 600 : 500,
                  color: exportBg === bg ? "white" : "#888780",
                  background: exportBg === bg ? "#B49B57" : "white",
                  border: "none",
                  borderRight: i === 0 ? "1px solid #E0DDD6" : "none",
                  cursor: "pointer",
                }}
              >
                {bg === "transparent" ? "Transparent" : "White"}
              </button>
            ))}
          </div>
        </div>

        {/* Download */}
        <button
          onClick={downloadPNG}
          disabled={!location.trim()}
          style={{
            width: "100%",
            padding: 14,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.04em",
            border: "none",
            borderRadius: 10,
            background: location.trim() ? "#B49B57" : "#D8D5CC",
            color: "white",
            cursor: location.trim() ? "pointer" : "not-allowed",
          }}
        >
          Download PNG
        </button>
        <div style={{ fontSize: 11, color: "#B4B2A9", textAlign: "center", marginTop: 8 }}>
          {exportBg === "white" ? "White background" : "Transparent background"}, 1080 × 1080 px
        </div>
      </div>
    </div>
  )
}
