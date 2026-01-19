export interface SavedVideo {
  id: string;
  title: string;
  duration: string;
  createdAt: string;
  thumbnail?: string;
  compositeUrl?: string;
  cameraUrl?: string;
  screenUrl?: string;
}

const STORAGE_KEY = "easy-rek-videos";

export function saveVideo(
  video: Omit<SavedVideo, "id" | "createdAt">
): SavedVideo {
  if (typeof window === "undefined") return { ...video, id: "", createdAt: "" };

  const videos = getVideos();
  const newVideo: SavedVideo = {
    ...video,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };

  videos.unshift(newVideo);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));

  return newVideo;
}

export function getVideos(): SavedVideo[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function deleteVideo(id: string): void {
  if (typeof window === "undefined") return;

  const videos = getVideos().filter((v) => v.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
}

export function getRelativeTime(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}
