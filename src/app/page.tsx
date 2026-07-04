import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-48px)] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-zinc-50">
        Your intelligence feed
      </h1>
      <p className="max-w-md text-sm font-normal text-zinc-400">
        Detected competitor changes will appear here once monitoring starts.
      </p>
      <Link
        href="/competitors"
        className="mt-2 inline-flex items-center gap-1 text-sm font-normal text-cyan-400 hover:underline"
      >
        Manage competitors <ArrowRight size={14} />
      </Link>
    </div>
  );
}
