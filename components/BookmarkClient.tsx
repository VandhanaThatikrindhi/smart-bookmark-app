"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/client";

interface Bookmark {
  id: number;
  url: string;
  title: string;
  user_id: string;
  created_at?: string;
}

/**
 * Client component that handles user authentication and bookmark CRUD.
 *
 * When the user is not logged in, a "Sign in with Google" button is shown. Once
 * logged in, the user can create and delete bookmarks. Bookmarks are loaded
 * from Supabase and kept in sync across tabs using Realtime subscriptions.
 */
export default function BookmarkClient() {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<any>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (mounted) {
        setUser(user);
        if (user) {
          await loadBookmarks();

          const channel = supabase
            .channel("bookmarks_changes")
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "bookmarks",
                filter: `user_id=eq.${user.id}`,
              },
              () => {
                loadBookmarks();
              }
            )
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                console.log('Realtime subscribed');
              }
            });

          return () => {
            supabase.removeChannel(channel);
          };
        }
        setLoading(false);
      }
    };

    init();

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBookmarks = async () => {
    setErrorMsg(null);
    const { data, error } = await supabase
      .from("bookmarks")
      .select("id, url, title, user_id, created_at")
      .order("created_at", { ascending: false });

    if (!error) {
      setBookmarks(data as Bookmark[]);
    } else {
      console.error("Error fetching bookmarks", error.message);
      setErrorMsg("Failed to load bookmarks: " + error.message);
    }
    setLoading(false);
  };

  const handleSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error("Error signing in", error.message);
      setErrorMsg(error.message);
    } else if (data.url) {
      window.location.href = data.url;
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setBookmarks([]);
  };

  const handleAddBookmark = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url || !title || !user) return;

    setErrorMsg(null);

    // Explicitly including user_id despite default to ensure RLS compliance
    const { error } = await supabase.from("bookmarks").insert({
      url,
      title,
      user_id: user.id
    });

    if (error) {
      console.error("Error adding bookmark", error.message);
      setErrorMsg("Error adding bookmark: " + error.message);
    } else {
      setUrl("");
      setTitle("");
      // Immediate reload in case Realtime is slow or fails
      loadBookmarks();
    }
  };

  const handleDeleteBookmark = async (id: number) => {
    const { error } = await supabase.from("bookmarks").delete().eq("id", id);
    if (error) {
      console.error("Error deleting bookmark", error.message);
      setErrorMsg("Error deleting bookmark: " + error.message);
    } else {
      // Immediate reload
      loadBookmarks();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 px-4">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight text-center">Smart Bookmarks</h1>
        <p className="text-gray-500 text-lg text-center">Manage your links with ease.</p>
        <button
          onClick={handleSignIn}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition transform hover:scale-105"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>
        {errorMsg && <div className="text-red-500 bg-red-50 p-3 rounded">{errorMsg}</div>}
      </div>
    );
  }

  return (
    <div className="py-8 px-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Bookmarks</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 hidden sm:inline">{user.email}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-red-600 transition underline"
          >
            Sign out
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleAddBookmark} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-4">
        <input
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-grow border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          required
        />
        <input
          type="text"
          placeholder="Bookmark Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-grow border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition shadow-md whitespace-nowrap"
        >
          Add Bookmark
        </button>
      </form>

      {bookmarks.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p>No bookmarks yet. Add one above!</p>
        </div>
      ) : (
        <ul className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((bm) => (
            <li
              key={bm.id}
              className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition flex flex-col justify-between h-full relative"
            >
              <div className="mb-4">
                <a
                  href={bm.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold text-gray-800 hover:text-blue-600 line-clamp-2 mb-1"
                >
                  {bm.title}
                </a>
                <a
                  href={bm.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 truncate block hover:underline"
                >
                  {bm.url}
                </a>
              </div>
              <div className="flex justify-end pt-4 border-t border-gray-50 mt-auto">
                <button
                  onClick={() => handleDeleteBookmark(bm.id)}
                  className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1 rounded hover:bg-red-50 transition"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}