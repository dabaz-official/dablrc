import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Edit",
};

export default function EditLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="py-4 md:py-8 overflow-auto">
      {children}
    </div>
  );
}