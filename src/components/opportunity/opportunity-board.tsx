import { OpportunitySection } from "@/components/opportunity/opportunity-section";
import type { OpportunityBoard as Board } from "@/lib/opportunity-service";

export function OpportunityBoard({ board }: { board: Board }) {
  const hotItems = [...board.hot, ...board.hotSuggestions];

  return (
    <div className="flex flex-col gap-8">
      <OpportunitySection
        title="Hot leads"
        items={hotItems}
        emptyMessage="Geen hot leads. Markeer een lead als hot, of wacht op een systeem-suggestie."
      />
      <OpportunitySection
        title="Rijp voor opvolging"
        items={board.followUp}
        hideWhenEmpty
      />
      <OpportunitySection
        title="Te lang stil"
        items={board.stale}
        pageSize={15}
        hideWhenEmpty
      />
    </div>
  );
}
