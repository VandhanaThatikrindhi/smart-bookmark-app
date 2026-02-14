import dynamic from "next/dynamic";

// Dynamically import the BookmarkClient as a client component. Using a relative
// import avoids the need to configure custom aliases in `tsconfig.json`.
const BookmarkClient = dynamic(
  () => import("../components/BookmarkClient"),
  { ssr: false }
);

export default function HomePage() {
  return (
    <main className="max-w-2xl mx-auto">
      <BookmarkClient />
    </main>
  );
}