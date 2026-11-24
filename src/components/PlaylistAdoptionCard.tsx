import { BarChart3 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type PlaylistFilter = "Mesclada" | "100% Natal";

interface PlaylistAdoptionCardProps {
  mescladaCount: number;
  natalCount: number;
  totalClients: number;
  mescladaPercentage: number;
  natalPercentage: number;
  activeFilter?: PlaylistFilter | null;
  onSelect?: (filter: PlaylistFilter) => void;
}

interface AdoptionBarProps {
  label: string;
  count: number;
  total: number;
  percentage: number;
  color: string;
  isActive: boolean;
  onSelect: () => void;
}

const AdoptionBar = ({ label, count, total, percentage, color, isActive, onSelect }: AdoptionBarProps) => (
  <div
    role="button"
    tabIndex={0}
    aria-pressed={isActive}
    title={`Filtrar agendamentos com playlist ${label}`}
    onClick={onSelect}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect();
      }
    }}
    className={`cursor-pointer rounded-lg border p-4 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
      isActive
        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
        : "border-border/50 bg-muted/20 hover:border-primary/40 hover:bg-muted/40"
    }`}
  >
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="text-2xl font-bold text-foreground">{percentage}%</span>
    </div>
    <div className="mt-3 h-7 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={[{ name: label, value: percentage }]}
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
        >
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis type="category" dataKey="name" hide />
          <Bar
            dataKey="value"
            fill={color}
            background={{ fill: "hsl(var(--muted))" }}
            radius={[0, 6, 6, 0]}
            barSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <p className="mt-2 text-xs text-muted-foreground">
      {count} de {total} {total === 1 ? 'cliente' : 'clientes'}
    </p>
  </div>
);

export const PlaylistAdoptionCard = ({
  mescladaCount,
  natalCount,
  totalClients,
  mescladaPercentage,
  natalPercentage,
  activeFilter = null,
  onSelect,
}: PlaylistAdoptionCardProps) => {
  return (
    <Card className="mb-8 shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          Adoção de Playlists
        </CardTitle>
        <CardDescription>
          Distribuição dos clientes pelo tipo do agendamento mais recente. Clique em uma barra para filtrar os agendamentos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalClients > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AdoptionBar
              label="Mesclada"
              count={mescladaCount}
              total={totalClients}
              percentage={mescladaPercentage}
              color="#f59e0b"
              isActive={activeFilter === "Mesclada"}
              onSelect={() => onSelect?.("Mesclada")}
            />
            <AdoptionBar
              label="100% Natal"
              count={natalCount}
              total={totalClients}
              percentage={natalPercentage}
              color="#16a34a"
              isActive={activeFilter === "100% Natal"}
              onSelect={() => onSelect?.("100% Natal")}
            />
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum cliente com playlist Mesclada ou 100% Natal.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
