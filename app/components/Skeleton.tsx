"use client"

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  style?: React.CSSProperties
}

export function Skeleton({ width = "100%", height = 16, borderRadius, style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{
        width,
        height,
        borderRadius: borderRadius ?? 6,
        ...style,
      }}
    />
  )
}

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: "12px 16px" }}>
          <Skeleton height={14} width={i === 0 ? "70%" : i === cols - 1 ? 60 : "50%"} />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonCard() {
  return (
    <div className="stat-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Skeleton width={40} height={40} borderRadius={10} />
        <Skeleton width={60} height={14} />
      </div>
      <Skeleton width={80} height={32} />
      <Skeleton width={100} height={12} />
    </div>
  )
}
