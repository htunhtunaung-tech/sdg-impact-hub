/** Re-mounts on every navigation, so each page gently fades in (see `.page-enter` in globals.css). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
