import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface RenameDialogProps {
  open: boolean;
  currentName: string;
  currentPath: string;
  onClose: () => void;
  onRename: (newName: string) => void;
}

export const RenameDialog = ({
  open,
  currentName,
  currentPath,
  onClose,
  onRename,
}: RenameDialogProps) => {
  const [newName, setNewName] = useState(currentName);

  useEffect(() => {
    setNewName(currentName);
  }, [currentName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newName !== currentName) {
      onRename(newName.trim());
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename File</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filename">File Name</Label>
              <Input
                id="filename"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new file name"
                autoFocus
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Path: {currentPath.split('/').slice(0, -1).join('/') || '/'}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!newName.trim() || newName === currentName}>
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
