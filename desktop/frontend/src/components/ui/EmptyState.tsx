import { ChevronRight, Server } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";

export function EmptyState({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Card className="flex flex-col items-center justify-center px-8 py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
        <Server size={30} />
      </div>

      <h2 className="text-xl font-semibold">
        {title}
      </h2>

      <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
        {description}
      </p>

      {action && (
        <Button
          className="mt-6"
          onClick={onAction}
        >
          {action}
          <ChevronRight size={16} />
        </Button>
      )}
    </Card>
  );
}
