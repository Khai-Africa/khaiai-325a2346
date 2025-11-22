import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageLightboxProps {
  imageUrl: string;
  imageName: string;
  onClose: () => void;
}

export const ImageLightbox = ({ imageUrl, imageName, onClose }: ImageLightboxProps) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = imageName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden">
        <div className="relative w-full h-full bg-background/95">
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <img 
            src={imageUrl} 
            alt={imageName}
            className="w-full h-full object-contain p-8"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
