import type { Metadata } from "next";
import Link from "next/link";
import { OpportunityBoard } from "@/components/opportunity/opportunity-board";
import { PageHeader } from "@/components/shell/page-header";
import { requireSession } from "@/lib/auth-session";
import { listSummary } from "@/lib/list-copy";
import { listOpportunities } from "@/lib/opportunity-service";
import { listActiveAssignees } from "@/lib/task-service";

export const metadata: Metadata = { title: "Kansen" };

export default async function KansenPage() {
  const session = await requireSession();
  const [board, assignees] = await Promise.all([
    listOpportunities(session.user.id),
    listActiveAssignees(),
  ]);
  const hotTotal = board.hot.length + board.hotSuggestions.length;
  const total = hotTotal + board.followUp.length + board.dueActions.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kansen"
        description={
          <>
            Hot leads, handmatig of via het systeem. Stilstaande leads staan
            onderaan. Drempels pas je aan in{" "}
            <Link href="/instellingen/drempels" className="hover:underline">
              Instellingen
            </Link>
            .
          </>
        }
        meta={[listSummary(total, "signaal", "signalen")]}
      />
      <OpportunityBoard
        board={board}
        currentUserId={session.user.id}
        assignees={assignees}
      />
    </div>
  );
}
