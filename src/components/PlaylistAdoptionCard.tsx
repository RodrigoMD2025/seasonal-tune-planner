import { BarChart3 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlaylistAdoptionCardProps {
  mescladaCount: number;
  natalCount: number;
  totalClients: number;
  mescladaPercentage: number;
  natalPercentage: number;
}

interface AdoptionBarProps {
  label: string;
  count: number;
  total: number;
  percentage: number;
  color: string;
}

const AdoptionBar = ({ label, count, total, percentage, color }: AdoptionBarProps) => (
  <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
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
}: PlaylistAdoptionCardProps) => {
  return (
    <Card className="mb-8 shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          Adoção de Playlists
        </CardTitle>
        <CardDescription>
          Distribuição dos clientes pelo tipo do agendamento mais recente.
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
            />
            <AdoptionBar
              label="100% Natal"
              count={natalCount}
              total={totalClients}
              percentage={natalPercentage}
              color="#16a34a"
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
