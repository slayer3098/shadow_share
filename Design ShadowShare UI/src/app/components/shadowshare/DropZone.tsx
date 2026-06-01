import { useCallback, useState } from 'react';
import { CloudUpload, X, File, Folder } from 'lucide-react';
import { FileTypeIcon } from './FileTypeIcon';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '../ui/dialog';

interface DropZoneProps {
  onFileSelect: (files: File[]) => void;
  files: File[];
  disabled?: boolean;
  theme: 'dark' | 'light';
}

export function DropZone({ onFileSelect, files, disabled, theme }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openPicker = useCallback((directory: boolean) => {
    if (disabled) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;

    if (directory) {
      (input as HTMLInputElement & { webkitdirectory?: boolean }).webkitdirectory = true;
    }

    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const selectedFiles = Array.from(target.files ?? []);
      const totalSize = selectedFiles.reduce((sum, item) => sum + item.size, 0);
      if (selectedFiles.length > 0 && totalSize <= 100 * 1024 * 1024) {
        onFileSelect(selectedFiles);
      }
    };

    input.click();
  }, [disabled, onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);

    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const totalSize = droppedFiles.reduce((sum, item) => sum + item.size, 0);
    if (droppedFiles.length > 0 && totalSize <= 100 * 1024 * 1024) {
      onFileSelect(droppedFiles);
    }
  }, [onFileSelect, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragActive(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragActive(false);
  }, []);

  const handleClick = () => {
    if (disabled || files.length > 0) return;
    setDialogOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileTypeLabel = (file: File) => {
    const mime = file.type.toLowerCase();
    const name = file.name.toLowerCase();

    if (mime.startsWith('image/')) return 'Image';
    if (mime.startsWith('video/')) return 'Video';
    if (mime.startsWith('audio/')) return 'Audio';

    if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'PDF document';
    if (mime === 'application/msword' || name.endsWith('.doc')) return 'Word document';
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) return 'Word document';
    if (name.endsWith('.ppt') || name.endsWith('.pptx')) return 'PowerPoint file';
    if (name.endsWith('.xls') || name.endsWith('.xlsx')) return 'Excel spreadsheet';
    if (mime === 'application/zip' || name.endsWith('.zip')) return 'ZIP archive';
    if (mime === 'application/x-rar-compressed' || name.endsWith('.rar')) return 'RAR archive';
    if (mime === 'application/x-7z-compressed' || name.endsWith('.7z')) return '7Z archive';

    if (mime.startsWith('text/')) return 'Text file';
    if (mime === 'application/json' || name.endsWith('.json')) return 'JSON file';

    const extension = name.includes('.') ? name.split('.').pop() : '';
    if (extension) return `${extension.toUpperCase()} file`;
    return 'File';
  };

  const selectedTypeSummary = Array.from(new Set(files.map(getFileTypeLabel)));
  const visibleTypeSummary = selectedTypeSummary.slice(0, 3);
  const hiddenTypeCount = Math.max(0, selectedTypeSummary.length - visibleTypeSummary.length);

  const totalBytes = files.reduce((sum, item) => sum + item.size, 0);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          className="relative w-full rounded-xl flex flex-col items-center justify-center transition-all duration-200"
          style={{
            minHeight: '180px',
            cursor: files.length > 0 ? 'default' : 'pointer',
            border: files.length > 0
              ? '2px solid var(--success)'
              : isDragActive
              ? '2px solid var(--brand-accent)'
              : '2px dashed var(--border-subtle)',
            backgroundColor: files.length > 0
              ? 'rgba(39, 213, 133, 0.05)'
              : isDragActive
              ? 'rgba(124, 110, 250, 0.08)'
              : theme === 'dark'
              ? 'rgba(28, 32, 48, 0.5)'
              : 'rgba(255, 255, 255, 0.8)',
            boxShadow: isDragActive ? '0 0 0 2px rgba(124, 110, 250, 0.3)' : 'none'
          }}
        >
          {files.length > 0 ? (
            <>
              <FileTypeIcon mimeType={files[0].type} size={40} />
              <div className="mt-3 font-medium text-center px-4" style={{
                fontSize: '14px',
                color: 'var(--text-primary)',
                maxWidth: '240px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {files.length === 1 ? files[0].name : `${files.length} items selected`}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 px-4">
                {files.length === 1 ? (
                  <div className="px-2 py-0.5 rounded text-xs" style={{
                    backgroundColor: 'rgba(124, 110, 250, 0.15)',
                    color: 'var(--text-primary)',
                    fontSize: '12px'
                  }}>
                    {getFileTypeLabel(files[0])}
                  </div>
                ) : (
                  visibleTypeSummary.map((type) => (
                    <div key={type} className="px-2 py-0.5 rounded text-xs" style={{
                      backgroundColor: 'rgba(124, 110, 250, 0.15)',
                      color: 'var(--text-primary)',
                      fontSize: '12px'
                    }}>
                      {type}
                    </div>
                  ))
                )}
                {hiddenTypeCount > 0 && (
                  <div className="px-2 py-0.5 rounded text-xs" style={{
                    backgroundColor: 'var(--elevated)',
                    color: 'var(--text-secondary)',
                    fontSize: '12px'
                  }}>
                    +{hiddenTypeCount} more
                  </div>
                )}
              </div>
              <div className="mt-1 px-2 py-0.5 rounded text-xs" style={{
                backgroundColor: 'var(--elevated)',
                color: 'var(--text-secondary)',
                fontSize: '12px'
              }}>
                {formatFileSize(totalBytes)}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFileSelect([]);
                }}
                className="absolute top-3 right-3 p-1 rounded hover:bg-black/20 transition-colors cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={18} className="hover:text-(--danger)" />
              </button>
            </>
          ) : (
            <>
              <CloudUpload
                size={32}
                style={{
                  color: isDragActive ? 'var(--brand-accent)' : 'var(--text-muted)',
                  transform: isDragActive ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 200ms'
                }}
              />
              <div className="mt-3" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {isDragActive ? 'Release to upload' : 'Click to choose files or a folder'}
              </div>
              {!isDragActive && (
                <>
                  <div className="mt-1" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    or drag and drop files or folders here
                  </div>
                  <div className="mt-3 px-2 py-0.5 rounded" style={{
                    backgroundColor: 'var(--elevated)',
                    color: 'var(--text-muted)',
                    fontSize: '12px'
                  }}>
                    Up to 100MB
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[420px]" style={{
        backgroundColor: theme === 'dark' ? 'rgba(18, 21, 31, 0.98)' : 'var(--surface)',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'var(--border-subtle)',
        boxShadow: theme === 'dark' ? '0 32px 80px rgba(0, 0, 0, 0.6)' : '0 32px 80px rgba(15, 23, 42, 0.12)'
      }}>
        <div>
          <DialogTitle style={{ color: 'var(--text-primary)' }}>Select what to upload</DialogTitle>
          <DialogDescription className="mt-1" style={{ color: 'var(--text-muted)' }}>
            Choose whether to upload individual files or an entire folder.
          </DialogDescription>
        </div>
        <div className="grid gap-4 mt-4">
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDialogOpen(false);
              openPicker(false);
            }}
            className="flex items-center gap-4 rounded-xl border p-4 text-left transition-all active:scale-[0.98]"
            style={{ 
              borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'var(--border-subtle)',
              backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(124, 110, 250, 0.04)',
              color: 'var(--text-primary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(124, 110, 250, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(124, 110, 250, 0.04)';
            }}
          >
            <div className="flex bg-(--brand-accent)/20 text-(--brand-accent) h-10 w-10 shrink-0 items-center justify-center rounded-lg">
              <File size={20} />
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Files</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>PDFs, Word docs, photos, videos, zip archives</div>
            </div>
          </button>
          
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDialogOpen(false);
              openPicker(true);
            }}
            className="flex items-center gap-4 rounded-xl border p-4 text-left transition-all active:scale-[0.98]"
            style={{ 
              borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'var(--border-subtle)',
              backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(124, 110, 250, 0.04)',
              color: 'var(--text-primary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(124, 110, 250, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(124, 110, 250, 0.04)';
            }}
          >
            <div className="flex bg-(--brand-accent)/20 text-(--brand-accent) h-10 w-10 shrink-0 items-center justify-center rounded-lg">
              <Folder size={20} />
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Folder</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Upload a whole folder with its contents</div>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
