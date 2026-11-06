import { Link } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { PageHeader, EmptyState, DemoNote } from "./common";
import { Button } from "@/components/ui/button";

/** Honest placeholder for sections scheduled for a later build stage. */
export function PlannedSection({ title, description, crumbs }: { title: string; description: string; crumbs?: { label: string; to?: string }[] }) {
  return (
    <div>
      <PageHeader title={title} description={description} crumbs={crumbs} />
      <DemoNote className="mb-4" />
      <div className="panel">
        <EmptyState
          icon={Construction}
          title="This section is scheduled for the next build stage"
          description="The underlying synthetic data is ready; the interactive screens for this section haven't been built yet."
          action={
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link to="/">Back to overview</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
