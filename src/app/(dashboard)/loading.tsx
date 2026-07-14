export default function DashboardLoading() {
  // Soft route transition — avoid full-page skeleton flash on every navigation
  return (
    <div className="flex items-center justify-center py-16" aria-hidden>
      <div className="size-1.5 rounded-full bg-gold-400/50" />
    </div>
  );
}
