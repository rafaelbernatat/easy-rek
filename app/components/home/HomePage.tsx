"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  Search,
  Upload,
  Play,
  Trash2,
  Plus,
  MoreVertical,
  Copy,
  Edit2,
  ListPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getRecordingsAction,
  deleteRecordingAction,
} from "@/app/actions/recordings";

interface Recording {
  id: string;
  userId: string;
  title: string;
  videoKey: string;
  thumbnailUrl?: string;
  duration: number;
  size: number;
  createdAt: string;
}

export function HomePage() {
  const router = useRouter();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  // Load recordings from database
  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    setLoading(true);
    const result = await getRecordingsAction();
    if (result.success) {
      setRecordings(result.recordings);
    }
    setLoading(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId) setOpenMenuId(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openMenuId]);

  const handleDeleteVideo = async (id: string) => {
    if (confirm("Are you sure you want to delete this video?")) {
      const result = await deleteRecordingAction(id);
      if (result.success) {
        await loadRecordings();
      } else {
        alert("Failed to delete video");
      }
    }
  };

  const handleRenameVideo = (id: string, currentTitle: string) => {
    const newTitle = prompt("Enter new video title:", currentTitle);
    if (newTitle && newTitle !== currentTitle) {
      // TODO: Implement rename functionality
      alert("Rename functionality coming soon!");
    }
  };

  const handleDuplicateVideo = (id: string) => {
    // TODO: Implement duplicate functionality
    alert("Duplicate functionality coming soon!");
  };

  const handleVideoHover = (
    videoId: string,
    videoUrl: string | null = null,
  ) => {
    setHoveredVideo(videoId);
    if (videoUrl && videoRefs.current[videoId]) {
      const video = videoRefs.current[videoId];
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {
          // Ignore autoplay errors
        });
      }
    }
  };

  const handleVideoLeave = (videoId: string) => {
    setHoveredVideo(null);
    if (videoRefs.current[videoId]) {
      const video = videoRefs.current[videoId];
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    }
  };

  const handleVideoClick = (recording: Recording) => {
    // Navigate directly to editor route
    router.push(`/editor/${recording.id}`);
  };

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
    if (diffHours < 24)
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  };

  // Get video URL from R2 (only for preview - not critical)
  const getVideoUrl = (videoKey: string) => {
    const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    if (!publicUrl) {
      // Se não tiver URL pública configurada, retornar null
      // O preview não funcionará mas o editor ainda abrirá com URLs assinadas
      return null;
    }
    return `${publicUrl}/${videoKey}`;
  };

  // Map recordings to display format
  const displayVideos = recordings.map((rec) => ({
    id: rec.id,
    title: rec.title,
    duration: formatDuration(rec.duration),
    videoUrl: getVideoUrl(rec.videoKey),
    edited: getRelativeTime(rec.createdAt),
    recording: rec,
  }));

  // Filter videos by search query
  const filteredVideos = displayVideos.filter((video) =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const tools = [
    {
      name: "Auto Cut",
      description: "1-click video clean-up",
      icon: "✂️",
      color: "bg-purple-50",
    },
    {
      name: "Studio Voice",
      description: "AI-enhanced audio",
      icon: "🎙️",
      color: "bg-blue-50",
    },
    {
      name: "Auto Layouts",
      description: "AI-powered shot selec...",
      icon: "📐",
      color: "bg-indigo-50",
    },
    {
      name: "Zoom",
      description: "Zoom and track your c...",
      icon: "🔍",
      color: "bg-cyan-50",
    },
  ];

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Video className="w-6 h-6 text-white" />
          </div>
          <span className="font-semibold text-lg">Rafael's workspace</span>
        </div>

        <Link
          href="/record"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 mb-3 transition-colors"
        >
          <div className="w-5 h-5 border-2 border-white rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          Record
        </Link>

        <button className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 mb-8 transition-colors">
          <Upload className="w-5 h-5" />
          Upload
        </button>

        <nav className="flex-1">
          <Link
            href="#"
            className="flex items-center justify-between px-3 py-2 text-indigo-600 bg-indigo-50 rounded-lg mb-1 font-medium"
          >
            <div className="flex items-center gap-3">
              <Play className="w-5 h-5" />
              <span>My videos</span>
            </div>
            <span className="text-sm bg-indigo-100 px-2 py-0.5 rounded">
              {recordings.length}
            </span>
          </Link>

          <div className="mt-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
              Playlists
            </h3>
            <Link
              href="#"
              className="flex items-center justify-between px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg mb-1"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🚀</span>
                <span>Getting started</span>
              </div>
              <span className="text-sm text-gray-400">2</span>
            </Link>
            <Link
              href="#"
              className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              <span className="text-lg">🗑️</span>
              <span>Trash</span>
            </Link>
          </div>
        </nav>

        <div className="border-t border-gray-200 pt-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <p className="font-semibold text-sm text-gray-800 mb-1">
              Free trial ends in 1 day
            </p>
            <p className="text-xs text-gray-600 mb-3">
              Upgrade to keep recording videos
            </p>
            <button className="w-full bg-green-400 hover:bg-green-500 text-gray-900 py-2 px-4 rounded-lg text-sm font-semibold transition-colors">
              Upgrade now
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Search Bar */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Tools Section */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {tools.map((tool) => (
                <button
                  key={tool.name}
                  className={`${tool.color} border border-gray-200 rounded-xl p-5 text-left hover:shadow-md transition-all group`}
                >
                  <div className="text-3xl mb-3">{tool.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-sm text-gray-500">{tool.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* My Videos Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-gray-900">My videos</h2>
              <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-sm font-medium">
                {filteredVideos.length}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading videos...</p>
                </div>
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchQuery ? "No videos found" : "No videos yet"}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery
                    ? "Try a different search term"
                    : "Start recording your first video!"}
                </p>
                {!searchQuery && (
                  <Link
                    href="/record"
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    <div className="w-5 h-5 border-2 border-white rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    Record Now
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map((video) => (
                  <div
                    key={video.id}
                    className="group cursor-pointer relative"
                    onMouseEnter={() =>
                      handleVideoHover(video.id, video.videoUrl)
                    }
                    onMouseLeave={() => handleVideoLeave(video.id)}
                    onClick={() => handleVideoClick(video.recording)}
                  >
                    <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden mb-3 border border-gray-200">
                      {/* Thumbnail image */}
                      {video.recording.thumbnailUrl &&
                        hoveredVideo !== video.id && (
                          <img
                            src={video.recording.thumbnailUrl}
                            alt={video.title}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )}
                      {/* Video element for hover preview */}
                      {video.videoUrl && (
                        <video
                          ref={(el) => {
                            if (el) videoRefs.current[video.id] = el;
                          }}
                          src={video.videoUrl}
                          className="absolute inset-0 w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                          style={{
                            display:
                              hoveredVideo === video.id ? "block" : "none",
                          }}
                        />
                      )}
                      {/* Video icon placeholder (only if no thumbnail) */}
                      {!video.recording.thumbnailUrl &&
                        hoveredVideo !== video.id && (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-16 h-16 text-gray-300" />
                          </div>
                        )}
                      {/* Duration badge */}
                      <div className="absolute bottom-3 left-3 bg-black/75 text-white text-xs font-semibold px-2 py-1 rounded">
                        {video.duration}
                      </div>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                    </div>

                    {/* Hover buttons - MOVIDOS PARA FORA DO CONTAINER COM OVERFLOW */}
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          alert("Add to playlist functionality coming soon!");
                        }}
                        className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-colors"
                        title="Add to playlist"
                      >
                        <Plus size={18} />
                      </button>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(
                              openMenuId === video.id ? null : video.id,
                            );
                          }}
                          className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-colors"
                          title="More options"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {/* Dropdown menu */}
                        {openMenuId === video.id && (
                          <div
                            className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                alert(
                                  "Manage playlists functionality coming soon!",
                                );
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                            >
                              <ListPlus size={16} />
                              Manage playlists
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                handleDuplicateVideo(video.id);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                            >
                              <Copy size={16} />
                              Duplicate
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                handleRenameVideo(video.id, video.title);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                            >
                              <Edit2 size={16} />
                              Rename
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                handleDeleteVideo(video.id);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Edited {video.edited}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Help Button */}
      <button className="fixed bottom-6 right-6 w-12 h-12 bg-white border-2 border-gray-300 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center text-gray-600 hover:text-indigo-600 font-semibold text-lg">
        ?
      </button>
    </div>
  );
}
