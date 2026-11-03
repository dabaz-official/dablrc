import { EditorShell } from "@/components/editor/editor-shell";
import type { EditorView } from "@/components/editor/top-bar";

interface HomePageProps {
  searchParams: Promise<{ view?: string | string[] }>;
}

// The view switch lives in the query string. Reading it makes the route
// dynamic, and this is a client tool, so a blocking render is the right trade.
export const instant = false;

export default async function HomePage({ searchParams }: HomePageProps) {
  const { view } = await searchParams;
  const value = Array.isArray(view) ? view[0] : view;
  const initialView: EditorView = value === "legacy" ? "legacy" : "focus";

  return <EditorShell initialView={initialView} />;
}
