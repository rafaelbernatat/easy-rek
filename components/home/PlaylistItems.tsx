"use client";

import React, { useState, useEffect, useRef } from "react";
import { Video, GripVertical, Trash2, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Recording {
  id: string;
  userId: string;
  title: string;
  videoKey: string;
  thumbnailUrl?: string;
  duration: number;
  size: number;
  createdAt: string;
  updatedAt?: string;
}

interface PlaylistItem {
  itemId: string;
  playlistId: string;
  recordingId: string;
  order: number;
  recording: Recording;
}

interface PlaylistItemsProps {
  playlistId: string;
  onClose: () => void;
  onItemsChanged?: () => void;
  refreshTrigger?: number;
}

export default function PlaylistItems({
  playlistId,
  onClose,
  onItemsChanged,
  refreshTrigger,
}: PlaylistItemsProps) {
  const router = useRouter();
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [playlistId, refreshTrigger]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/playlists/${playlistId}/items`);
      const result = await response.json();

      if (result.success) {
        setItems(result.items);
      }
    } catch (error) {
      console.error("Error fetching playlist items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    if (draggedItem !== itemId) {
      setDragOverItem(itemId);
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = async (e: React.DragEvent, targetItemId: string) => {
    e.preventDefault();
    setDragOverItem(null);

    if (!draggedItem || draggedItem === targetItemId) return;

    const newItems = [...items];
    const draggedIndex = newItems.findIndex((item) => item.itemId === draggedItem);
    const targetIndex = newItems.findIndex((item) => item.itemId === targetItemId);

    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    setItems(newItems);
    setDraggedItem(null);

    // Save new order
    await saveOrder(newItems);
  };

  const saveOrder = async (newItems: PlaylistItem[]) => {
    setSaving(true);
    try {
      const itemIds = newItems.map((item) => item.itemId);
      const response = await fetch(`/api/playlists/${playlistId}/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemIds }),
      });

      const result = await response.json();

      if (!result.success) {
        alert(result.error || "Failed to reorder items");
        // Revert on error
        await fetchItems();
      } else {
        onItemsChanged?.();
      }
    } catch (error) {
      console.error("Error saving order:", error);
      alert("Failed to reorder items");
      await fetchItems();
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async (itemId: string, recordingId: string) => {
    if (confirm("Remove this video from playlist?")) {
      try {
        const response = await fetch(`/api/playlists/${playlistId}/items/${recordingId}`, {
          method: "DELETE",
        });

        const result = await response.json();

        if (result.success) {
          await fetchItems();
          onItemsChanged?.();
        } else {
          alert(result.error || "Failed to remove item");
        }
      } catch (error) {
        console.error("Error removing item:", error);
        alert("Failed to remove item");
      }
    }
  };

  const handleVideoClick = (recordingId: string) => {
    router.push(`/editor/${recordingId}`);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading playlist...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
        <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Playlist is empty
        </h3>
        <p className="text-gray-600 mb-6">
          Add videos to this playlist to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {saving && (
        <div className="flex items-center justify-center py-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Saving order...
        </div>
      )}
      {items.map((item) => (
        <div
          key={item.itemId}
          draggable
          onDragStart={() => handleDragStart(item.itemId)}
          onDragOver={(e) => handleDragOver(e, item.itemId)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, item.itemId)}
          className={`group flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl cursor-pointer transition-all ${
            dragOverItem === item.itemId
              ? "border-indigo-500 bg-indigo-50"
              : "hover:border-indigo-300 hover:shadow-md"
          } ${draggedItem === item.itemId ? "opacity-50" : ""}`}
        >
          {/* Drag handle */}
          <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
            <GripVertical className="w-5 h-5" />
          </div>

          {/* Thumbnail */}
          <div
            onClick={() => handleVideoClick(item.recordingId)}
            className="relative w-24 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0"
          >
            {item.recording.thumbnailUrl ? (
              <img
                src={item.recording.thumbnailUrl}
                alt={item.recording.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="w-6 h-6 text-gray-300" />
              </div>
            )}
            <div className="absolute bottom-1 left-1 bg-black/75 text-white text-xs font-semibold px-1.5 py-0.5 rounded">
              {formatDuration(item.recording.duration)}
            </div>
          </div>

          {/* Title */}
          <div
            onClick={() => handleVideoClick(item.recordingId)}
            className="flex-1 min-w-0"
          >
            <h3 className="font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
              {item.recording.title}
            </h3>
          </div>

          {/* Remove button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveItem(item.itemId, item.recordingId);
            }}
            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            title="Remove from playlist"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
