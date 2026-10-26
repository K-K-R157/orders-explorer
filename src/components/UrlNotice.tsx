type UrlNoticeProps = {
  reason: string;
  onDismiss: () => void;
};

// Shown when the link couldn't be read; the app has already fallen back to the default view.
export function UrlNotice({ reason, onDismiss }: UrlNoticeProps) {
  return (
    <div
      role="alert"
      className="flex shrink-0 items-center gap-2 border-b border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-900"
    >
      <span aria-hidden="true">⚠</span>
      <p className="flex-1">
        This link couldn't be fully opened because {reason}. Showing the default view instead.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss message"
        className="cursor-pointer rounded px-1.5 text-base leading-6 text-amber-700 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        ×
      </button>
    </div>
  );
}
