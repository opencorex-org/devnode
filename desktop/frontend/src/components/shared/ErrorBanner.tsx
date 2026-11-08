import { Toast } from "../ui/Toast";

export function ErrorBanner({
  error,
  notice,
  onDismiss,
}: {
  error: string;
  notice: string;
  onDismiss: () => void;
}) {
  if (!error && !notice) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-3 pointer-events-none"
    >
      {error && (
        <Toast
          type="error"
          title="Error"
          message={error}
          duration={6000}
          onClose={onDismiss}
        />
      )}

      {notice && !error && (
        <Toast
          type="success"
          title="Success"
          message={notice}
          duration={4000}
          onClose={onDismiss}
        />
      )}
    </div>
  );
}
