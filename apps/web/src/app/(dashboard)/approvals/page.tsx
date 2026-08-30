import { prisma } from "@instagram-agent/db";
import { getCurrentAccount } from "@/lib/current-account";
import { ApprovalActions } from "./approval-actions";

export default async function ApprovalsPage() {
  const account = await getCurrentAccount();
  if (!account) return <p className="text-sm text-neutral-500">لا يوجد حساب مرتبط.</p>;

  const approvals = await prisma.approval.findMany({
    where: { status: "PENDING", action: { instagramAccountId: account.id } },
    include: { action: true },
    orderBy: { requestedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">الموافقات</h1>
      <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {approvals.length === 0 && <p className="p-4 text-sm text-neutral-500">لا توجد إجراءات بانتظار الموافقة.</p>}
        {approvals.map((approval) => (
          <div key={approval.id} className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{approval.action.actionType}</span>
              <span className="text-xs text-neutral-400">{approval.action.proposedBy}</span>
            </div>
            <pre className="mb-3 overflow-x-auto rounded-md bg-neutral-50 p-3 text-xs">{JSON.stringify(approval.action.payload, null, 2)}</pre>
            {approval.action.reasoning && <p className="mb-3 text-xs text-neutral-500">السبب: {approval.action.reasoning}</p>}
            <ApprovalActions approvalId={approval.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
