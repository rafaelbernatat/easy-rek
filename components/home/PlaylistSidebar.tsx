"use client";

import React, { useState, useEffect } from "react";
import { List, Plus, Loader2, Trash2, MoreVertical, X } from "lucide-react";

interface Playlist {
  id: string;
  name: string;
  videoCount: number;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface PlaylistSidebarProps {
  selectedPlaylistId: string | null;
  onPlaylistSelect: (playlistId: string | null) => void;
  onCreatePlaylist: () => void;
  onDeletePlaylist: (playlistId: string) => void;
  refreshPlaylists?: () => void;
}

export default function PlaylistSidebar({
  selectedPlaylistId,
  onPlaylistSelect,
  onCreatePlaylist,
  onDeletePlaylist,
  refreshPlaylists,
}: PlaylistSidebarProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [playlistThumbnails, setPlaylistThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/playlists");
      const result = await response.json();

      if (result.success) {
        setPlaylists(result.playlists);
        
        // Fetch thumbnails for each playlist
        const thumbnails: Record<string, string> = {};
        for (const playlist of result.playlists) {
          if (playlist.videoCount > 0) {
            try {
              const itemsResponse = await fetch(`/api/playlists/${playlist.id}/items`);
              const itemsResult = await itemsResponse.json();
              if (itemsResult.success && itemsResult.items.length > 0) {
                // Use the thumbnail of the first video
                thumbnails[playlist.id] = itemsResult.items[0].recording.thumbnailUrl || '';
              }
            } catch (error) {
              console.error(`Error fetching thumbnail for playlist ${playlist.id}:`, error);
            }
          }
        }
        setPlaylistThumbnails(thumbnails);
      }
    } catch (error) {
      console.error("Error fetching playlists:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (confirm("Are you sure you want to delete this playlist?")) {
      try {
        const response = await fetch(`/api/playlists/${playlistId}`, {
          method: "DELETE",
        });

        const result = await response.json();

        if (result.success) {
          if (selectedPlaylistId === playlistId) {
            onPlaylistSelect(null);
          }
          await fetchPlaylists();
          onDeletePlaylist(playlistId);
          refreshPlaylists?.();
        } else {
          alert(result.error || "Failed to delete playlist");
        }
      } catch (error) {
        console.error("Error deleting playlist:", error);
        alert("Failed to delete playlist");
      }
    }
    setOpenMenuId(null);
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between px-3 mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Playlists
        </h3>
        <button
          onClick={onCreatePlaylist}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Create new playlist"
        >
          <Plus className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      ) : playlists.length === 0 ? (
        <div className="px-3 py-4 text-center">
          <List className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-500">No playlists yet</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {playlists.map((playlist) => (
            <div key={playlist.id} className="relative group">
              <div
                role="button"
                tabIndex={0}
                onClick={() => onPlaylistSelect(playlist.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPlaylistSelect(playlist.id);
                  }
                }}
                aria-pressed={selectedPlaylistId === playlist.id}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  selectedPlaylistId === playlist.id
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {playlistThumbnails[playlist.id] ? (
                    <img
                      src={playlistThumbnails[playlist.id]}
                      alt={playlist.name}
                      className="w-4 h-4 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <List className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="truncate text-sm">{playlist.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                    {playlist.videoCount}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === playlist.id ? null : playlist.id);
                    }}
                    className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Dropdown menu */}
              {openMenuId === playlist.id && (
                <div
                  className="absolute top-full left-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleDeletePlaylist(playlist.id)}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
