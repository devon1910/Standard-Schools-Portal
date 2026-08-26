import Link from "next/link";
import { Inbox } from "lucide-react";

export function EmptyState({ title, description, actionHref, actionLabel }: { title: string; description: string; actionHref?: string; actionLabel?: string }) {
  return <div className="empty-state"><span className="empty-state-icon"><Inbox size={22} /></span><strong>{title}</strong><p>{description}</p>{actionHref && actionLabel && <Link className="button button-secondary" href={actionHref}>{actionLabel}</Link>}</div>;
}

export function EmptyTableRow({ colSpan, ...props }: React.ComponentProps<typeof EmptyState> & { colSpan: number }) {
  return <tr><td colSpan={colSpan}><EmptyState {...props} /></td></tr>;
}
