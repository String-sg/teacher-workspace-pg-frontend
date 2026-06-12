import { History } from 'lucide-react';

import type { ConsentFormHistoryEntry } from '~/data/posts-registry';
import { formatDateTime } from '~/helpers/dateTime';

interface ConsentFormHistoryListProps {
  entries: ConsentFormHistoryEntry[];
}

export function ConsentFormHistoryList({ entries }: ConsentFormHistoryListProps) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          History
        </p>
      </div>

      <ol className="space-y-3 border-l border-border pl-4">
        {entries.map((entry) => (
          <li key={entry.historyId} className="relative">
            <span className="absolute top-1.5 -left-[21px] flex h-3 w-3 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
              <History className="h-2 w-2" strokeWidth={2.5} />
            </span>
            <p className="text-sm">
              <span className="font-medium">{entry.action}</span>
              <span className="text-muted-foreground"> by {entry.actionBy}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(entry.actionAt) ?? entry.actionAt}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
