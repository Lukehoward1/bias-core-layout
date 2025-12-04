import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

interface NewStrategyModalProps {
  onCreateStrategy: (strategy: {
    name: string;
    entryRules: string;
    exitRules: string;
    stopLoss: string;
    takeProfit: string;
    riskReward: string;
    positionSize: string;
  }) => void;
}

export function NewStrategyModal({ onCreateStrategy }: NewStrategyModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [entryRules, setEntryRules] = useState('');
  const [exitRules, setExitRules] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [riskReward, setRiskReward] = useState('');
  const [positionSize, setPositionSize] = useState('');

  const handleCreate = () => {
    onCreateStrategy({
      name: name || 'Untitled Strategy',
      entryRules,
      exitRules,
      stopLoss,
      takeProfit,
      riskReward,
      positionSize,
    });
    setOpen(false);
    // Reset form
    setName('');
    setEntryRules('');
    setExitRules('');
    setStopLoss('');
    setTakeProfit('');
    setRiskReward('');
    setPositionSize('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Plus className="h-4 w-4" />
          New Strategy
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create New Strategy</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Define your strategy rules and risk parameters. Logic will be enabled in future updates.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="strategy-name" className="text-foreground">Strategy Name</Label>
            <Input
              id="strategy-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., London Breakout Strategy"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-rules" className="text-foreground">Entry Rules</Label>
            <Textarea
              id="entry-rules"
              value={entryRules}
              onChange={(e) => setEntryRules(e.target.value)}
              placeholder="Describe your entry conditions..."
              className="bg-background border-border min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exit-rules" className="text-foreground">Exit Rules</Label>
            <Textarea
              id="exit-rules"
              value={exitRules}
              onChange={(e) => setExitRules(e.target.value)}
              placeholder="Describe your exit conditions..."
              className="bg-background border-border min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stop-loss" className="text-foreground">Stop Loss %</Label>
              <Input
                id="stop-loss"
                type="text"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="e.g., 1.5"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="take-profit" className="text-foreground">Take Profit %</Label>
              <Input
                id="take-profit"
                type="text"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="e.g., 3.0"
                className="bg-background border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="risk-reward" className="text-foreground">Risk:Reward Ratio</Label>
              <Input
                id="risk-reward"
                type="text"
                value={riskReward}
                onChange={(e) => setRiskReward(e.target.value)}
                placeholder="e.g., 1:2"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position-size" className="text-foreground">Position Size %</Label>
              <Input
                id="position-size"
                type="text"
                value={positionSize}
                onChange={(e) => setPositionSize(e.target.value)}
                placeholder="e.g., 2.0"
                className="bg-background border-border"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create Strategy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
