import { MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ScheduleObservationProps {
  observation?: string | null;
  className?: string;
}

export const ScheduleObservation = ({ observation, className }: ScheduleObservationProps) => {
  const text = observation?.trim();

  if (!text) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'h-7 gap-1.5 whitespace-nowrap rounded-full border-primary/30 bg-background px-2.5 text-xs font-medium text-primary no-underline hover:bg-primary/10 hover:text-primary',
            className,
          )}
          title="Clique para ver a observação"
          aria-label="Ver observação do agendamento"
        >
          <MessageSquareText className="h-3.5 w-3.5" />
          Obs
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-80 max-w-[calc(100vw-2rem)]">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquareText className="h-4 w-4 text-primary" />
            Observação do cliente
          </div>
          <p className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
            {text}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
