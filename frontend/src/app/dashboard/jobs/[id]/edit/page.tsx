'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function EditJobPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (jobId) {
      router.replace(`/dashboard/jobs/post?jobId=${jobId}`);
    }
  }, [jobId, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center text-xs font-semibold text-zinc-500">
      Opening unified job editor workspace...
    </div>
  );
}
