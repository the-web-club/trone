import { Stagger, StaggerItem } from "@/components/motion";
import { OpportunityRow } from "@/components/opportunity/opportunity-row";
import type { OpportunityBoard as Board } from "@/lib/opportunity-service";

export function OpportunityBoard({
  board,
  currentUserId,
  assignees,
}: {
  board: Board;
  currentUserId: string;
  assignees: Array<{ id: string; name: string }>;
}) {
  const sections = [
    { key: "stale", title: "Te lang stil", items: board.stale },
    { key: "followUp", title: "Rijp voor opvolging", items: board.followUp },
    { key: "hot", title: "Hot leads", items: board.hot },
    { key: "hotSuggestions", title: "Suggesties", items: board.hotSuggestions },
    { key: "dueActions", title: "Opvolgacties vandaag", items: board.dueActions },
  ] as const;

  return (
    <div className="flex flex-col gap-8">
      {sections.map((section) => (
        <section key={section.key} className="flex flex-col gap-3">
          <h2 className="text-md font-medium text-fg">
            {section.title}
            <span className="ml-2 text-sm font-normal text-fg-muted">
              {section.items.length}
            </span>
          </h2>
          {section.items.length === 0 ? (
            <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg-muted">
              Niets in deze lijst.
            </p>
          ) : (
            <Stagger as="ul" className="flex flex-col gap-2">
              {section.items.map((item) => (
                <StaggerItem key={item.id} as="li">
                  <OpportunityRow
                    item={item}
                    currentUserId={currentUserId}
                    assignees={assignees}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </section>
      ))}
    </div>
  );
}
