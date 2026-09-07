import { OpportunitySection } from "@/components/opportunity/opportunity-section";
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
  const hotItems = [...board.hot, ...board.hotSuggestions];

  return (
    <div className="flex flex-col gap-8">
      <OpportunitySection
        title="Hot leads"
        items={hotItems}
        currentUserId={currentUserId}
        assignees={assignees}
        emptyMessage="Geen hot leads. Markeer een lead als hot, of wacht op een systeem-suggestie."
      />
      <OpportunitySection
        title="Opvolgacties vandaag"
        items={board.dueActions}
        currentUserId={currentUserId}
        assignees={assignees}
        hideWhenEmpty
      />
      <OpportunitySection
        title="Rijp voor opvolging"
        items={board.followUp}
        currentUserId={currentUserId}
        assignees={assignees}
        hideWhenEmpty
      />
      <OpportunitySection
        title="Te lang stil"
        items={board.stale}
        currentUserId={currentUserId}
        assignees={assignees}
        pageSize={15}
        hideWhenEmpty
      />
    </div>
  );
}
