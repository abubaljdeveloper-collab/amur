import { notFound } from "next/navigation";
import { getStorageAdapter } from "@instagram-agent/storage";
import { requireOwnedContent } from "@/lib/require-content";
import { ContentDetailActions } from "./content-detail-actions";

export default async function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let content;
  try {
    content = await requireOwnedContent(id);
  } catch {
    notFound();
  }

  const storage = getStorageAdapter();
  const mediaUrls = content.media.map((m) => storage.getPublicUrl(m.storageKey));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">{content.topic ?? "محتوى"}</h1>

      <div className="rounded-lg border border-neutral-200 bg-white p-6 space-y-4">
        <div>
          <p className="text-xs font-medium text-neutral-500">الحالة</p>
          <p className="text-sm">{content.status}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500">Caption</p>
          <p className="whitespace-pre-wrap text-sm">{content.caption}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500">الهاشتاقات</p>
          <p className="text-sm">{content.hashtags.join(" ")}</p>
        </div>
        {content.hooks.length > 0 && (
          <div>
            <p className="text-xs font-medium text-neutral-500">Hooks</p>
            <ul className="list-inside list-disc text-sm">
              {content.hooks.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
          </div>
        )}
        {content.cta && (
          <div>
            <p className="text-xs font-medium text-neutral-500">CTA</p>
            <p className="text-sm">{content.cta}</p>
          </div>
        )}
        {mediaUrls.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-neutral-500">الوسائط</p>
            <div className="grid grid-cols-3 gap-2">
              {content.media.map((m, i) => (
                m.type === "IMAGE"
                  ? <img key={m.id} src={mediaUrls[i]} alt="" className="aspect-square rounded-md object-cover" />
                  : <video key={m.id} src={mediaUrls[i]} className="aspect-square rounded-md object-cover" controls />
              ))}
            </div>
          </div>
        )}
      </div>

      <ContentDetailActions
        contentId={content.id}
        status={content.status}
        scheduledAt={content.calendar?.scheduledAt.toISOString() ?? null}
      />
    </div>
  );
}
