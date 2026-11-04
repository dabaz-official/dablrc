import { EditorShell, type EditorView } from "@/components/editor/editor-shell";

interface HomePageProps {
  searchParams: Promise<{ view?: string | string[] }>;
}

// The legacy view lives in the query string. Reading it makes the route
// dynamic, and this is a client tool, so a blocking render is the right trade.
export const instant = false;

export default async function HomePage({ searchParams }: HomePageProps) {
  const { view } = await searchParams;
  const value = Array.isArray(view) ? view[0] : view;
  const initialView: EditorView = value === "legacy" ? "legacy" : "tabs";

  return <EditorShell initialView={initialView} />;
}
