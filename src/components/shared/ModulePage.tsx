// Generic placeholder builder for remaining ERP module pages so all 50+ routes resolve.
import { ReactNode } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section } from "@/components/shared/FormShell";
import { EmptyState } from "@/components/shared/EmptyState";

export function ModulePage({
  title,
  description,
  breadcrumbs,
  children,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumbs: { label: string; to?: string }[];
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} breadcrumbs={breadcrumbs} actions={actions} />
      {children ?? (
        <Section>
          <EmptyState title="No data yet" description="Records will appear here once your team starts adding data." />
        </Section>
      )}
    </div>
  );
}
