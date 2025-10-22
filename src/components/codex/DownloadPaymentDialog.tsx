import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { Crown, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface DownloadPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onProceed: (provider: 'stripe' | 'flutterwave') => void;
  amount: number;
  loading?: boolean;
}

export const DownloadPaymentDialog = ({ 
  open, 
  onClose, 
  onProceed, 
  amount,
  loading = false 
}: DownloadPaymentDialogProps) => {
  const [provider, setProvider] = useState<'stripe' | 'flutterwave'>('flutterwave');
  const { formatPrice, selectedCurrency } = useCurrency();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download Payment Required</DialogTitle>
          <DialogDescription>
            You've used your 3 free downloads. Choose how you'd like to proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 bg-accent rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Download Price</span>
              <span className="text-xl font-bold">{formatPrice(0.83)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              One-time payment for this download
            </p>
          </div>

          <div className="space-y-4">
            <Label>Payment Method</Label>
            <RadioGroup value={provider} onValueChange={(v) => setProvider(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="flutterwave" id="flutterwave" />
                <Label htmlFor="flutterwave" className="cursor-pointer">
                  Flutterwave (Mobile Money, Cards)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="stripe" id="stripe" />
                <Label htmlFor="stripe" className="cursor-pointer">
                  Stripe (Credit/Debit Cards)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3">
              <Crown className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-medium text-sm">Go Premium for Unlimited Downloads</p>
                <p className="text-xs text-muted-foreground">
                  Get unlimited downloads and all premium features
                </p>
                <Button variant="link" className="p-0 h-auto" asChild>
                  <Link to="/premium">View Plans</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={() => onProceed(provider)} 
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ${formatPrice(0.83)}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};