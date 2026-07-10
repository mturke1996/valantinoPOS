"use client";

import { useCallback, useState } from "react";
import { ScrollText } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { getState } from "@/lib/data/store";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/types";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLogs(getState().auditLogs);
    setLoading(false);
  }, []);

  useStoreSubscription(refresh);

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <PageHeader title="سجل النشاط" description="تتبع جميع العمليات في النظام" />

      {logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="لا يوجد سجل نشاط" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-cacao-800/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-start font-medium">التاريخ</th>
                <th className="p-3 text-start font-medium">الإجراء</th>
                <th className="p-3 text-start font-medium">الكيان</th>
                <th className="p-3 text-start font-medium">المعرف</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-cacao-800/6">
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{log.action}</Badge>
                  </td>
                  <td className="p-3">{log.entityType}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {log.entityId.slice(0, 8)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
