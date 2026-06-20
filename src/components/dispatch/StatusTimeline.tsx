import React from 'react';

type LogEntry = {
  id?: string;
  status: string;
  changed_at?: string;
  created_at?: string;
  note?: string;
};

type Props = {
  logs: LogEntry[];
  hasShipments?: boolean;
};

const StatusTimeline: React.FC<Props> = ({ logs, hasShipments }) => {
  if (!logs || logs.length === 0) {
    if (hasShipments === false) {
      return (
        <div className="text-sm text-muted-foreground">No status updates yet.</div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">Status Timeline</h3>
      <ol className="relative border-l border-border ml-2">
        {logs.map((log, idx) => (
          <li key={log.id ?? idx} className="mb-4 ml-4">
            <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary border border-background" />
            <time className="text-xs text-muted-foreground">
              {new Date(log.changed_at || log.created_at || '').toLocaleString()}
            </time>
            <p className="text-sm font-medium capitalize">{log.status}</p>
            {log.note && <p className="text-xs text-muted-foreground">{log.note}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
};

export default StatusTimeline;
