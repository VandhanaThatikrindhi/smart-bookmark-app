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
      loadBookmarks();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-in fade-in duration-700">
        <div className="text-center space-y-6 max-w-lg mb-12">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 tracking-tight pb-2">
            Smart Bookmarks
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Organize your digital life with elegance. A simple, fast, and beautiful way to manage your links.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl ring-1 ring-slate-900/5 w-full max-w-sm">
          <button
            onClick={handleSignIn}
            className="w-full group relative flex justify-center items-center gap-3 py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5 text-white/90" viewBox="0 0 24 24">
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
        </div>

        {errorMsg && <div className="mt-4 text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100 text-sm">{errorMsg}</div>}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/60 shadow-sm sticky top-4 z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">My Bookmarks</h1>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
          <span className="text-sm font-medium text-slate-600 hidden sm:inline">{user.email}</span>
          <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-slate-600 hover:text-red-500 transition-colors flex items-center gap-2 group"
          >
            <span>Sign out</span>
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2" role="alert">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="block sm:inline">{errorMsg}</span>
        </div>
      )}

      {/* Add Bookmark Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-800">Add New Bookmark</h2>
        </div>
        <form onSubmit={handleAddBookmark} className="p-6 flex flex-col md:flex-row gap-4 items-start">
          <div className="flex-grow w-full space-y-1">
            <label htmlFor="url" className="sr-only">URL</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-400 text-sm">https://</span>
              </div>
              <input
                id="url"
                type="text"
                placeholder="example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="block w-full pl-16 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                required
              />
            </div>
          </div>

          <div className="flex-grow w-full md:w-1/3 space-y-1">
            <label htmlFor="title" className="sr-only">Title</label>
            <input
              id="title"
              type="text"
              placeholder="Bookmark Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:from-indigo-700 hover:to-violet-700 focus:ring-4 focus:ring-indigo-500/20 transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 whitespace-nowrap flex items-center justify-center gap-2 group"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </form>
      </div>

      {/* Bookmarks Grid */}
      {bookmarks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
          <div className="mx-auto h-16 w-16 text-slate-300 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-slate-900">No bookmarks yet</h3>
          <p className="mt-1 text-sm text-slate-500">Get started by creating a new bookmark above.</p>
        </div>
      ) : (
        <ul className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((bm) => (
            <li
              key={bm.id}
              className="group bg-white border border-slate-100/50 rounded-2xl p-6 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-500/20 transition-all duration-300 relative flex flex-col h-full hover:-translate-y-1"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteBookmark(bm.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete bookmark"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <a
                  href={bm.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block focus:outline-none"
                >
                  <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                    {bm.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 truncate font-mono bg-slate-50 inline-block px-2 py-0.5 rounded border border-slate-100 max-w-full">
                    {bm.url.replace(/^https?:\/\//, '')}
                  </p>
                </a>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Added {new Date(bm.created_at!).toLocaleDateString()}</span>
                <a href={bm.url} target="_blank" rel="noopener noreferrer" className="group-hover:translate-x-1 transition-transform text-indigo-500 font-semibold opacity-0 group-hover:opacity-100 flex items-center gap-1 hover:text-indigo-700">
                  Visit
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}