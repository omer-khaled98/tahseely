import * as React from "react"

export function Button({
  children,
  variant = "default",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-50 disabled:pointer-events-none shadow-sm"

  const variants = {
    default:
      "bg-gradient-to-r from-sky-700 to-cyan-600 text-white hover:from-sky-800 hover:to-cyan-700 border border-sky-700/20",
    outline:
      "border border-sky-200 bg-white text-slate-700 hover:bg-sky-50 hover:border-sky-300",
    destructive:
      "bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-700 hover:to-red-700 border border-rose-600/20",
    ghost:
      "bg-transparent text-slate-700 hover:bg-sky-50",
  }

  return (
    <button
      className={`${base} ${variants[variant] || variants.default} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}