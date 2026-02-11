import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Bounty tiers with tournament buy-in constraints
// A $250 tournament has bounties up to $50
// Tiers: $0.25, $0.50, $1, $2, $5, $10, $25, $50
export const BOUNTY_TIERS = [0.25, 0.50, 1, 2, 5, 10, 25, 50] as const;
export type BountyTier = typeof BOUNTY_TIERS[number];

// Tournament buy-in mapping (determines valid bounty range)
const TOURNAMENT_BUYINS: Record<BountyTier, number> = {
  0.25: 1.25,
  0.50: 2.50,
  1: 5,
  2: 10,
  5: 25,
  10: 50,
  25: 125,
  50: 250,
};

// Get valid bounty range for a given tournament buyin
export function getValidBountyRange(heroBounty: BountyTier): BountyTier[] {
  const buyIn = TOURNAMENT_BUYINS[heroBounty];
  // Opponents in the same tournament can't have bounties above the hero's tier
  // and bounties below ~1/5 of hero's bounty are unrealistic 
  // (they'd have had to lose most of their starting bounty value)
  const minBounty = BOUNTY_TIERS[0];
  return BOUNTY_TIERS.filter(b => b >= minBounty && b <= heroBounty * 4 && TOURNAMENT_BUYINS[b] <= buyIn * 2);
}

// Generate random opponent bounty based on hero's tier
export function generateOpponentBounty(heroBounty: BountyTier): number {
  const validRange = getValidBountyRange(heroBounty);
  if (validRange.length === 0) return heroBounty;
  return validRange[Math.floor(Math.random() * validRange.length)];
}

interface BountyConfigProps {
  selectedBounty: BountyTier;
  onBountyChange: (bounty: BountyTier) => void;
}

export function BountyConfig({ selectedBounty, onBountyChange }: BountyConfigProps) {
  return (
    <Card className="border-rank-first/30 bg-rank-first/5">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="h-5 w-5 text-rank-first" />
          <h2 className="text-heading-xs">Bounty do Torneio</h2>
        </div>
        <p className="text-body-xs text-muted-foreground mb-4">
          Selecione o valor base da recompensa. Isso define o buy-in do torneio e os bounties dos oponentes.
        </p>
        <div className="flex flex-wrap gap-2">
          {BOUNTY_TIERS.map(tier => (
            <Button
              key={tier}
              variant={selectedBounty === tier ? 'default' : 'outline'}
              size="sm"
              onClick={() => onBountyChange(tier)}
              className={cn(
                'min-w-[4rem]',
                selectedBounty === tier && 'bg-rank-first text-primary-foreground hover:bg-rank-first/90'
              )}
            >
              ${tier}
            </Button>
          ))}
        </div>
        <div className="mt-3 text-body-xs text-muted-foreground">
          Buy-in estimado: <span className="font-semibold text-foreground">${TOURNAMENT_BUYINS[selectedBounty]}</span>
        </div>
      </CardContent>
    </Card>
  );
}
