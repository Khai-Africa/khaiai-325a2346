import { 
  File, 
  Folder, 
  FolderOpen, 
  Trash2, 
  Download,
  Search,
  FileCode2,
  FileCode,
  FileJson,
  FileText,
  Image as ImageIcon,
  Palette,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useState, useMemo } from "react";

interface CodexFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  is_modified: boolean;
}

interface FileTreeProps {
  files: CodexFile[];
  selectedFile: CodexFile | null;
  onFileSelect: (file: CodexFile) => void;
  onFileDelete: (id: string) => void;
  onFileDownload?: (id: string) => void;
}

interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: TreeNode[];
  file?: CodexFile;
}

export const FileTree = ({ files, selectedFile, onFileSelect, onFileDelete, onFileDownload }: FileTreeProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [searchQuery, setSearchQuery] = useState("");

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const getFileIcon = (fileName: string, fileType: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    const iconMap: Record<string, any> = {
      'tsx': FileCode2,
      'ts': FileCode2,
      'jsx': FileCode,
      'js': FileCode,
      'html': FileCode,
      'css': Palette,
      'json': FileJson,
      'md': FileText,
      'txt': FileText,
      'png': ImageIcon,
      'jpg': ImageIcon,
      'jpeg': ImageIcon,
      'svg': ImageIcon,
    };
    
    const Icon = iconMap[ext || ''] || File;
    return <Icon className="w-4 h-4 text-muted-foreground" />;
  };

  const buildFileTree = (files: CodexFile[]): TreeNode[] => {
    const root: TreeNode = { name: 'root', type: 'folder', path: '/', children: [] };
    
    files.forEach(file => {
      const parts = file.file_path.split('/').filter(Boolean);
      let current = root;
      
      // Build folder structure
      for (let i = 0; i < parts.length - 1; i++) {
        const folderName = parts[i];
        let folder = current.children?.find(n => n.name === folderName && n.type === 'folder');
        
        if (!folder) {
          folder = { 
            name: folderName, 
            type: 'folder', 
            path: parts.slice(0, i + 1).join('/'), 
            children: [] 
          };
          current.children?.push(folder);
        }
        
        current = folder;
      }
      
      // Add file
      current.children?.push({
        name: file.file_name,
        type: 'file',
        path: file.file_path,
        file: file
      });
    });
    
    return root.children || [];
  };

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    
    const query = searchQuery.toLowerCase();
    return files.filter(file => 
      file.file_name.toLowerCase().includes(query) ||
      file.file_path.toLowerCase().includes(query)
    );
  }, [files, searchQuery]);

  const fileTree = useMemo(() => buildFileTree(filteredFiles), [filteredFiles]);

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    if (node.type === 'folder') {
      const isExpanded = expandedFolders.has(node.path);
      
      return (
        <div key={node.path}>
          <div
            className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => toggleFolder(node.path)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-primary" />
            ) : (
              <Folder className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">{node.name}</span>
          </div>
          
          {isExpanded && node.children && (
            <div>
              {node.children.map(child => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // File node
    const file = node.file!;
    return (
      <ContextMenu key={file.id}>
        <ContextMenuTrigger>
          <div
            className={`flex items-center justify-between gap-2 p-2 rounded-md cursor-pointer hover:bg-accent group ${
              selectedFile?.id === file.id ? 'bg-accent' : ''
            }`}
            style={{ paddingLeft: `${depth * 12 + 32}px` }}
            onClick={() => onFileSelect(file)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {getFileIcon(file.file_name, file.file_type)}
              <span className="text-sm truncate">
                {file.file_name}
                {file.is_modified && <span className="text-primary ml-1">*</span>}
              </span>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onFileSelect(file)}>
            <FileCode className="w-4 h-4 mr-2" />
            Open
          </ContextMenuItem>
          {onFileDownload && (
            <ContextMenuItem onClick={() => onFileDownload(file.id)}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem 
            onClick={() => onFileDelete(file.id)} 
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <div className="border border-border rounded-lg h-full bg-card flex flex-col">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <h3 className="font-semibold flex-1">Files</h3>
        <div className="relative flex-1 max-w-[150px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              No files yet. Upload files to get started.
            </p>
          ) : filteredFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              No files match your search.
            </p>
          ) : (
            fileTree.map(node => renderTreeNode(node))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};