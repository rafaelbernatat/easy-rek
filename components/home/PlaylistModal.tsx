"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, List, Check, Loader2, Trash2 } from "lucide-react";

interface Playlist {
  id: string;
  name: string;
  videoCount?: number;
  createdAt: string;
  updatedAt: string;
}

type PlaylistModalMode = "add" | "create";

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: PlaylistModalMode;
  recordingId?: string;
  currentlySelectedPlaylistId?: string | null;
  onAddSuccess?: () => void;
  onCreateSuccess?: () => void;
}

export default function PlaylistModal({
  isOpen,
  onClose,
  mode,
  recordingId,
  currentlySelectedPlaylistId,
  onAddSuccess,
  onCreateSuccess,
}: PlaylistModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [addingToPlaylist, setAddingToPlaylist] = useState<string | null>(null);
  const [playlistsWithRecording, setPlaylistsWithRecording] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchPlaylists();
      if (mode === "add" && recordingId) {
        fetchPlaylistsWithRecording();
      }
    }
  }, [isOpen, mode, recordingId]);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/playlists");
      const result = await response.json();

      if (result.success) {
        setPlaylists(result.playlists);
      }
    } catch (error) {
      console.error("Error fetching playlists:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylistsWithRecording = async () => {
    if (!recordingId) return;

    try {
      const response = await fetch(`/api/playlists/for-recording?recordingId=${recordingId}`);
      const result = await response.json();

      if (result.success) {
        const playlistIds = new Set<string>(result.playlists.map((p: Playlist) => p.id));
        setPlaylistsWithRecording(playlistIds);
      }
    } catch (error) {
      console.error("Error fetching playlists for recording:", error);
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPlaylistName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch("/api/playlists/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newPlaylistName }),
      });

      const result = await response.json();

      if (result.success) {
        setNewPlaylistName("");
        setShowCreateForm(false);
        await fetchPlaylists();
        onCreateSuccess?.();
      } else {
        alert(result.error || "Failed to create playlist");
      }
    } catch (error) {
      console.error("Error creating playlist:", error);
      alert("Failed to create playlist");
    } finally {
      setCreating(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    setAddingToPlaylist(playlistId);
    try {
      const response = await fetch("/api/playlists/add-item", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlistId,
          recordingId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSelectedPlaylistId(playlistId);
        setPlaylistsWithRecording((prev) => new Set(prev).add(playlistId));
        // Trigger refresh if this is the currently viewed playlist
        if (currentlySelectedPlaylistId === playlistId) {
          onAddSuccess?.();
        }
        setTimeout(() => {
          handleClose();
        }, 500);
      } else {
        alert(result.error || "Failed to add to playlist");
      }
    } catch (error) {
      console.error("Error adding to playlist:", error);
      alert("Failed to add to playlist");
    } finally {
      setAddingToPlaylist(null);
    }
  };

  const handleRemoveFromPlaylist = async (playlistId: string) => {
    if (!recordingId) return;

    setAddingToPlaylist(playlistId);
    try {
      const response = await fetch(`/api/playlists/${playlistId}/items/${recordingId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        setPlaylistsWithRecording((prev) => {
          const newSet = new Set(prev);
          newSet.delete(playlistId);
          return newSet;
        });
        // Trigger refresh if this is the currently viewed playlist
        if (currentlySelectedPlaylistId === playlistId) {
          onAddSuccess?.();
        }
      } else {
        alert(result.error || "Failed to remove from playlist");
      }
    } catch (error) {
      console.error("Error removing from playlist:", error);
      alert("Failed to remove from playlist");
    } finally {
      setAddingToPlaylist(null);
    }
  };

  const handleClose = () => {
    setPlaylists([]);
    setNewPlaylistName("");
    setShowCreateForm(false);
    setSelectedPlaylistId(null);
    setAddingToPlaylist(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === "create" ? "Create Playlist" : "Add to Playlist"}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {mode === "create" ? (
            <form onSubmit={handleCreatePlaylist}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Playlist name"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={creating || !newPlaylistName.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <List className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                No playlists yet
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Create your first playlist to organize your videos
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Create Playlist
              </button>
            </div>
          ) : (
            <>
              {/* Create New Playlist Button */}
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors mb-4"
                >
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Plus className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="font-medium text-gray-700">Create new playlist</span>
                </button>
              )}

              {/* Create Playlist Form */}
              {showCreateForm && (
                <form onSubmit={handleCreatePlaylist} className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="Playlist name"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={creating || !newPlaylistName.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        "Create"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewPlaylistName("");
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Existing Playlists */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500 mb-2">
                  {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}
                </p>
                {playlists.map((playlist) => {
                  const isInPlaylist = playlistsWithRecording.has(playlist.id);
                  const isLoading = addingToPlaylist === playlist.id;

                  return (
                    <button
                      key={playlist.id}
                      onClick={() => {
                        if (isInPlaylist) {
                          handleRemoveFromPlaylist(playlist.id);
                        } else {
                          handleAddToPlaylist(playlist.id);
                        }
                      }}
                      disabled={isLoading}
                      className={`w-full flex items-center justify-between p-4 border rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isInPlaylist
                          ? "border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isInPlaylist ? "bg-indigo-100" : "bg-gray-100"
                        }`}>
                          <List className={`w-5 h-5 ${
                            isInPlaylist ? "text-indigo-600" : "text-gray-500"
                          }`} />
                        </div>
                        <span className={`font-medium ${
                          isInPlaylist ? "text-indigo-900" : "text-gray-900"
                        }`}>{playlist.name}</span>
                      </div>
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                      ) : isInPlaylist ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-indigo-600 font-medium">Added</span>
                          <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-indigo-600" />
                          </div>
                        </div>
                      ) : (
                        <Plus className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
