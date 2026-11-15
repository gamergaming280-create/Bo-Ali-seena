export default function Logo({ src, name, size = 48, className = "" }: { src: string | null; name: string; size?: number; className?: string }) {
  if (src) return <img src={src} alt={`${name} logo`} width={size} height={size} className={`rounded-xl object-contain ${className}`} style={{ width: size, height: size }} />;
  return <div className={`flex items-center justify-center rounded-xl border border-current/30 text-xs opacity-80 ${className}`} style={{ width: size, height: size }} aria-hidden>Logo</div>;
}
