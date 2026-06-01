import { FileText, Image, Video, Archive, FileCode, Music, File } from 'lucide-react';

const fileTypeMap: Record<string, { icon: typeof File; color: string }> = {
  // Images
  'image/jpeg': { icon: Image, color: '#3B82F6' },
  'image/png': { icon: Image, color: '#3B82F6' },
  'image/gif': { icon: Image, color: '#3B82F6' },
  'image/svg+xml': { icon: Image, color: '#3B82F6' },
  'image/webp': { icon: Image, color: '#3B82F6' },

  // Documents
  'application/pdf': { icon: FileText, color: '#EF5350' },
  'application/msword': { icon: FileText, color: '#9B8FFB' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, color: '#9B8FFB' },
  'text/plain': { icon: FileText, color: '#8B92A8' },

  // Archives
  'application/zip': { icon: Archive, color: '#F5A623' },
  'application/x-rar-compressed': { icon: Archive, color: '#F5A623' },
  'application/x-7z-compressed': { icon: Archive, color: '#F5A623' },

  // Code
  'text/javascript': { icon: FileCode, color: '#27D585' },
  'text/html': { icon: FileCode, color: '#27D585' },
  'text/css': { icon: FileCode, color: '#27D585' },
  'application/json': { icon: FileCode, color: '#27D585' },

  // Video
  'video/mp4': { icon: Video, color: '#27D585' },
  'video/quicktime': { icon: Video, color: '#27D585' },

  // Audio
  'audio/mpeg': { icon: Music, color: '#9B8FFB' },
  'audio/wav': { icon: Music, color: '#9B8FFB' },
};

export function FileTypeIcon({
  mimeType,
  size = 40,
  className = ""
}: {
  mimeType?: string;
  size?: number;
  className?: string;
}) {
  const type = mimeType ? fileTypeMap[mimeType] : null;
  const IconComponent = type?.icon || File;
  const color = type?.color || '#8B92A8';

  return (
    <IconComponent
      size={size}
      style={{ color }}
      className={className}
      strokeWidth={1.5}
    />
  );
}
